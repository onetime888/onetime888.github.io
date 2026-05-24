import random

def obtener_clima():
    """Simula la obtención de datos del clima preguntando al usuario."""
    print("\n--- Configuración del Clima ---")
    try:
        temp = float(input("¿Qué temperatura hace (en °C)? "))
    except ValueError:
        print("Por favor, ingresa un número válido para la temperatura.")
        return obtener_clima()

    es_de_dia = input("¿Es de día? (s/n): ").lower() == 's'
    
    condicion = input("¿Cómo está el cielo? (sol/nubes/lluvia): ").lower()
    while condicion not in ['sol', 'nubes', 'lluvia']:
        print("Opción no válida. Elige: sol, nubes o lluvia.")
        condicion = input("¿Cómo está el cielo? (sol/nubes/lluvia): ").lower()

    return {
        "temp": temp,
        "es_de_dia": es_de_dia,
        "condicion": condicion
    }

def generar_outfit(clima):
    """Genera el outfit basado en las reglas definidas."""
    temp = clima["temp"]
    condicion = clima["condicion"]
    es_de_dia = clima["es_de_dia"]

    # Inventario simulado (puedes agregar más prendas aquí)
    camperas_abrigadas = ["Campera de plumas", "Campera de lana", "Abrigo grueso"]
    camperas_livianas = ["Campera de jean", "Campera cortavientos", "Saco liviano"]
    sweaters = ["Sweater de cuello alto", "Cardigan", "Sweater de lana"]
    remeras_camisas = ["Remera básica", "Camisa de algodón", "Polera", "Camisa a cuadros"]
    pantalones = ["Jeans", "Pantalón de chándal", "Pantalón de vestir", "Chino"]
    calzados = ["Zapatillas deportivas", "Zapatillas urbanas", "Botines"]
    
    outfit = []
    accesorios = []

    # Reglas de Temperatura
    if temp < 13:
        # Menos de 13 grados: Campera abrigada, sweater, remera/camisa, pantalon, zapatillas
        outfit.append(f"Abrigo: {random.choice(camperas_abrigadas)}")
        outfit.append(f"Capa media: {random.choice(sweaters)}")
        outfit.append(f"Base: {random.choice(remeras_camisas)}")
        outfit.append(f"Pantalón: {random.choice(pantalones)}")
        outfit.append(f"Calzado: {random.choice(calzados)}")
        
    elif 13 <= temp <= 20:
        # Entre 13 y 20 grados: Campera liviana, remera/camisa, pantalon, zapatillas
        outfit.append(f"Abrigo: {random.choice(camperas_livianas)}")
        outfit.append(f"Base: {random.choice(remeras_camisas)}")
        outfit.append(f"Pantalón: {random.choice(pantalones)}")
        outfit.append(f"Calzado: {random.choice(calzados)}")
        
    else: # > 20 grados
        # Mas de 20 grados: Remera/camisa, pantalon, zapatillas
        outfit.append(f"Base: {random.choice(remeras_camisas)}")
        outfit.append(f"Pantalón: {random.choice(pantalones)}")
        outfit.append(f"Calzado: {random.choice(calzados)}")

    # Reglas de Accesorios
    if condicion == 'lluvia':
        accesorios.append("☔ ¡Importante! Lleva PARAGUAS")
    
    if es_de_dia and condicion == 'sol':
        accesorios.append("🧢 Lleva GORRA para el sol")

    return outfit, accesorios

def main():
    print("👋 ¡Hola! Soy tu asistente de outfits para días difíciles.")
    print("Vamos a decidir qué ponerte hoy basándonos en el clima.")
    
    while True:
        clima = obtener_clima()
        outfit, accesorios = generar_outfit(clima)

        print("\n--- Tu Outfit Sugerido ---")
        for prenda in outfit:
            print(f"👕 {prenda}")
        
        if accesorios:
            print("\n--- Accesorios ---")
            for acc in accesorios:
                print(f"✨ {acc}")
        
        continuar = input("\n¿Quieres probar con otro clima? (s/n): ").lower()
        if continuar != 's':
            print("¡Espero que tengas un gran día! Cuídate mucho.")
            break

if __name__ == "__main__":
    main()
