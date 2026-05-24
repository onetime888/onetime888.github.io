import requests
from datetime import datetime, timezone, timedelta

def obtener_clima():
    """Obtiene datos de wttr.in para Lanús, Buenos Aires usando coordenadas"""
    try:
        # Coordenadas de Lanús, Buenos Aires: -34.7069, -58.3928
        url = "https://wttr.in/-34.7069,-58.3928?format=j1"
        respuesta = requests.get(url, timeout=5)
        respuesta.raise_for_status()
        datos = respuesta.json()
        
        # Extraer temperatura actual (en Celsius)
        temp_c = int(datos['current_condition'][0]['temp_C'])
        
        # Extraer descripción del clima
        descripcion = datos['current_condition'][0]['weatherDesc'][0]['value'].lower()
        
        # Detectar lluvia
        llueve = any(keyword in descripcion for keyword in ['rain', 'drizzle', 'snow', 'thunder', 'storm'])
        
        return temp_c, descripcion, llueve
    except Exception as e:
        print(f"Error al obtener el clima: {e}")
        return None, None, False

def es_de_dia():
    """Determina si es de día en Lanús, Buenos Aires (UTC-3)"""
    zona_lanus = timezone(timedelta(hours=-3))
    ahora = datetime.now(zona_lanus)
    hora = ahora.hour
    # Día entre 07:00 y 20:00
    return 7 <= hora <= 20, ahora.strftime("%H:%M")

def generar_outfit(temp, llueve, es_dia):
    """Genera el outfit basado en las reglas"""
    if temp is None:
        return [], []

    prendas = []
    accesorios = []

    # Reglas de temperatura
    if temp < 13:
        prendas = ["Campera abrigada", "Sweater", "Remera/Camisa", "Pantalón", "Zapatillas"]
    elif 13 <= temp <= 20:
        prendas = ["Campera liviana", "Remera/Camisa", "Pantalón", "Zapatillas"]
    else: # > 20
        prendas = ["Remera/Camisa", "Pantalón", "Zapatillas"]

    # Accesorios
    if llueve:
        accesorios.append("☔ ¡Lleva PARAGUAS! (Está lloviendo)")
    
    if es_dia and not llueve:
        accesorios.append("🧢 Lleva GORRA (Es de día y hay sol)")

    return prendas, accesorios

def main():
    print("🌤️  Obteniendo clima actual en Lanús...\n")
    
    temp, descripcion, llueve = obtener_clima()
    dia, hora_actual = es_de_dia()
    
    if temp is not None:
        print(f"✅ Temperatura: {temp}°C")
        print(f"☁️  Condición: {descripcion.capitalize()}")
        print(f"🕒 Hora en Lanús: {hora_actual} ({'Día' if dia else 'Noche'})")
        print("\n" + "="*40)
        print("👕 TU OUTFIT SUGERIDO:")
        print("="*40)
        
        prendas, accesorios = generar_outfit(temp, llueve, dia)
        
        for prenda in prendas:
            print(f"   • {prenda}")
        
        if accesorios:
            print("\n⚠️  ACCESORIOS:")
            for acc in accesorios:
                print(f"   {acc}")
        else:
            print("\n✨ Sin accesorios especiales hoy.")
            
        print("="*40)
        print("¡Tú puedes! Recuerda que lo importante es sentirte cómodo/a.")
    else:
        print("❌ No se pudo obtener el clima. Verifica tu conexión.")

if __name__ == "__main__":
    main()
