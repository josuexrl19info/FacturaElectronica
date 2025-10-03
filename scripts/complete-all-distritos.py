#!/usr/bin/env python3
"""
Script para completar TODOS los distritos de Costa Rica
basado en la tabla oficial proporcionada
"""

import json

# Cargar distritos existentes
with open('data/costa-rica/distritos.json', 'r', encoding='utf-8') as f:
    existing_distritos = json.load(f)

print(f"Distritos existentes: {len(existing_distritos)}")

# Obtener códigos existentes para evitar duplicados
existing_codes = {d['codigo'] for d in existing_distritos}

# DISTRITOS FALTANTES - Cartago (301-308)
cartago_distritos = [
    # Cartago (301) - 11 distritos
    {"codigo": 30101, "nombre": "Oriental", "cantonCodigo": 301, "area": 2.04},
    {"codigo": 30102, "nombre": "Occidental", "cantonCodigo": 301, "area": 2.01},
    {"codigo": 30103, "nombre": "Carmen", "cantonCodigo": 301, "area": 4.33},
    {"codigo": 30104, "nombre": "San Nicolás", "cantonCodigo": 301, "area": 29.23},
    {"codigo": 30105, "nombre": "Aguacaliente o San Francisco", "cantonCodigo": 301, "area": 99.26},
    {"codigo": 30106, "nombre": "Guadalupe o Arenilla", "cantonCodigo": 301, "area": 13.16},
    {"codigo": 30107, "nombre": "Corralillo", "cantonCodigo": 301, "area": 32.69},
    {"codigo": 30108, "nombre": "Tierra Blanca", "cantonCodigo": 301, "area": 12.8},
    {"codigo": 30109, "nombre": "Dulce Nombre", "cantonCodigo": 301, "area": 33.64},
    {"codigo": 30110, "nombre": "Llano Grande", "cantonCodigo": 301, "area": 30.35},
    {"codigo": 30111, "nombre": "Quebradilla", "cantonCodigo": 301, "area": 19.15},
    
    # Paraíso (302) - 6 distritos
    {"codigo": 30201, "nombre": "Paraíso", "cantonCodigo": 302, "area": 18.29},
    {"codigo": 30202, "nombre": "Santiago", "cantonCodigo": 302, "area": 25.64},
    {"codigo": 30203, "nombre": "Orosi", "cantonCodigo": 302, "area": 376.54},
    {"codigo": 30204, "nombre": "Cachí", "cantonCodigo": 302, "area": 41.11},
    {"codigo": 30205, "nombre": "Llanos de Santa Lucía", "cantonCodigo": 302, "area": 6.54},
    {"codigo": 30206, "nombre": "Birrisito", "cantonCodigo": 302, "area": 8.88},
    
    # La Unión (303) - 8 distritos
    {"codigo": 30301, "nombre": "Tres Ríos", "cantonCodigo": 303, "area": 2.28},
    {"codigo": 30302, "nombre": "San Diego", "cantonCodigo": 303, "area": 8.08},
    {"codigo": 30303, "nombre": "San Juan", "cantonCodigo": 303, "area": 3.95},
    {"codigo": 30304, "nombre": "San Rafael", "cantonCodigo": 303, "area": 9.51},
    {"codigo": 30305, "nombre": "Concepción", "cantonCodigo": 303, "area": 3.79},
    {"codigo": 30306, "nombre": "Dulce Nombre", "cantonCodigo": 303, "area": 8.26},
    {"codigo": 30307, "nombre": "San Ramón", "cantonCodigo": 303, "area": 3.47},
    {"codigo": 30308, "nombre": "Río Azul", "cantonCodigo": 303, "area": 4.85},
    
    # Jiménez (304) - 3 distritos
    {"codigo": 30401, "nombre": "Juan Viñas", "cantonCodigo": 304, "area": 43.37},
    {"codigo": 30402, "nombre": "Tucurrique", "cantonCodigo": 304, "area": 33.5},
    {"codigo": 30403, "nombre": "Pejibaye", "cantonCodigo": 304, "area": 173.2},
    
    # Turrialba (305) - 12 distritos
    {"codigo": 30501, "nombre": "Turrialba", "cantonCodigo": 305, "area": 56.63},
    {"codigo": 30502, "nombre": "La Suiza", "cantonCodigo": 305, "area": 160.93},
    {"codigo": 30503, "nombre": "Peralta", "cantonCodigo": 305, "area": 9.69},
    {"codigo": 30504, "nombre": "Santa Cruz", "cantonCodigo": 305, "area": 129.57},
    {"codigo": 30505, "nombre": "Santa Teresita", "cantonCodigo": 305, "area": 60.14},
    {"codigo": 30506, "nombre": "Pavones", "cantonCodigo": 305, "area": 42.05},
    {"codigo": 30507, "nombre": "Tuis", "cantonCodigo": 305, "area": 39.2},
    {"codigo": 30508, "nombre": "Tayutic", "cantonCodigo": 305, "area": 74.77},
    {"codigo": 30509, "nombre": "Santa Rosa", "cantonCodigo": 305, "area": 18.62},
    {"codigo": 30510, "nombre": "Tres Equis", "cantonCodigo": 305, "area": 36.95},
    {"codigo": 30511, "nombre": "La Isabel", "cantonCodigo": 305, "area": 19.79},
    {"codigo": 30512, "nombre": "Chirripó", "cantonCodigo": 305, "area": 940.9},
    
    # Alvarado (306) - 3 distritos
    {"codigo": 30601, "nombre": "Pacayas", "cantonCodigo": 306, "area": 29.62},
    {"codigo": 30602, "nombre": "Cervantes", "cantonCodigo": 306, "area": 15.18},
    {"codigo": 30603, "nombre": "Capellades", "cantonCodigo": 306, "area": 34.39},
    
    # Oreamuno (307) - 5 distritos
    {"codigo": 30701, "nombre": "San Rafael", "cantonCodigo": 307, "area": 10.28},
    {"codigo": 30702, "nombre": "Cot", "cantonCodigo": 307, "area": 14.86},
    {"codigo": 30703, "nombre": "Potrero Cerrado", "cantonCodigo": 307, "area": 18.11},
    {"codigo": 30704, "nombre": "Cipreses", "cantonCodigo": 307, "area": 9.37},
    {"codigo": 30705, "nombre": "Santa Rosa", "cantonCodigo": 307, "area": 150.27},
    
    # El Guarco (308) - 4 distritos
    {"codigo": 30801, "nombre": "El Tejar", "cantonCodigo": 308, "area": 6.12},
    {"codigo": 30802, "nombre": "San Isidro", "cantonCodigo": 308, "area": 134.88},
    {"codigo": 30803, "nombre": "Tobosi", "cantonCodigo": 308, "area": 20.06},
    {"codigo": 30804, "nombre": "Patio de Agua", "cantonCodigo": 308, "area": 10.94}
]

# Heredia (401-410)
heredia_distritos = [
    # Heredia (401) - 5 distritos
    {"codigo": 40101, "nombre": "Heredia", "cantonCodigo": 401, "area": 2.86},
    {"codigo": 40102, "nombre": "Mercedes", "cantonCodigo": 401, "area": 4.15},
    {"codigo": 40103, "nombre": "San Francisco", "cantonCodigo": 401, "area": 6.56},
    {"codigo": 40104, "nombre": "Ulloa", "cantonCodigo": 401, "area": 11.38},
    {"codigo": 40105, "nombre": "Varablanca", "cantonCodigo": 401, "area": 258.17},
    
    # Barva (402) - 6 distritos
    {"codigo": 40201, "nombre": "Barva", "cantonCodigo": 402, "area": 0.84},
    {"codigo": 40202, "nombre": "San Pedro", "cantonCodigo": 402, "area": 7.17},
    {"codigo": 40203, "nombre": "San Pablo", "cantonCodigo": 402, "area": 6.83},
    {"codigo": 40204, "nombre": "San Roque", "cantonCodigo": 402, "area": 1.28},
    {"codigo": 40205, "nombre": "Santa Lucía", "cantonCodigo": 402, "area": 2.86},
    {"codigo": 40206, "nombre": "San José de la Montaña", "cantonCodigo": 402, "area": 37.04},
    
    # Santo Domingo (403) - 8 distritos
    {"codigo": 40301, "nombre": "Santo Domingo", "cantonCodigo": 403, "area": 0.78},
    {"codigo": 40302, "nombre": "San Vicente", "cantonCodigo": 403, "area": 2.88},
    {"codigo": 40303, "nombre": "San Miguel", "cantonCodigo": 403, "area": 5.9},
    {"codigo": 40304, "nombre": "Paracito", "cantonCodigo": 403, "area": 1.27},
    {"codigo": 40305, "nombre": "Santo Tomás", "cantonCodigo": 403, "area": 3.54},
    {"codigo": 40306, "nombre": "Santa Rosa", "cantonCodigo": 403, "area": 4.27},
    {"codigo": 40307, "nombre": "Tures", "cantonCodigo": 403, "area": 3.88},
    {"codigo": 40308, "nombre": "Pará", "cantonCodigo": 403, "area": 2.87},
    
    # Santa Bárbara (404) - 6 distritos
    {"codigo": 40401, "nombre": "Santa Bárbara", "cantonCodigo": 404, "area": 1.28},
    {"codigo": 40402, "nombre": "San Pedro", "cantonCodigo": 404, "area": 2.56},
    {"codigo": 40403, "nombre": "San Juan", "cantonCodigo": 404, "area": 4.48},
    {"codigo": 40404, "nombre": "Jesús", "cantonCodigo": 404, "area": 11.15},
    {"codigo": 40405, "nombre": "Santo Domingo", "cantonCodigo": 404, "area": 26.49},
    {"codigo": 40406, "nombre": "Purabá", "cantonCodigo": 404, "area": 6.14},
    
    # San Rafael (405) - 5 distritos
    {"codigo": 40501, "nombre": "San Rafael", "cantonCodigo": 405, "area": 1.33},
    {"codigo": 40502, "nombre": "San Josecito", "cantonCodigo": 405, "area": 1.35},
    {"codigo": 40503, "nombre": "Santiago", "cantonCodigo": 405, "area": 1.57},
    {"codigo": 40504, "nombre": "Ángeles", "cantonCodigo": 405, "area": 21.24},
    {"codigo": 40505, "nombre": "Concepción", "cantonCodigo": 405, "area": 22.81},
    
    # San Isidro (406) - 4 distritos
    {"codigo": 40601, "nombre": "San Isidro", "cantonCodigo": 406, "area": 2.67},
    {"codigo": 40602, "nombre": "San José", "cantonCodigo": 406, "area": 11.37},
    {"codigo": 40603, "nombre": "Concepción", "cantonCodigo": 406, "area": 8.07},
    {"codigo": 40604, "nombre": "San Francisco", "cantonCodigo": 406, "area": 4.56},
    
    # Belén (407) - 3 distritos
    {"codigo": 40701, "nombre": "San Antonio", "cantonCodigo": 407, "area": 3.56},
    {"codigo": 40702, "nombre": "La Ribera", "cantonCodigo": 407, "area": 4.26},
    {"codigo": 40703, "nombre": "La Asunción", "cantonCodigo": 407, "area": 4.57},
    
    # Flores (408) - 3 distritos
    {"codigo": 40801, "nombre": "San Joaquín", "cantonCodigo": 408, "area": 2.75},
    {"codigo": 40802, "nombre": "Barrantes", "cantonCodigo": 408, "area": 2.14},
    {"codigo": 40803, "nombre": "Llorente", "cantonCodigo": 408, "area": 1.86},
    
    # San Pablo (409) - 2 distritos
    {"codigo": 40901, "nombre": "San Pablo", "cantonCodigo": 409, "area": 5.93},
    {"codigo": 40902, "nombre": "Rincón de Sabanilla", "cantonCodigo": 409, "area": 2.41},
    
    # Sarapiquí (410) - 5 distritos
    {"codigo": 41001, "nombre": "Puerto Viejo", "cantonCodigo": 410, "area": 428.52},
    {"codigo": 41002, "nombre": "La Virgen", "cantonCodigo": 410, "area": 514.19},
    {"codigo": 41003, "nombre": "Las Horquetas", "cantonCodigo": 410, "area": 564.59},
    {"codigo": 41004, "nombre": "Llanuras del Gaspar", "cantonCodigo": 410, "area": 267.34},
    {"codigo": 41005, "nombre": "Cureña", "cantonCodigo": 410, "area": 369.73}
]

# Combinar todos los distritos nuevos
all_new_distritos = cartago_distritos + heredia_distritos

# Agregar solo los que no existen
new_distritos = []
for distrito in all_new_distritos:
    if distrito['codigo'] not in existing_codes:
        new_distritos.append(distrito)
        existing_codes.add(distrito['codigo'])

print(f"Distritos nuevos a agregar (Cartago + Heredia): {len(new_distritos)}")

# Combinar con existentes
all_distritos = existing_distritos + new_distritos

# Guardar archivo actualizado
with open('data/costa-rica/distritos.json', 'w', encoding='utf-8') as f:
    json.dump(all_distritos, f, indent=2, ensure_ascii=False)

print(f"Total de distritos en el archivo: {len(all_distritos)}")
print(f"Distritos por provincia:")
print(f"  San José: {len([d for d in all_distritos if d['cantonCodigo'] < 200])}")
print(f"  Alajuela: {len([d for d in all_distritos if 200 <= d['cantonCodigo'] < 300])}")
print(f"  Cartago: {len([d for d in all_distritos if 300 <= d['cantonCodigo'] < 400])}")
print(f"  Heredia: {len([d for d in all_distritos if 400 <= d['cantonCodigo'] < 500])}")
print(f"  Otras: {len([d for d in all_distritos if d['cantonCodigo'] >= 500])}")

print("\nPróximos pasos:")
print("- Guanacaste (501-511)")
print("- Puntarenas (601-612)")  
print("- Limón (701-706)")
