const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');
const moment = require('moment');
const notifier = require('node-notifier');

// Initialize database
const db = new sqlite3.Database(path.join(__dirname, 'tv_calendar.db'));

// Create tables if they don't exist
db.serialize(() => {
  // Table for user's TV shows
  db.run(`CREATE TABLE IF NOT EXISTS tv_shows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER UNIQUE,
    name TEXT,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    first_air_date TEXT,
    status TEXT,
    next_episode_to_air TEXT
  )`);

  // Table for episodes
  db.run(`CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    show_tmdb_id INTEGER,
    season_number INTEGER,
    episode_number INTEGER,
    name TEXT,
    overview TEXT,
    air_date TEXT,
    episode_type TEXT,
    watched BOOLEAN DEFAULT 0,
    FOREIGN KEY (show_tmdb_id) REFERENCES tv_shows (tmdb_id)
  )`);
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for API calls
ipcMain.handle('search-shows', async (event, query) => {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/tv?api_key=${process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY_HERE'}&query=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  return data.results;
});

// Get show details
ipcMain.handle('get-show-details', async (event, showId) => {
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${showId}?api_key=${process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY_HERE'}&append_to_response=seasons`
  );
  const data = await response.json();
  return data;
});

// Get show episodes
ipcMain.handle('get-show-episodes', async (event, showId) => {
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${showId}/aggregate_credits?api_key=${process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY_HERE'}`
  );
  const data = await response.json();
  return data;
});

// Add show to user's list
ipcMain.handle('add-show', async (event, showData) => {
  return new Promise((resolve, reject) => {
    const { id, name, overview, poster_path, backdrop_path, first_air_date, status, next_episode_to_air } = showData;
    
    db.run(
      `INSERT OR REPLACE INTO tv_shows (tmdb_id, name, overview, poster_path, backdrop_path, first_air_date, status, next_episode_to_air) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, overview, poster_path, backdrop_path, first_air_date, status, next_episode_to_air],
      function(err) {
        if (err) {
          console.error('Error adding show:', err);
          reject(err);
        } else {
          resolve({ success: true, id: this.lastID });
        }
      }
    );
  });
});

// Remove show from user's list
ipcMain.handle('remove-show', async (event, tmdbId) => {
  return new Promise((resolve, reject) => {
    db.run(
      `DELETE FROM tv_shows WHERE tmdb_id = ?`,
      [tmdbId],
      function(err) {
        if (err) {
          console.error('Error removing show:', err);
          reject(err);
        } else {
          resolve({ success: true, changes: this.changes });
        }
      }
    );
  });
});

// Get user's shows
ipcMain.handle('get-user-shows', async (event) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM tv_shows ORDER BY name`,
      [],
      (err, rows) => {
        if (err) {
          console.error('Error getting user shows:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
});

// Mark episode as watched
ipcMain.handle('mark-episode-watched', async (event, episodeId, watched) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE episodes SET watched = ? WHERE id = ?`,
      [watched ? 1 : 0, episodeId],
      function(err) {
        if (err) {
          console.error('Error updating episode watch status:', err);
          reject(err);
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

// Get upcoming episodes
ipcMain.handle('get-upcoming-episodes', async (event, days = 30) => {
  const futureDate = moment().add(days, 'days').format('YYYY-MM-DD');
  const currentDate = moment().format('YYYY-MM-DD');
  
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT e.*, s.name as show_name, s.poster_path as show_poster
      FROM episodes e
      JOIN tv_shows s ON e.show_tmdb_id = s.tmdb_id
      WHERE e.air_date BETWEEN ? AND ?
      ORDER BY e.air_date ASC
    `, [currentDate, futureDate], (err, rows) => {
      if (err) {
        console.error('Error getting upcoming episodes:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
});

// Check for upcoming episodes and send notifications
function checkForUpcomingEpisodes() {
  const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
  const today = moment().format('YYYY-MM-DD');
  
  db.all(`
    SELECT e.*, s.name as show_name
    FROM episodes e
    JOIN tv_shows s ON e.show_tmdb_id = s.tmdb_id
    WHERE e.air_date = ? AND e.watched = 0
  `, [tomorrow], (err, rows) => {
    if (err) {
      console.error('Error checking for upcoming episodes:', err);
    } else {
      rows.forEach(episode => {
        // Send system notification
        const options = {
          title: `Nuevo episodio mañana`,
          message: `${episode.show_name} - Temporada ${episode.season_number}, Episodio ${episode.episode_number}: ${episode.name}`,
          sound: true,
          wait: true
        };
        
        notifier.notify(options, (err, response) => {
          if (err) {
            console.error('Notification error:', err);
          }
        });
        
        // Also send Electron notification if possible
        if (Notification.isSupported()) {
          const notification = new Notification({
            title: options.title,
            body: options.message
          });
          notification.show();
        }
      });
    }
  });
}

// Set interval to check for upcoming episodes every hour
setInterval(checkForUpcomingEpisodes, 60 * 60 * 1000); // Every hour

// Also check immediately when app starts
setTimeout(checkForUpcomingEpisodes, 10000); // Check after 10 seconds to ensure everything is loaded