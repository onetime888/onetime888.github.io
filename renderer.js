const { ipcRenderer } = require('electron');
const moment = require('moment');

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchResults = document.getElementById('search-results');
const myShowsList = document.getElementById('myshows-list');
const calendarContainer = document.getElementById('calendar');

// Global variable for calendar instance
let calendarInstance = null;

// Dynamically load FullCalendar after DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
  // Dynamically import FullCalendar modules
  const { Calendar } = await import('./node_modules/@fullcalendar/core/main.js');
  const dayGridPlugin = await import('./node_modules/@fullcalendar/daygrid/main.js');
  
  window.FullCalendar = { Calendar, dayGridPlugin };
});

// Tab navigation
document.querySelectorAll('.tab-btn').forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs and content sections
    document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    // Add active class to clicked tab
    tab.classList.add('active');
    
    // Show corresponding content section
    const tabId = tab.id.replace('-tab', '-section');
    document.getElementById(tabId).classList.add('active');
    
    // Refresh content if needed
    if (tabId === 'myshows-section') {
      loadMyShows();
    } else if (tabId === 'calendar-section') {
      loadCalendar();
    }
  });
});

// Search functionality
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    performSearch();
  }
});

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  
  try {
    const results = await ipcRenderer.invoke('search-shows', query);
    displaySearchResults(results);
  } catch (error) {
    console.error('Error searching shows:', error);
    alert('Error al buscar series. Por favor, inténtalo de nuevo.');
  }
}

function displaySearchResults(shows) {
  searchResults.innerHTML = '';
  
  if (!shows || shows.length === 0) {
    searchResults.innerHTML = '<p>No se encontraron series.</p>';
    return;
  }
  
  shows.forEach(show => {
    const showCard = document.createElement('div');
    showCard.className = 'show-card';
    
    const posterUrl = show.poster_path 
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}` 
      : 'https://via.placeholder.com/300x450?text=Sin+imagen';
    
    showCard.innerHTML = `
      <img src="${posterUrl}" alt="${show.name}" class="show-poster" onerror="this.src='https://via.placeholder.com/300x450?text=Sin+imagen'">
      <div class="show-info">
        <h3>${show.name}</h3>
        <div class="show-overview">${show.overview || 'No disponible'}</div>
        <div class="show-date">${show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Desconocido'}</div>
        <div class="action-buttons">
          <button class="add-show-btn" data-show='${JSON.stringify(show)}'>Agregar</button>
        </div>
      </div>
    `;
    
    searchResults.appendChild(showCard);
  });
  
  // Add event listeners to the new buttons
  document.querySelectorAll('.add-show-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const showData = JSON.parse(e.target.getAttribute('data-show'));
      
      try {
        await ipcRenderer.invoke('add-show', showData);
        alert(`${showData.name} ha sido agregada a tu lista.`);
        
        // Reload my shows tab if it's currently active
        if (document.getElementById('myshows-section').classList.contains('active')) {
          loadMyShows();
        }
      } catch (error) {
        console.error('Error adding show:', error);
        alert('Error al agregar la serie. Por favor, inténtalo de nuevo.');
      }
    });
  });
}

// Load user's shows
async function loadMyShows() {
  try {
    const shows = await ipcRenderer.invoke('get-user-shows');
    displayMyShows(shows);
  } catch (error) {
    console.error('Error loading my shows:', error);
    myShowsList.innerHTML = '<p>Error al cargar tus series.</p>';
  }
}

function displayMyShows(shows) {
  myShowsList.innerHTML = '';
  
  if (!shows || shows.length === 0) {
    myShowsList.innerHTML = '<p>No tienes series agregadas aún.</p>';
    return;
  }
  
  shows.forEach(show => {
    const showCard = document.createElement('div');
    showCard.className = 'show-card';
    
    const posterUrl = show.poster_path 
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}` 
      : 'https://via.placeholder.com/300x450?text=Sin+imagen';
    
    showCard.innerHTML = `
      <img src="${posterUrl}" alt="${show.name}" class="show-poster" onerror="this.src='https://via.placeholder.com/300x450?text=Sin+imagen'">
      <div class="show-info">
        <h3>${show.name}</h3>
        <div class="show-overview">${show.overview || 'No disponible'}</div>
        <div class="show-date">${show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'Desconocido'}</div>
        <div class="action-buttons">
          <button class="remove-show-btn" data-tmdb-id="${show.tmdb_id}">Eliminar</button>
        </div>
      </div>
    `;
    
    myShowsList.appendChild(showCard);
  });
  
  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-show-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const tmdbId = parseInt(e.target.getAttribute('data-tmdb-id'));
      
      if (confirm('¿Estás seguro de que deseas eliminar esta serie de tu lista?')) {
        try {
          await ipcRenderer.invoke('remove-show', tmdbId);
          
          // Reload my shows
          loadMyShows();
        } catch (error) {
          console.error('Error removing show:', error);
          alert('Error al eliminar la serie. Por favor, inténtalo de nuevo.');
        }
      }
    });
  });
}

// Load calendar with upcoming episodes
async function loadCalendar() {
  try {
    const episodes = await ipcRenderer.invoke('get-upcoming-episodes', 60); // Next 60 days
    
    // Wait for FullCalendar to be loaded
    while (!window.FullCalendar) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const { Calendar, dayGridPlugin } = window.FullCalendar;
    
    // Destroy existing calendar instance if it exists
    if (calendarInstance) {
      calendarInstance.destroy();
    }
    
    // Prepare events for FullCalendar
    const calendarEvents = episodes.map(episode => {
      return {
        title: `${episode.show_name} - S${episode.season_number}E${episode.episode_number}`,
        date: episode.air_date,
        extendedProps: {
          episodeId: episode.id,
          showName: episode.show_name,
          episodeName: episode.name,
          overview: episode.overview,
          watched: episode.watched
        },
        backgroundColor: episode.watched ? '#2ecc71' : '#3498db'
      };
    });
    
    // Initialize FullCalendar
    calendarInstance = new Calendar(calendarContainer, {
      plugins: [dayGridPlugin.default],
      initialView: 'dayGridMonth',
      events: calendarEvents,
      locale: 'es',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek,dayGridDay'
      },
      eventClick: function(info) {
        const episodeId = info.event.extendedProps.episodeId;
        const watched = info.event.extendedProps.watched;
        
        // Toggle watched status when clicking on an event
        ipcRenderer.invoke('mark-episode-watched', episodeId, !watched).then(() => {
          // Reload calendar to reflect changes
          loadCalendar();
        }).catch(error => {
          console.error('Error updating episode watched status:', error);
          alert('Error al actualizar el estado del episodio. Por favor, inténtalo de nuevo.');
        });
      },
      eventContent: function(info) {
        const watchedIndicator = info.event.extendedProps.watched ? ' ✓' : '';
        return {
          html: `<div class="calendar-event">${info.event.title}${watchedIndicator}</div>`
        };
      }
    });
    
    calendarInstance.render();
  } catch (error) {
    console.error('Error loading calendar:', error);
    calendarContainer.innerHTML = '<p>Error al cargar el calendario de episodios.</p>';
  }
}

// Initial load for my shows tab if it's active
if (document.getElementById('myshows-section').classList.contains('active')) {
  loadMyShows();
}