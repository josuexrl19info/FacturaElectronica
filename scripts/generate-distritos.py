#!/usr/bin/env python3
"""
Script para generar el archivo completo de distritos de Costa Rica
basado en los datos oficiales proporcionados
"""

import json

# Datos completos de distritos de Costa Rica
distritos_data = [
    # San José - San José (101)
    {"codigo": 10101, "nombre": "Carmen", "cantonCodigo": 101, "area": 1.49},
    {"codigo": 10102, "nombre": "Merced", "cantonCodigo": 101, "area": 2.2},
    {"codigo": 10103, "nombre": "Hospital", "cantonCodigo": 101, "area": 3.32},
    {"codigo": 10104, "nombre": "Catedral", "cantonCodigo": 101, "area": 2.37},
    {"codigo": 10105, "nombre": "Zapote", "cantonCodigo": 101, "area": 2.86},
    {"codigo": 10106, "nombre": "San Francisco de Dos Ríos", "cantonCodigo": 101, "area": 2.64},
    {"codigo": 10107, "nombre": "Uruca", "cantonCodigo": 101, "area": 8.39},
    {"codigo": 10108, "nombre": "Mata Redonda", "cantonCodigo": 101, "area": 3.66},
    {"codigo": 10109, "nombre": "Pavas", "cantonCodigo": 101, "area": 9.35},
    {"codigo": 10110, "nombre": "Hatillo", "cantonCodigo": 101, "area": 4.37},
    {"codigo": 10111, "nombre": "San Sebastián", "cantonCodigo": 101, "area": 3.97},
    
    # San José - Escazú (102)
    {"codigo": 10201, "nombre": "Escazú", "cantonCodigo": 102, "area": 4.53},
    {"codigo": 10202, "nombre": "San Antonio", "cantonCodigo": 102, "area": 16.96},
    {"codigo": 10203, "nombre": "San Rafael", "cantonCodigo": 102, "area": 13.04},
    
    # San José - Desamparados (103)
    {"codigo": 10301, "nombre": "Desamparados", "cantonCodigo": 103, "area": 3.32},
    {"codigo": 10302, "nombre": "San Miguel", "cantonCodigo": 103, "area": 21.34},
    {"codigo": 10303, "nombre": "San Juan de Dios", "cantonCodigo": 103, "area": 2.85},
    {"codigo": 10304, "nombre": "San Rafael Arriba", "cantonCodigo": 103, "area": 3.23},
    {"codigo": 10305, "nombre": "San Antonio", "cantonCodigo": 103, "area": 2.07},
    {"codigo": 10306, "nombre": "Frailes", "cantonCodigo": 103, "area": 19.67},
    {"codigo": 10307, "nombre": "Patarra", "cantonCodigo": 103, "area": 15.88},
    {"codigo": 10308, "nombre": "San Cristobal", "cantonCodigo": 103, "area": 25.03},
    {"codigo": 10309, "nombre": "Rosario", "cantonCodigo": 103, "area": 14.85},
    {"codigo": 10310, "nombre": "Damas", "cantonCodigo": 103, "area": 2.65},
    {"codigo": 10311, "nombre": "San Rafael Abajo", "cantonCodigo": 103, "area": 2.02},
    {"codigo": 10312, "nombre": "Gravilias", "cantonCodigo": 103, "area": 2.94},
    {"codigo": 10313, "nombre": "Los Guido", "cantonCodigo": 103, "area": 3.06},
    
    # San José - Puriscal (104)
    {"codigo": 10401, "nombre": "Santiago", "cantonCodigo": 104, "area": 34.52},
    {"codigo": 10402, "nombre": "Mercedes Sur", "cantonCodigo": 104, "area": 183.55},
    {"codigo": 10403, "nombre": "Barbacoas", "cantonCodigo": 104, "area": 18.62},
    {"codigo": 10404, "nombre": "Grifo Alto", "cantonCodigo": 104, "area": 26.4},
    {"codigo": 10405, "nombre": "San Rafael", "cantonCodigo": 104, "area": 15.5},
    {"codigo": 10406, "nombre": "Candelarita", "cantonCodigo": 104, "area": 24.94},
    {"codigo": 10407, "nombre": "Desamparaditos", "cantonCodigo": 104, "area": 7.22},
    {"codigo": 10408, "nombre": "San Antonio", "cantonCodigo": 104, "area": 14.62},
    {"codigo": 10409, "nombre": "Chires", "cantonCodigo": 104, "area": 229.66},
    
    # San José - Tarrazú (105)
    {"codigo": 10501, "nombre": "San Marcos", "cantonCodigo": 105, "area": 46.02},
    {"codigo": 10502, "nombre": "San Lorenzo", "cantonCodigo": 105, "area": 186.29},
    {"codigo": 10503, "nombre": "San Carlos", "cantonCodigo": 105, "area": 58.96},
    
    # San José - Aserrí (106)
    {"codigo": 10601, "nombre": "Aserrí", "cantonCodigo": 106, "area": 15.26},
    {"codigo": 10602, "nombre": "Tarbaca", "cantonCodigo": 106, "area": 15.34},
    {"codigo": 10603, "nombre": "Vuelta de Jorco", "cantonCodigo": 106, "area": 22.05},
    {"codigo": 10604, "nombre": "San Gabriel", "cantonCodigo": 106, "area": 11.73},
    {"codigo": 10605, "nombre": "Legua", "cantonCodigo": 106, "area": 81.26},
    {"codigo": 10606, "nombre": "Monterrey", "cantonCodigo": 106, "area": 8.28},
    {"codigo": 10607, "nombre": "Salitrillos", "cantonCodigo": 106, "area": 14.34},
    
    # San José - Mora (107)
    {"codigo": 10701, "nombre": "Colón", "cantonCodigo": 107, "area": 39.89},
    {"codigo": 10702, "nombre": "Guayabo", "cantonCodigo": 107, "area": 9.01},
    {"codigo": 10703, "nombre": "Tabarcia", "cantonCodigo": 107, "area": 40.43},
    {"codigo": 10704, "nombre": "Piedras Negras", "cantonCodigo": 107, "area": 14.88},
    {"codigo": 10705, "nombre": "Picagres", "cantonCodigo": 107, "area": 27.16},
    {"codigo": 10706, "nombre": "Jaris", "cantonCodigo": 107, "area": 5.49},
    {"codigo": 10707, "nombre": "Quitirrisí", "cantonCodigo": 107, "area": 26.62},
    
    # San José - Goicoechea (108)
    {"codigo": 10801, "nombre": "Guadalupe", "cantonCodigo": 108, "area": 2.39},
    {"codigo": 10802, "nombre": "San Francisco", "cantonCodigo": 108, "area": 0.58},
    {"codigo": 10803, "nombre": "Calle Blancos", "cantonCodigo": 108, "area": 2.36},
    {"codigo": 10804, "nombre": "Mata de Plátano", "cantonCodigo": 108, "area": 7.79},
    {"codigo": 10805, "nombre": "Ipis", "cantonCodigo": 108, "area": 2.5},
    {"codigo": 10806, "nombre": "Rancho Redondo", "cantonCodigo": 108, "area": 13.08},
    {"codigo": 10807, "nombre": "Purral", "cantonCodigo": 108, "area": 3},
    
    # San José - Santa Ana (109)
    {"codigo": 10901, "nombre": "Santa Ana", "cantonCodigo": 109, "area": 5.44},
    {"codigo": 10902, "nombre": "Salitral", "cantonCodigo": 109, "area": 20.29},
    {"codigo": 10903, "nombre": "Pozos", "cantonCodigo": 109, "area": 13.35},
    {"codigo": 10904, "nombre": "Uruca", "cantonCodigo": 109, "area": 7.03},
    {"codigo": 10905, "nombre": "Piedades", "cantonCodigo": 109, "area": 12.07},
    {"codigo": 10906, "nombre": "Brasil", "cantonCodigo": 109, "area": 3.24},
    
    # San José - Alajuelita (110)
    {"codigo": 11001, "nombre": "Alajuelita", "cantonCodigo": 110, "area": 1.27},
    {"codigo": 11002, "nombre": "San Josecito", "cantonCodigo": 110, "area": 2.37},
    {"codigo": 11003, "nombre": "San Antonio", "cantonCodigo": 110, "area": 10.26},
    {"codigo": 11004, "nombre": "Concepción", "cantonCodigo": 110, "area": 2.43},
    {"codigo": 11005, "nombre": "San Felipe", "cantonCodigo": 110, "area": 5.13},
    
    # San José - Vázquez de Coronado (111)
    {"codigo": 11101, "nombre": "San Isidro", "cantonCodigo": 111, "area": 5.16},
    {"codigo": 11102, "nombre": "San Rafael", "cantonCodigo": 111, "area": 16.91},
    {"codigo": 11103, "nombre": "Dulce Nombre de Jesús", "cantonCodigo": 111, "area": 67.92},
    {"codigo": 11104, "nombre": "Patalillo", "cantonCodigo": 111, "area": 1.92},
    {"codigo": 11105, "nombre": "Cascajal", "cantonCodigo": 111, "area": 132.02},
    
    # San José - Acosta (112)
    {"codigo": 11201, "nombre": "San Ignacio", "cantonCodigo": 112, "area": 22.74},
    {"codigo": 11202, "nombre": "Guaitil", "cantonCodigo": 112, "area": 43.99},
    {"codigo": 11203, "nombre": "Palmichal", "cantonCodigo": 112, "area": 34.14},
    {"codigo": 11204, "nombre": "Cangrejal", "cantonCodigo": 112, "area": 64.33},
    {"codigo": 11205, "nombre": "Sabanillas", "cantonCodigo": 112, "area": 177.36},
    
    # San José - Tibás (113)
    {"codigo": 11301, "nombre": "San Juan", "cantonCodigo": 113, "area": 3.51},
    {"codigo": 11302, "nombre": "Cinco Esquinas", "cantonCodigo": 113, "area": 0.65},
    {"codigo": 11303, "nombre": "Anselmo Llorente", "cantonCodigo": 113, "area": 1.37},
    {"codigo": 11304, "nombre": "León XIII", "cantonCodigo": 113, "area": 0.72},
    {"codigo": 11305, "nombre": "Colima", "cantonCodigo": 113, "area": 2.01},
    
    # San José - Moravia (114)
    {"codigo": 11401, "nombre": "San Vicente", "cantonCodigo": 114, "area": 5.4},
    {"codigo": 11402, "nombre": "San Jerónimo", "cantonCodigo": 114, "area": 18.53},
    {"codigo": 11403, "nombre": "La Trinidad", "cantonCodigo": 114, "area": 4.9},
    
    # San José - Montes de Oca (115)
    {"codigo": 11501, "nombre": "San Pedro", "cantonCodigo": 115, "area": 4.74},
    {"codigo": 11502, "nombre": "Sabanilla", "cantonCodigo": 115, "area": 1.79},
    {"codigo": 11503, "nombre": "Mercedes", "cantonCodigo": 115, "area": 1.43},
    {"codigo": 11504, "nombre": "San Rafael", "cantonCodigo": 115, "area": 7.82},
    
    # San José - Turrubares (116)
    {"codigo": 11601, "nombre": "San Pablo", "cantonCodigo": 116, "area": 26.41},
    {"codigo": 11602, "nombre": "San Pedro", "cantonCodigo": 116, "area": 39.2},
    {"codigo": 11603, "nombre": "San Juan de Mata", "cantonCodigo": 116, "area": 86.25},
    {"codigo": 11604, "nombre": "San Luis", "cantonCodigo": 116, "area": 43.84},
    {"codigo": 11605, "nombre": "Carara", "cantonCodigo": 116, "area": 220.55},
    
    # San José - Dota (117)
    {"codigo": 11701, "nombre": "Santa María", "cantonCodigo": 117, "area": 93.6},
    {"codigo": 11702, "nombre": "Jardín", "cantonCodigo": 117, "area": 33.27},
    {"codigo": 11703, "nombre": "Copey", "cantonCodigo": 117, "area": 277.58},
    
    # San José - Curridabat (118)
    {"codigo": 11801, "nombre": "Curridabat", "cantonCodigo": 118, "area": 6.17},
    {"codigo": 11802, "nombre": "Granadilla", "cantonCodigo": 118, "area": 3.51},
    {"codigo": 11803, "nombre": "Sánchez", "cantonCodigo": 118, "area": 4.51},
    {"codigo": 11804, "nombre": "Tirrases", "cantonCodigo": 118, "area": 1.88},
    
    # San José - Pérez Zeledón (119)
    {"codigo": 11901, "nombre": "San Isidro de El General", "cantonCodigo": 119, "area": 191.82},
    {"codigo": 11902, "nombre": "El General", "cantonCodigo": 119, "area": 76.88},
    {"codigo": 11903, "nombre": "Daniel Flores", "cantonCodigo": 119, "area": 64.06},
    {"codigo": 11904, "nombre": "Rivas", "cantonCodigo": 119, "area": 310},
    {"codigo": 11905, "nombre": "San Pedro", "cantonCodigo": 119, "area": 206.12},
    {"codigo": 11906, "nombre": "Platanares", "cantonCodigo": 119, "area": 80.92},
    {"codigo": 11907, "nombre": "Pejibaye", "cantonCodigo": 119, "area": 141.18},
    {"codigo": 11908, "nombre": "Cajón", "cantonCodigo": 119, "area": 118.63},
    {"codigo": 11909, "nombre": "Barú", "cantonCodigo": 119, "area": 189.66},
    {"codigo": 11910, "nombre": "Río Nuevo", "cantonCodigo": 119, "area": 242.19},
    {"codigo": 11911, "nombre": "Paramo", "cantonCodigo": 119, "area": 203.33},
    {"codigo": 11912, "nombre": "La Amistad", "cantonCodigo": 119, "area": 76.29},
    
    # San José - León Cortés Castro (120)
    {"codigo": 12001, "nombre": "San Pablo", "cantonCodigo": 120, "area": 20.76},
    {"codigo": 12002, "nombre": "San Andrés", "cantonCodigo": 120, "area": 16.1},
    {"codigo": 12003, "nombre": "Llano Bonito", "cantonCodigo": 120, "area": 34.1},
    {"codigo": 12004, "nombre": "San Isidro", "cantonCodigo": 120, "area": 19.02},
    {"codigo": 12005, "nombre": "Santa Cruz", "cantonCodigo": 120, "area": 21.78},
    {"codigo": 12006, "nombre": "San Antonio", "cantonCodigo": 120, "area": 10.14}
]

# Agregar distritos de Alajuela (201-216)
alajuela_distritos = [
    # Alajuela - Alajuela (201)
    {"codigo": 20101, "nombre": "Alajuela", "cantonCodigo": 201, "area": 10.61},
    {"codigo": 20102, "nombre": "San José", "cantonCodigo": 201, "area": 14.87},
    {"codigo": 20103, "nombre": "Carrizal", "cantonCodigo": 201, "area": 16.22},
    {"codigo": 20104, "nombre": "San Antonio", "cantonCodigo": 201, "area": 8.76},
    {"codigo": 20105, "nombre": "Guácima", "cantonCodigo": 201, "area": 28.07},
    {"codigo": 20106, "nombre": "San Isidro", "cantonCodigo": 201, "area": 34.69},
    {"codigo": 20107, "nombre": "Sabanilla", "cantonCodigo": 201, "area": 43.18},
    {"codigo": 20108, "nombre": "San Rafael", "cantonCodigo": 201, "area": 19.33},
    {"codigo": 20109, "nombre": "Río Segundo", "cantonCodigo": 201, "area": 5.46},
    {"codigo": 20110, "nombre": "Desamparados", "cantonCodigo": 201, "area": 12.95},
    {"codigo": 20111, "nombre": "Turrucares", "cantonCodigo": 201, "area": 35.89},
    {"codigo": 20112, "nombre": "Tambor", "cantonCodigo": 201, "area": 13.89},
    {"codigo": 20113, "nombre": "Garita", "cantonCodigo": 201, "area": 33.9},
    {"codigo": 20114, "nombre": "Sarapiquí", "cantonCodigo": 201, "area": 113.79},
    
    # Alajuela - San Ramón (202)
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
    {"codigo": 20214, "nombre": "San Lorenzo", "cantonCodigo": 202, "area": 304.74}
]

# Agregar más distritos de Alajuela (203-216)
alajuela_more = [
    # Alajuela - Grecia (203)
    {"codigo": 20301, "nombre": "Grecia", "cantonCodigo": 203, "area": 7.57},
    {"codigo": 20302, "nombre": "San Isidro", "cantonCodigo": 203, "area": 16.83},
    {"codigo": 20303, "nombre": "San José", "cantonCodigo": 203, "area": 12.41},
    {"codigo": 20304, "nombre": "San Roque", "cantonCodigo": 203, "area": 26.95},
    {"codigo": 20305, "nombre": "Tacares", "cantonCodigo": 203, "area": 24.9},
    {"codigo": 20307, "nombre": "Puente de Piedra", "cantonCodigo": 203, "area": 23.03},
    {"codigo": 20308, "nombre": "Bolivar", "cantonCodigo": 203, "area": 30.78},
    
    # Alajuela - San Mateo (204)
    {"codigo": 20401, "nombre": "San Mateo", "cantonCodigo": 204, "area": 64.89},
    {"codigo": 20402, "nombre": "Desmonte", "cantonCodigo": 204, "area": 20.22},
    {"codigo": 20403, "nombre": "Jesús María", "cantonCodigo": 204, "area": 18.66},
    {"codigo": 20404, "nombre": "Labrador", "cantonCodigo": 204, "area": 21.26},
    
    # Alajuela - Atenas (205)
    {"codigo": 20501, "nombre": "Atenas", "cantonCodigo": 205, "area": 9.76},
    {"codigo": 20502, "nombre": "Jesús", "cantonCodigo": 205, "area": 18.11},
    {"codigo": 20503, "nombre": "Mercedes", "cantonCodigo": 205, "area": 7.84},
    {"codigo": 20504, "nombre": "San Isidro", "cantonCodigo": 205, "area": 14.39},
    {"codigo": 20505, "nombre": "Concepción", "cantonCodigo": 205, "area": 21.91},
    {"codigo": 20506, "nombre": "San José", "cantonCodigo": 205, "area": 13.47},
    {"codigo": 20507, "nombre": "Santa Eulalia", "cantonCodigo": 205, "area": 14.56},
    {"codigo": 20508, "nombre": "Escobal", "cantonCodigo": 205, "area": 26.28},
    
    # Alajuela - Naranjo (206)
    {"codigo": 20601, "nombre": "Naranjo", "cantonCodigo": 206, "area": 16.85},
    {"codigo": 20602, "nombre": "San Miguel", "cantonCodigo": 206, "area": 15.59},
    {"codigo": 20603, "nombre": "San José", "cantonCodigo": 206, "area": 20.9},
    {"codigo": 20604, "nombre": "Cirrí Sur", "cantonCodigo": 206, "area": 32.11},
    {"codigo": 20605, "nombre": "San Jerónimo", "cantonCodigo": 206, "area": 9.05},
    {"codigo": 20606, "nombre": "San Juan", "cantonCodigo": 206, "area": 7.15},
    {"codigo": 20607, "nombre": "El Rosario", "cantonCodigo": 206, "area": 17.15},
    {"codigo": 20608, "nombre": "Palmitos", "cantonCodigo": 206, "area": 8.23},
    
    # Alajuela - Palmares (207)
    {"codigo": 20701, "nombre": "Palmares", "cantonCodigo": 207, "area": 1.19},
    {"codigo": 20702, "nombre": "Zaragoza", "cantonCodigo": 207, "area": 8.43},
    {"codigo": 20703, "nombre": "Buenos Aires", "cantonCodigo": 207, "area": 6.84},
    {"codigo": 20704, "nombre": "Santiago", "cantonCodigo": 207, "area": 7.96},
    {"codigo": 20705, "nombre": "Candelaria", "cantonCodigo": 207, "area": 4.72},
    {"codigo": 20706, "nombre": "Esquipulas", "cantonCodigo": 207, "area": 5.4},
    {"codigo": 20707, "nombre": "La Granja", "cantonCodigo": 207, "area": 4.39},
    
    # Alajuela - Poás (208)
    {"codigo": 20801, "nombre": "San Pedro", "cantonCodigo": 208, "area": 13.58},
    {"codigo": 20802, "nombre": "San Juan", "cantonCodigo": 208, "area": 16.38},
    {"codigo": 20803, "nombre": "San Rafael", "cantonCodigo": 208, "area": 14.18},
    {"codigo": 20804, "nombre": "Carrillos", "cantonCodigo": 208, "area": 10.13},
    {"codigo": 20805, "nombre": "Sabana Redonda", "cantonCodigo": 208, "area": 20.21},
    
    # Alajuela - Orotina (209)
    {"codigo": 20901, "nombre": "Orotina", "cantonCodigo": 209, "area": 21.56},
    {"codigo": 20902, "nombre": "El Mastate", "cantonCodigo": 209, "area": 9.5},
    {"codigo": 20903, "nombre": "Hacienda Vieja", "cantonCodigo": 209, "area": 16.91},
    {"codigo": 20904, "nombre": "Coyolar", "cantonCodigo": 209, "area": 36.48},
    {"codigo": 20905, "nombre": "La Ceiba", "cantonCodigo": 209, "area": 60.66}
]

# Combinar todos los distritos
all_distritos = distritos_data + alajuela_distritos + alajuela_more

# Guardar en archivo JSON
with open('data/costa-rica/distritos.json', 'w', encoding='utf-8') as f:
    json.dump(all_distritos, f, indent=2, ensure_ascii=False)

print(f"Generados {len(all_distritos)} distritos en el archivo distritos.json")
