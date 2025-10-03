/**
 * Servicio para manejar datos geográficos de Costa Rica
 * Proporciona provincias, cantones y distritos con dropdowns dependientes
 */

export interface Provincia {
  codigo: number
  nombre: string
}

export interface Canton {
  codigo: number
  nombre: string
  provinciaCodigo: number
}

export interface Distrito {
  codigo: number
  nombre: string
  cantonCodigo: number
  area: number
}

export interface UbicacionCompleta {
  provincia: Provincia
  canton: Canton
  distrito: Distrito
}

class CostaRicaGeoService {
  private provincias: Provincia[] = []
  private cantones: Canton[] = []
  private distritos: Distrito[] = []
  private initialized = false

  /**
   * Inicializa el servicio cargando los datos geográficos
   */
  async initialize() {
    if (this.initialized) return

    try {
      // Cargar datos de provincias
      const provinciasResponse = await fetch('/data/costa-rica/provincias.json')
      this.provincias = await provinciasResponse.json()

      // Cargar datos de cantones
      const cantonesResponse = await fetch('/data/costa-rica/cantones.json')
      this.cantones = await cantonesResponse.json()

      // Cargar datos de distritos
      const distritosResponse = await fetch('/data/costa-rica/distritos.json')
      this.distritos = await distritosResponse.json()

      this.initialized = true
    } catch (error) {
      console.error('Error loading Costa Rica geographic data:', error)
      throw new Error('No se pudieron cargar los datos geográficos')
    }
  }

  /**
   * Obtiene todas las provincias
   */
  async getProvincias(): Promise<Provincia[]> {
    await this.initialize()
    return this.provincias
  }

  /**
   * Obtiene los cantones de una provincia específica
   */
  async getCantonesByProvincia(provinciaCodigo: number): Promise<Canton[]> {
    await this.initialize()
    return this.cantones.filter(canton => canton.provinciaCodigo === provinciaCodigo)
  }

  /**
   * Obtiene los distritos de un cantón específico
   */
  async getDistritosByCanton(cantonCodigo: number): Promise<Distrito[]> {
    await this.initialize()
    return this.distritos.filter(distrito => distrito.cantonCodigo === cantonCodigo)
  }

  /**
   * Busca una provincia por código
   */
  async getProvinciaByCodigo(codigo: number): Promise<Provincia | null> {
    await this.initialize()
    return this.provincias.find(p => p.codigo === codigo) || null
  }

  /**
   * Busca un cantón por código
   */
  async getCantonByCodigo(codigo: number): Promise<Canton | null> {
    await this.initialize()
    return this.cantones.find(c => c.codigo === codigo) || null
  }

  /**
   * Busca un distrito por código
   */
  async getDistritoByCodigo(codigo: number): Promise<Distrito | null> {
    await this.initialize()
    return this.distritos.find(d => d.codigo === codigo) || null
  }

  /**
   * Busca una ubicación completa por códigos
   */
  async getUbicacionCompleta(
    provinciaCodigo: number,
    cantonCodigo: number,
    distritoCodigo: number
  ): Promise<UbicacionCompleta | null> {
    await this.initialize()

    const provincia = await this.getProvinciaByCodigo(provinciaCodigo)
    const canton = await this.getCantonByCodigo(cantonCodigo)
    const distrito = await this.getDistritoByCodigo(distritoCodigo)

    if (!provincia || !canton || !distrito) {
      return null
    }

    // Verificar que el cantón pertenece a la provincia
    if (canton.provinciaCodigo !== provinciaCodigo) {
      return null
    }

    // Verificar que el distrito pertenece al cantón
    if (distrito.cantonCodigo !== cantonCodigo) {
      return null
    }

    return { provincia, canton, distrito }
  }

  /**
   * Busca una ubicación por nombres (búsqueda aproximada)
   */
  async buscarUbicacionPorNombres(
    nombreProvincia: string,
    nombreCanton: string,
    nombreDistrito: string
  ): Promise<UbicacionCompleta | null> {
    await this.initialize()

    const provincia = this.provincias.find(p => 
      p.nombre.toLowerCase().includes(nombreProvincia.toLowerCase())
    )

    if (!provincia) return null

    const canton = this.cantones.find(c => 
      c.provinciaCodigo === provincia.codigo &&
      c.nombre.toLowerCase().includes(nombreCanton.toLowerCase())
    )

    if (!canton) return null

    const distrito = this.distritos.find(d => 
      d.cantonCodigo === canton.codigo &&
      d.nombre.toLowerCase().includes(nombreDistrito.toLowerCase())
    )

    if (!distrito) return null

    return { provincia, canton, distrito }
  }

  /**
   * Obtiene estadísticas de la división territorial
   */
  async getEstadisticas() {
    await this.initialize()
    
    return {
      totalProvincias: this.provincias.length,
      totalCantones: this.cantones.length,
      totalDistritos: this.distritos.length,
      provinciaConMasCantones: this.getProvinciaConMasCantones(),
      cantonConMasDistritos: this.getCantonConMasDistritos(),
      areaTotal: this.distritos.reduce((total, distrito) => total + distrito.area, 0)
    }
  }

  private getProvinciaConMasCantones() {
    const cantonesPorProvincia = this.cantones.reduce((acc, canton) => {
      acc[canton.provinciaCodigo] = (acc[canton.provinciaCodigo] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const maxCantones = Math.max(...Object.values(cantonesPorProvincia))
    const provinciaCodigo = Object.keys(cantonesPorProvincia).find(
      codigo => cantonesPorProvincia[Number(codigo)] === maxCantones
    )

    const provincia = this.provincias.find(p => p.codigo === Number(provinciaCodigo))
    return provincia ? { provincia, cantidad: maxCantones } : null
  }

  private getCantonConMasDistritos() {
    const distritosPorCanton = this.distritos.reduce((acc, distrito) => {
      acc[distrito.cantonCodigo] = (acc[distrito.cantonCodigo] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const maxDistritos = Math.max(...Object.values(distritosPorCanton))
    const cantonCodigo = Object.keys(distritosPorCanton).find(
      codigo => distritosPorCanton[Number(codigo)] === maxDistritos
    )

    const canton = this.cantones.find(c => c.codigo === Number(cantonCodigo))
    return canton ? { canton, cantidad: maxDistritos } : null
  }

  /**
   * Valida que una combinación de provincia, cantón y distrito sea válida
   */
  async validarUbicacion(
    provinciaCodigo: number,
    cantonCodigo: number,
    distritoCodigo: number
  ): Promise<boolean> {
    const ubicacion = await this.getUbicacionCompleta(provinciaCodigo, cantonCodigo, distritoCodigo)
    return ubicacion !== null
  }

  /**
   * Formatea una ubicación para mostrar
   */
  async formatearUbicacion(
    provinciaCodigo: number,
    cantonCodigo: number,
    distritoCodigo: number
  ): Promise<string | null> {
    const ubicacion = await this.getUbicacionCompleta(provinciaCodigo, cantonCodigo, distritoCodigo)
    
    if (!ubicacion) return null

    return `${ubicacion.distrito.nombre}, ${ubicacion.canton.nombre}, ${ubicacion.provincia.nombre}`
  }
}

// Instancia singleton del servicio
export const costaRicaGeo = new CostaRicaGeoService()
