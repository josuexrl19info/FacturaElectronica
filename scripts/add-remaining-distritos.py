#!/usr/bin/env python3
"""
Script para agregar los distritos restantes de Costa Rica
"""

import json

# Cargar distritos existentes
with open('data/costa-rica/distritos.json', 'r', encoding='utf-8') as f:
    existing_distritos = json.load(f)

print(f"Distritos existentes: {len(existing_distritos)}")

# Obtener códigos existentes para evitar duplicados
existing_codes = {d['codigo'] for d in existing_distritos}

# Distritos adicionales de Alajuela (202-216)
alajuela_additional = [
    # San Ramón (202) - 14 distritos
    {"codigo": 20201, "nombre": "San Ramón", "cantonCodigo": 202, "area": 1.28},
    {"codigo": 20202, "nombre": "Santiago", "cantonCodigo": 202, "area": 61.06},
    {"codigo": 20203, "nombre": "San Juan", "cantonCodigo": 202, "area": 5.12},
    {"codigo": 20204, "nombre": "Piedades Norte", "cantonCodigo": 202, "area": 47.68},
    {"codigo": 20205, "nombre": "Piedades Sur", "cantonCodigo": 202, "area": 115.63},
    {"codigo": 20206, "nombre": "San Rafael", "cantonCodigo": 202, "area": 30.69},
    {"codigo": 20207, "nombre": "San Isidro", "cantonCodigo": 202, "area": 8.69},
    {"codigo": 20208, "nombre": "Ángeles", "cantonCodigo": 202, "area": 84.91},
    {"codigo": 20209, "nombre": "Alfaro", "cantonCodigo": 202, "area": 17.84},
    {"codigo": 20210, "nombre": "Volio", "cantonCodigo": 202, "area": 20.67},
    {"codigo": 20211, "nombre": "Concepción", "cantonCodigo": 202, "area": 9.51},
    {"codigo": 20212, "nombre": "Zapotal", "cantonCodigo": 202, "area": 67.13},
    {"codigo": 20213, "nombre": "Peñas Blancas", "cantonCodigo": 202, "area": 246.8},
    {"codigo": 20214, "nombre": "San Lorenzo", "cantonCodigo": 202, "area": 304.74},
    
    # Grecia (203) - 8 distritos
    {"codigo": 20301, "nombre": "Grecia", "cantonCodigo": 203, "area": 7.57},
    {"codigo": 20302, "nombre": "San Isidro", "cantonCodigo": 203, "area": 16.83},
    {"codigo": 20303, "nombre": "San José", "cantonCodigo": 203, "area": 12.41},
    {"codigo": 20304, "nombre": "San Roque", "cantonCodigo": 203, "area": 26.95},
    {"codigo": 20305, "nombre": "Tacares", "cantonCodigo": 203, "area": 24.9},
    {"codigo": 20307, "nombre": "Puente de Piedra", "cantonCodigo": 203, "area": 23.03},
    {"codigo": 20308, "nombre": "Bolivar", "cantonCodigo": 203, "area": 30.78},
    
    # San Mateo (204) - 4 distritos
    {"codigo": 20401, "nombre": "San Mateo", "cantonCodigo": 204, "area": 64.89},
    {"codigo": 20402, "nombre": "Desmonte", "cantonCodigo": 204, "area": 20.22},
    {"codigo": 20403, "nombre": "Jesús María", "cantonCodigo": 204, "area": 18.66},
    {"codigo": 20404, "nombre": "Labrador", "cantonCodigo": 204, "area": 21.26},
    
    # Atenas (205) - 8 distritos
    {"codigo": 20501, "nombre": "Atenas", "cantonCodigo": 205, "area": 9.76},
    {"codigo": 20502, "nombre": "Jesús", "cantonCodigo": 205, "area": 18.11},
    {"codigo": 20503, "nombre": "Mercedes", "cantonCodigo": 205, "area": 7.84},
    {"codigo": 20504, "nombre": "San Isidro", "cantonCodigo": 205, "area": 14.39},
    {"codigo": 20505, "nombre": "Concepción", "cantonCodigo": 205, "area": 21.91},
    {"codigo": 20506, "nombre": "San José", "cantonCodigo": 205, "area": 13.47},
    {"codigo": 20507, "nombre": "Santa Eulalia", "cantonCodigo": 205, "area": 14.56},
    {"codigo": 20508, "nombre": "Escobal", "cantonCodigo": 205, "area": 26.28},
    
    # Naranjo (206) - 8 distritos
    {"codigo": 20601, "nombre": "Naranjo", "cantonCodigo": 206, "area": 16.85},
    {"codigo": 20602, "nombre": "San Miguel", "cantonCodigo": 206, "area": 15.59},
    {"codigo": 20603, "nombre": "San José", "cantonCodigo": 206, "area": 20.9},
    {"codigo": 20604, "nombre": "Cirrí Sur", "cantonCodigo": 206, "area": 32.11},
    {"codigo": 20605, "nombre": "San Jerónimo", "cantonCodigo": 206, "area": 9.05},
    {"codigo": 20606, "nombre": "San Juan", "cantonCodigo": 206, "area": 7.15},
    {"codigo": 20607, "nombre": "El Rosario", "cantonCodigo": 206, "area": 17.15},
    {"codigo": 20608, "nombre": "Palmitos", "cantonCodigo": 206, "area": 8.23},
    
    # Palmares (207) - 7 distritos
    {"codigo": 20701, "nombre": "Palmares", "cantonCodigo": 207, "area": 1.19},
    {"codigo": 20702, "nombre": "Zaragoza", "cantonCodigo": 207, "area": 8.43},
    {"codigo": 20703, "nombre": "Buenos Aires", "cantonCodigo": 207, "area": 6.84},
    {"codigo": 20704, "nombre": "Santiago", "cantonCodigo": 207, "area": 7.96},
    {"codigo": 20705, "nombre": "Candelaria", "cantonCodigo": 207, "area": 4.72},
    {"codigo": 20706, "nombre": "Esquipulas", "cantonCodigo": 207, "area": 5.4},
    {"codigo": 20707, "nombre": "La Granja", "cantonCodigo": 207, "area": 4.39},
    
    # Poás (208) - 5 distritos
    {"codigo": 20801, "nombre": "San Pedro", "cantonCodigo": 208, "area": 13.58},
    {"codigo": 20802, "nombre": "San Juan", "cantonCodigo": 208, "area": 16.38},
    {"codigo": 20803, "nombre": "San Rafael", "cantonCodigo": 208, "area": 14.18},
    {"codigo": 20804, "nombre": "Carrillos", "cantonCodigo": 208, "area": 10.13},
    {"codigo": 20805, "nombre": "Sabana Redonda", "cantonCodigo": 208, "area": 20.21},
    
    # Orotina (209) - 5 distritos
    {"codigo": 20901, "nombre": "Orotina", "cantonCodigo": 209, "area": 21.56},
    {"codigo": 20902, "nombre": "El Mastate", "cantonCodigo": 209, "area": 9.5},
    {"codigo": 20903, "nombre": "Hacienda Vieja", "cantonCodigo": 209, "area": 16.91},
    {"codigo": 20904, "nombre": "Coyolar", "cantonCodigo": 209, "area": 36.48},
    {"codigo": 20905, "nombre": "La Ceiba", "cantonCodigo": 209, "area": 60.66},
    
    # San Carlos (210) - 13 distritos
    {"codigo": 21001, "nombre": "Quesada", "cantonCodigo": 210, "area": 143.48},
    {"codigo": 21002, "nombre": "Florencia", "cantonCodigo": 210, "area": 199.66},
    {"codigo": 21003, "nombre": "Buenavista", "cantonCodigo": 210, "area": 25.97},
    {"codigo": 21004, "nombre": "Aguas Zarcas", "cantonCodigo": 210, "area": 185.7},
    {"codigo": 21005, "nombre": "Venecia", "cantonCodigo": 210, "area": 132.53},
    {"codigo": 21006, "nombre": "Pital", "cantonCodigo": 210, "area": 379.27},
    {"codigo": 21007, "nombre": "La Fortuna", "cantonCodigo": 210, "area": 229.59},
    {"codigo": 21008, "nombre": "La Tigra", "cantonCodigo": 210, "area": 56.21},
    {"codigo": 21009, "nombre": "La Palmera", "cantonCodigo": 210, "area": 100.36},
    {"codigo": 21010, "nombre": "Venado", "cantonCodigo": 210, "area": 169.19},
    {"codigo": 21011, "nombre": "Cutris", "cantonCodigo": 210, "area": 849.19},
    {"codigo": 21012, "nombre": "Monterrey", "cantonCodigo": 210, "area": 220.59},
    {"codigo": 21013, "nombre": "Pocosol", "cantonCodigo": 210, "area": 660.59},
    
    # Zarcero (211) - 7 distritos
    {"codigo": 21101, "nombre": "Zarcero", "cantonCodigo": 211, "area": 11.83},
    {"codigo": 21102, "nombre": "Laguna", "cantonCodigo": 211, "area": 23.28},
    {"codigo": 21103, "nombre": "Tapesco", "cantonCodigo": 211, "area": 6.39},
    {"codigo": 21104, "nombre": "Guadalupe", "cantonCodigo": 211, "area": 22.58},
    {"codigo": 21105, "nombre": "Palmira", "cantonCodigo": 211, "area": 30.67},
    {"codigo": 21106, "nombre": "Zapote", "cantonCodigo": 211, "area": 44.76},
    {"codigo": 21107, "nombre": "Brisas", "cantonCodigo": 211, "area": 17.85},
    
    # Sarchí (212) - 5 distritos
    {"codigo": 21201, "nombre": "Sarchí Norte", "cantonCodigo": 212, "area": 21.14},
    {"codigo": 21202, "nombre": "Sarchí Sur", "cantonCodigo": 212, "area": 6.35},
    {"codigo": 21203, "nombre": "Toro Amarillo", "cantonCodigo": 212, "area": 91.13},
    {"codigo": 21204, "nombre": "San Pedro", "cantonCodigo": 212, "area": 10.87},
    {"codigo": 21205, "nombre": "Rodríguez", "cantonCodigo": 212, "area": 7.28},
    
    # Upala (213) - 8 distritos
    {"codigo": 21301, "nombre": "Upala", "cantonCodigo": 213, "area": 148.65},
    {"codigo": 21302, "nombre": "Aguas Claras", "cantonCodigo": 213, "area": 408.54},
    {"codigo": 21303, "nombre": "San José O Pizote", "cantonCodigo": 213, "area": 285.43},
    {"codigo": 21304, "nombre": "Bijagua", "cantonCodigo": 213, "area": 186.8},
    {"codigo": 21305, "nombre": "Delicias", "cantonCodigo": 213, "area": 98.52},
    {"codigo": 21306, "nombre": "Dos Ríos", "cantonCodigo": 213, "area": 218.67},
    {"codigo": 21307, "nombre": "Yolillal", "cantonCodigo": 213, "area": 139.62},
    {"codigo": 21308, "nombre": "Canalete", "cantonCodigo": 213, "area": 106.45},
    
    # Los Chiles (214) - 4 distritos
    {"codigo": 21401, "nombre": "Los Chiles", "cantonCodigo": 214, "area": 503.61},
    {"codigo": 21402, "nombre": "Caño Negro", "cantonCodigo": 214, "area": 301.27},
    {"codigo": 21403, "nombre": "El Amparo", "cantonCodigo": 214, "area": 312.89},
    {"codigo": 21404, "nombre": "San Jorge", "cantonCodigo": 214, "area": 214.95},
    
    # Guatuso (215) - 4 distritos
    {"codigo": 21501, "nombre": "San Rafael", "cantonCodigo": 215, "area": 303.99},
    {"codigo": 21502, "nombre": "Buenavista", "cantonCodigo": 215, "area": 150.86},
    {"codigo": 21503, "nombre": "Cote", "cantonCodigo": 215, "area": 183.58},
    {"codigo": 21504, "nombre": "Katira", "cantonCodigo": 215, "area": 114.4},
    
    # Río Cuarto (216) - 3 distritos
    {"codigo": 21601, "nombre": "Río Cuarto", "cantonCodigo": 216, "area": 97.62},
    {"codigo": 21602, "nombre": "Santa Rita", "cantonCodigo": 216, "area": 53.19},
    {"codigo": 21603, "nombre": "Santa Isabel", "cantonCodigo": 216, "area": 104.09}
]

# Agregar solo los que no existen
new_distritos = []
for distrito in alajuela_additional:
    if distrito['codigo'] not in existing_codes:
        new_distritos.append(distrito)
        existing_codes.add(distrito['codigo'])

print(f"Distritos nuevos a agregar: {len(new_distritos)}")

# Combinar con existentes
all_distritos = existing_distritos + new_distritos

# Guardar archivo actualizado
with open('data/costa-rica/distritos.json', 'w', encoding='utf-8') as f:
    json.dump(all_distritos, f, indent=2, ensure_ascii=False)

print(f"Total de distritos en el archivo: {len(all_distritos)}")
print(f"Distritos por provincia:")
print(f"  San José: {len([d for d in all_distritos if d['cantonCodigo'] < 200])}")
print(f"  Alajuela: {len([d for d in all_distritos if 200 <= d['cantonCodigo'] < 300])}")
print(f"  Otras: {len([d for d in all_distritos if d['cantonCodigo'] >= 300])}")
