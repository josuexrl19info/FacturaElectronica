/**
 * Servicio para convertir códigos de ubicación a nombres legibles
 */

interface LocationData {
  codigo: number
  nombre: string
}

interface LocationNames {
  provincia: string
  canton: string
  distrito: string
}

// Cache para evitar cargas repetidas
const cache = new Map<string, LocationData[]>()

/**
 * Carga datos de ubicación desde archivos JSON
 */
async function loadLocationData(type: 'provincias' | 'cantones' | 'distritos', provinceCode?: string, cantonCode?: string): Promise<LocationData[]> {
  const cacheKey = `${type}${provinceCode ? `-${provinceCode}` : ''}${cantonCode ? `-${cantonCode}` : ''}`
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!
  }

  try {
    // Siempre cargamos el archivo completo y filtramos localmente
    const url = `/data/costa-rica/${type}.json`
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`No se pudo cargar ${type}`)
    }

    let data = await response.json()
    
    // Filtrar por provincia si es necesario
    if (type === 'cantones' && provinceCode) {
      data = data.filter((item: any) => item.provinciaCodigo?.toString() === provinceCode)
    }
    
    // Filtrar por cantón si es necesario  
    if (type === 'distritos' && cantonCode) {
      data = data.filter((item: any) => item.cantonCodigo?.toString() === cantonCode)
    }

    cache.set(cacheKey, data)
    return data
  } catch (error) {
    console.error(`Error al cargar ${type}:`, error)
    return []
  }
}

/**
 * Convierte códigos de ubicación a nombres legibles
 */
export async function getLocationNames(
  provinceCode: string,
  cantonCode: string,
  districtCode: string
): Promise<LocationNames> {
  try {
    // Cargar provincias
    const provinces = await loadLocationData('provincias')
    const provincia = provinces.find(p => p.codigo.toString() === provinceCode)

    if (!provincia) {
      return {
        provincia: provinceCode,
        canton: cantonCode,
        distrito: districtCode
      }
    }

    // Cargar cantones
    const cantons = await loadLocationData('cantones', provinceCode)
    const canton = cantons.find(c => c.codigo.toString() === cantonCode)

    if (!canton) {
      return {
        provincia: provincia.nombre,
        canton: cantonCode,
        distrito: districtCode
      }
    }

    // Cargar distritos
    const districts = await loadLocationData('distritos', undefined, cantonCode)
    const distrito = districts.find(d => d.codigo.toString() === districtCode)

    return {
      provincia: provincia.nombre,
      canton: canton.nombre,
      distrito: distrito?.nombre || districtCode
    }
  } catch (error) {
    console.error('Error al obtener nombres de ubicación:', error)
    return {
      provincia: provinceCode,
      canton: cantonCode,
      distrito: districtCode
    }
  }
}

/**
 * Obtiene el nombre del tipo de identificación
 */
export function getIdentificationTypeName(type: string): string {
  switch (type) {
    case '01':
      return 'Física'
    case '02':
      return 'Jurídica'
    case '03':
      return 'DIMEX'
    case '04':
      return 'NITE'
    default:
      return type
  }
}

/**
 * Obtiene el nombre del estado de la actividad económica
 */
export function getEconomicActivityStatusName(estado: string): string {
  switch (estado) {
    case 'A':
      return 'Activo'
    case 'I':
      return 'Inactivo'
    case 'S':
      return 'Suspendido'
    default:
      return estado
  }
}
