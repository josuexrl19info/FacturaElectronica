#!/usr/bin/env python3
"""
Script para completar las provincias restantes: Guanacaste, Puntarenas y Limón
"""

import json

# Cargar distritos existentes
with open('data/costa-rica/distritos.json', 'r', encoding='utf-8') as f:
    existing_distritos = json.load(f)

print(f"Distritos existentes: {len(existing_distritos)}")

# Obtener códigos existentes para evitar duplicados
existing_codes = {d['codigo'] for d in existing_distritos}

# GUANACASTE (501-511)
guanacaste_distritos = [
    # Liberia (501) - 5 distritos
    {"codigo": 50101, "nombre": "Liberia", "cantonCodigo": 501, "area": 563.02},
    {"codigo": 50102, "nombre": "Cañas Dulces", "cantonCodigo": 501, "area": 243.41},
    {"codigo": 50103, "nombre": "Mayorga", "cantonCodigo": 501, "area": 227.51},
    {"codigo": 50104, "nombre": "Nacascolo", "cantonCodigo": 501, "area": 326.91},
    {"codigo": 50105, "nombre": "Curubandé", "cantonCodigo": 501, "area": 81.32},
    
    # Nicoya (502) - 7 distritos
    {"codigo": 50201, "nombre": "Nicoya", "cantonCodigo": 502, "area": 310.66},
    {"codigo": 50202, "nombre": "Mansión", "cantonCodigo": 502, "area": 212.15},
    {"codigo": 50203, "nombre": "San Antonio", "cantonCodigo": 502, "area": 339.5},
    {"codigo": 50204, "nombre": "Quebrada Honda", "cantonCodigo": 502, "area": 109.17},
    {"codigo": 50205, "nombre": "Sámara", "cantonCodigo": 502, "area": 109.36},
    {"codigo": 50206, "nombre": "Nosara", "cantonCodigo": 502, "area": 133.65},
    {"codigo": 50207, "nombre": "Belén de Nosarita", "cantonCodigo": 502, "area": 123.07},
    
    # Santa Cruz (503) - 9 distritos
    {"codigo": 50301, "nombre": "Santa Cruz", "cantonCodigo": 503, "area": 288.92},
    {"codigo": 50302, "nombre": "Bolsón", "cantonCodigo": 503, "area": 32.28},
    {"codigo": 50303, "nombre": "Veintisiete de Abril", "cantonCodigo": 503, "area": 303},
    {"codigo": 50304, "nombre": "Tempate", "cantonCodigo": 503, "area": 139.69},
    {"codigo": 50305, "nombre": "Cartagena", "cantonCodigo": 503, "area": 72.9},
    {"codigo": 50306, "nombre": "Cuajiniquil", "cantonCodigo": 503, "area": 218},
    {"codigo": 50307, "nombre": "Diriá", "cantonCodigo": 503, "area": 66.22},
    {"codigo": 50308, "nombre": "Cabo Velas", "cantonCodigo": 503, "area": 73.7},
    {"codigo": 50309, "nombre": "Tamarindo", "cantonCodigo": 503, "area": 126.09},
    
    # Bagaces (504) - 4 distritos
    {"codigo": 50401, "nombre": "Bagaces", "cantonCodigo": 504, "area": 889.07},
    {"codigo": 50402, "nombre": "La Fortuna", "cantonCodigo": 504, "area": 163.47},
    {"codigo": 50403, "nombre": "Mogote", "cantonCodigo": 504, "area": 181.77},
    {"codigo": 50404, "nombre": "Río Naranjo", "cantonCodigo": 504, "area": 43.62},
    
    # Carrillo (505) - 4 distritos
    {"codigo": 50501, "nombre": "Filadelfia", "cantonCodigo": 505, "area": 125.24},
    {"codigo": 50502, "nombre": "Palmira", "cantonCodigo": 505, "area": 31.46},
    {"codigo": 50503, "nombre": "Sardinal", "cantonCodigo": 505, "area": 260.17},
    {"codigo": 50504, "nombre": "Belén", "cantonCodigo": 505, "area": 182.14},
    
    # Cañas (506) - 5 distritos
    {"codigo": 50601, "nombre": "Cañas", "cantonCodigo": 506, "area": 193.09},
    {"codigo": 50602, "nombre": "Palmira", "cantonCodigo": 506, "area": 204.03},
    {"codigo": 50603, "nombre": "San Miguel", "cantonCodigo": 506, "area": 120.95},
    {"codigo": 50604, "nombre": "Bebedero", "cantonCodigo": 506, "area": 58.06},
    {"codigo": 50605, "nombre": "Porozal", "cantonCodigo": 506, "area": 110.91},
    
    # Abangares (507) - 4 distritos
    {"codigo": 50701, "nombre": "Las Juntas", "cantonCodigo": 507, "area": 228.71},
    {"codigo": 50702, "nombre": "Sierra", "cantonCodigo": 507, "area": 112},
    {"codigo": 50703, "nombre": "San Juan", "cantonCodigo": 507, "area": 107.47},
    {"codigo": 50704, "nombre": "Colorado", "cantonCodigo": 507, "area": 197.84},
    
    # Tilarán (508) - 8 distritos
    {"codigo": 50801, "nombre": "Tilarán", "cantonCodigo": 508, "area": 144.75},
    {"codigo": 50802, "nombre": "Quebrada Grande", "cantonCodigo": 508, "area": 34.45},
    {"codigo": 50803, "nombre": "Tronadora", "cantonCodigo": 508, "area": 139.93},
    {"codigo": 50804, "nombre": "Santa Rosa", "cantonCodigo": 508, "area": 71.06},
    {"codigo": 50805, "nombre": "Líbano", "cantonCodigo": 508, "area": 72.13},
    {"codigo": 50806, "nombre": "Tierras Morenas", "cantonCodigo": 508, "area": 83.32},
    {"codigo": 50807, "nombre": "Arenal", "cantonCodigo": 508, "area": 72.67},
    {"codigo": 50808, "nombre": "Cabeceras", "cantonCodigo": 508, "area": 50.93},
    
    # Nandayure (509) - 6 distritos
    {"codigo": 50901, "nombre": "Carmona", "cantonCodigo": 509, "area": 31.66},
    {"codigo": 50902, "nombre": "Santa Rita", "cantonCodigo": 509, "area": 51.38},
    {"codigo": 50903, "nombre": "Zapotal", "cantonCodigo": 509, "area": 105.08},
    {"codigo": 50904, "nombre": "San Pablo", "cantonCodigo": 509, "area": 78.08},
    {"codigo": 50905, "nombre": "Porvenir", "cantonCodigo": 509, "area": 40.15},
    {"codigo": 50906, "nombre": "Bejuco", "cantonCodigo": 509, "area": 261.78},
    
    # La Cruz (510) - 4 distritos
    {"codigo": 51001, "nombre": "La Cruz", "cantonCodigo": 510, "area": 344.39},
    {"codigo": 51002, "nombre": "Santa Cecilia", "cantonCodigo": 510, "area": 258.01},
    {"codigo": 51003, "nombre": "La Garita", "cantonCodigo": 510, "area": 273.39},
    {"codigo": 51004, "nombre": "Santa Elena", "cantonCodigo": 510, "area": 509.59},
    
    # Hojancha (511) - 5 distritos
    {"codigo": 51101, "nombre": "Hojancha", "cantonCodigo": 511, "area": 70.4},
    {"codigo": 51102, "nombre": "Monte Romo", "cantonCodigo": 511, "area": 75.27},
    {"codigo": 51103, "nombre": "Puerto Carrillo", "cantonCodigo": 511, "area": 76.87},
    {"codigo": 51104, "nombre": "Huacas", "cantonCodigo": 511, "area": 31.74},
    {"codigo": 51105, "nombre": "Matambú", "cantonCodigo": 511, "area": 8.71}
]

# PUNTARENAS (601-612)
puntarenas_distritos = [
    # Puntarenas (601) - 16 distritos
    {"codigo": 60101, "nombre": "Puntarenas", "cantonCodigo": 601, "area": 34.03},
    {"codigo": 60102, "nombre": "Pitahaya", "cantonCodigo": 601, "area": 109.55},
    {"codigo": 60103, "nombre": "Chomes", "cantonCodigo": 601, "area": 118.95},
    {"codigo": 60104, "nombre": "Lepanto", "cantonCodigo": 601, "area": 424.31},
    {"codigo": 60105, "nombre": "Paquera", "cantonCodigo": 601, "area": 335.63},
    {"codigo": 60106, "nombre": "Manzanillo", "cantonCodigo": 601, "area": 59.86},
    {"codigo": 60107, "nombre": "Guacimal", "cantonCodigo": 601, "area": 114.94},
    {"codigo": 60108, "nombre": "Barranca", "cantonCodigo": 601, "area": 36.21},
    {"codigo": 60110, "nombre": "Isla del Coco", "cantonCodigo": 601, "area": 23.52},
    {"codigo": 60111, "nombre": "Cóbano", "cantonCodigo": 601, "area": 319.27},
    {"codigo": 60112, "nombre": "Chacarita", "cantonCodigo": 601, "area": 4.92},
    {"codigo": 60113, "nombre": "Chira", "cantonCodigo": 601, "area": 42.02},
    {"codigo": 60114, "nombre": "Acapulco", "cantonCodigo": 601, "area": 110.91},
    {"codigo": 60115, "nombre": "El Roble", "cantonCodigo": 601, "area": 7.93},
    {"codigo": 60116, "nombre": "Arancibia", "cantonCodigo": 601, "area": 44.86},
    
    # Esparza (602) - 6 distritos
    {"codigo": 60201, "nombre": "Espíritu Santo", "cantonCodigo": 602, "area": 18.91},
    {"codigo": 60202, "nombre": "San Juan Grande", "cantonCodigo": 602, "area": 18.71},
    {"codigo": 60203, "nombre": "Macacona", "cantonCodigo": 602, "area": 34.13},
    {"codigo": 60204, "nombre": "San Rafael", "cantonCodigo": 602, "area": 34.32},
    {"codigo": 60205, "nombre": "San Jerónimo", "cantonCodigo": 602, "area": 49.14},
    {"codigo": 60206, "nombre": "Caldera", "cantonCodigo": 602, "area": 62.02},
    
    # Buenos Aires (603) - 9 distritos
    {"codigo": 60301, "nombre": "Buenos Aires", "cantonCodigo": 603, "area": 554.83},
    {"codigo": 60302, "nombre": "Volcán", "cantonCodigo": 603, "area": 187.41},
    {"codigo": 60303, "nombre": "Potrero Grande", "cantonCodigo": 603, "area": 626.7},
    {"codigo": 60304, "nombre": "Boruca", "cantonCodigo": 603, "area": 125.79},
    {"codigo": 60305, "nombre": "Pilas", "cantonCodigo": 603, "area": 114.34},
    {"codigo": 60306, "nombre": "Colinas", "cantonCodigo": 603, "area": 128.8},
    {"codigo": 60307, "nombre": "Chánguena", "cantonCodigo": 603, "area": 273.04},
    {"codigo": 60308, "nombre": "Biolley", "cantonCodigo": 603, "area": 208.27},
    {"codigo": 60309, "nombre": "Brunka", "cantonCodigo": 603, "area": 163.77},
    
    # Montes de Oro (604) - 3 distritos
    {"codigo": 60401, "nombre": "Miramar", "cantonCodigo": 604, "area": 110.96},
    {"codigo": 60402, "nombre": "La Unión", "cantonCodigo": 604, "area": 78.93},
    {"codigo": 60403, "nombre": "San Isidro", "cantonCodigo": 604, "area": 57.71},
    
    # Osa (605) - 6 distritos
    {"codigo": 60501, "nombre": "Puerto Cortés", "cantonCodigo": 605, "area": 234.39},
    {"codigo": 60502, "nombre": "Palmar", "cantonCodigo": 605, "area": 250.8},
    {"codigo": 60503, "nombre": "Sierpe", "cantonCodigo": 605, "area": 634.18},
    {"codigo": 60504, "nombre": "Bahía Ballena", "cantonCodigo": 605, "area": 158.33},
    {"codigo": 60505, "nombre": "Piedras Blancas", "cantonCodigo": 605, "area": 262.58},
    {"codigo": 60506, "nombre": "Bahía Drake", "cantonCodigo": 605, "area": 392.41},
    
    # Quepos (606) - 3 distritos
    {"codigo": 60601, "nombre": "Quepos", "cantonCodigo": 606, "area": 236.05},
    {"codigo": 60602, "nombre": "Savegre", "cantonCodigo": 606, "area": 216.47},
    {"codigo": 60603, "nombre": "Naranjito", "cantonCodigo": 606, "area": 105.33},
    
    # Golfito (607) - 4 distritos
    {"codigo": 60701, "nombre": "Golfito", "cantonCodigo": 607, "area": 355.9},
    {"codigo": 60702, "nombre": "Puerto Jiménez", "cantonCodigo": 607, "area": 720.43},
    {"codigo": 60703, "nombre": "Guaycará", "cantonCodigo": 607, "area": 323.1},
    {"codigo": 60704, "nombre": "Pavón", "cantonCodigo": 607, "area": 353.32},
    
    # Coto Brus (608) - 6 distritos
    {"codigo": 60801, "nombre": "San Vito", "cantonCodigo": 608, "area": 74.59},
    {"codigo": 60802, "nombre": "Sabalito", "cantonCodigo": 608, "area": 186.86},
    {"codigo": 60803, "nombre": "Aguabuena", "cantonCodigo": 608, "area": 63.89},
    {"codigo": 60804, "nombre": "Limoncito", "cantonCodigo": 608, "area": 123.64},
    {"codigo": 60805, "nombre": "Pittier", "cantonCodigo": 608, "area": 257.05},
    {"codigo": 60806, "nombre": "Gutiérrez Braun", "cantonCodigo": 608, "area": 238.19},
    
    # Parrita (609) - 1 distrito
    {"codigo": 60901, "nombre": "Parrita", "cantonCodigo": 609, "area": 483.22},
    
    # Corredores (610) - 4 distritos
    {"codigo": 61001, "nombre": "Corredor", "cantonCodigo": 610, "area": 275.67},
    {"codigo": 61002, "nombre": "La Cuesta", "cantonCodigo": 610, "area": 37.08},
    {"codigo": 61003, "nombre": "Canoas", "cantonCodigo": 610, "area": 122.02},
    {"codigo": 61004, "nombre": "Laurel", "cantonCodigo": 610, "area": 188.85},
    
    # Garabito (611) - 3 distritos
    {"codigo": 61101, "nombre": "Jacó", "cantonCodigo": 611, "area": 141.37},
    {"codigo": 61102, "nombre": "Tárcoles", "cantonCodigo": 611, "area": 93.64},
    {"codigo": 61103, "nombre": "Lagunillas", "cantonCodigo": 611, "area": 81},
    
    # Monteverde (612) - 1 distrito
    {"codigo": 61201, "nombre": "Monteverde", "cantonCodigo": 612, "area": 53.47}
]

# LIMÓN (701-706)
limon_distritos = [
    # Limón (701) - 4 distritos
    {"codigo": 70101, "nombre": "Limón", "cantonCodigo": 701, "area": 59.18},
    {"codigo": 70102, "nombre": "Valle La Estrella", "cantonCodigo": 701, "area": 1238.42},
    {"codigo": 70103, "nombre": "Río Blanco", "cantonCodigo": 701, "area": 131.31},
    {"codigo": 70104, "nombre": "Matama", "cantonCodigo": 701, "area": 340.47},
    
    # Pococí (702) - 7 distritos
    {"codigo": 70201, "nombre": "Guápiles", "cantonCodigo": 702, "area": 221.74},
    {"codigo": 70202, "nombre": "Jiménez", "cantonCodigo": 702, "area": 108.23},
    {"codigo": 70203, "nombre": "Rita", "cantonCodigo": 702, "area": 503.74},
    {"codigo": 70204, "nombre": "Roxana", "cantonCodigo": 702, "area": 166.21},
    {"codigo": 70205, "nombre": "Cariari", "cantonCodigo": 702, "area": 201.03},
    {"codigo": 70206, "nombre": "Colorado", "cantonCodigo": 702, "area": 948.51},
    {"codigo": 70207, "nombre": "La Colonia", "cantonCodigo": 702, "area": 38.79},
    
    # Siquirres (703) - 7 distritos
    {"codigo": 70301, "nombre": "Siquirres", "cantonCodigo": 703, "area": 184.21},
    {"codigo": 70302, "nombre": "Pacuarito", "cantonCodigo": 703, "area": 220.02},
    {"codigo": 70303, "nombre": "Florida", "cantonCodigo": 703, "area": 81.93},
    {"codigo": 70304, "nombre": "Germania", "cantonCodigo": 703, "area": 33.96},
    {"codigo": 70305, "nombre": "El Cairo", "cantonCodigo": 703, "area": 106.96},
    {"codigo": 70306, "nombre": "Alegría", "cantonCodigo": 703, "area": 38.05},
    {"codigo": 70307, "nombre": "Reventazón", "cantonCodigo": 703, "area": 190.01},
    
    # Talamanca (704) - 4 distritos
    {"codigo": 70401, "nombre": "Bratsi", "cantonCodigo": 704, "area": 180.85},
    {"codigo": 70402, "nombre": "Sixaola", "cantonCodigo": 704, "area": 169.01},
    {"codigo": 70403, "nombre": "Cahuita", "cantonCodigo": 704, "area": 234.07},
    {"codigo": 70404, "nombre": "Telire", "cantonCodigo": 704, "area": 2208.3},
    
    # Matina (705) - 3 distritos
    {"codigo": 70501, "nombre": "Matina", "cantonCodigo": 705, "area": 351.45},
    {"codigo": 70502, "nombre": "Batán", "cantonCodigo": 705, "area": 213.41},
    {"codigo": 70503, "nombre": "Carrandí", "cantonCodigo": 705, "area": 205.54},
    
    # Guácimo (706) - 3 distritos
    {"codigo": 70601, "nombre": "Guácimo", "cantonCodigo": 706, "area": 223.79},
    {"codigo": 70602, "nombre": "Mercedes", "cantonCodigo": 706, "area": 90.06},
    {"codigo": 70603, "nombre": "Pocora", "cantonCodigo": 706, "area": 72.88}
]

# Combinar todos los distritos nuevos
all_new_distritos = guanacaste_distritos + puntarenas_distritos + limon_distritos

# Agregar solo los que no existen
new_distritos = []
for distrito in all_new_distritos:
    if distrito['codigo'] not in existing_codes:
        new_distritos.append(distrito)
        existing_codes.add(distrito['codigo'])

print(f"Distritos nuevos a agregar: {len(new_distritos)}")

# Combinar con existentes
all_distritos = existing_distritos + new_distritos

# Guardar archivo actualizado
with open('data/costa-rica/distritos.json', 'w', encoding='utf-8') as f:
    json.dump(all_distritos, f, indent=2, ensure_ascii=False)

print(f"🎉 TOTAL DE DISTRITOS COMPLETADO: {len(all_distritos)}")
print(f"\nDistritos por provincia:")
print(f"  San José: {len([d for d in all_distritos if d['cantonCodigo'] < 200])}")
print(f"  Alajuela: {len([d for d in all_distritos if 200 <= d['cantonCodigo'] < 300])}")
print(f"  Cartago: {len([d for d in all_distritos if 300 <= d['cantonCodigo'] < 400])}")
print(f"  Heredia: {len([d for d in all_distritos if 400 <= d['cantonCodigo'] < 500])}")
print(f"  Guanacaste: {len([d for d in all_distritos if 500 <= d['cantonCodigo'] < 600])}")
print(f"  Puntarenas: {len([d for d in all_distritos if 600 <= d['cantonCodigo'] < 700])}")
print(f"  Limón: {len([d for d in all_distritos if 700 <= d['cantonCodigo'] < 800])}")

print(f"\n✅ SISTEMA GEOGRÁFICO COMPLETO:")
print(f"  7 Provincias")
print(f"  82 Cantones") 
print(f"  {len(all_distritos)} Distritos")
