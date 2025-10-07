/**
 * Servicio para obtener el tipo de cambio de Hacienda Costa Rica
 */

export interface HaciendaExchangeRate {
  venta: {
    fecha: string;
    valor: number;
  };
  compra: {
    fecha: string;
    valor: number;
  };
}

export class ExchangeRateService {
  private static readonly HACIENDA_EXCHANGE_RATE_URL = 'https://api.hacienda.go.cr/indicadores/tc/dolar';
  private static cache: { data: HaciendaExchangeRate | null; timestamp: number } = { data: null, timestamp: 0 };
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en millisegundos

  /**
   * Obtiene el tipo de cambio de venta del dólar desde Hacienda
   * @returns El valor de venta del dólar en colones
   */
  static async getExchangeRate(): Promise<number | null> {
    try {
      console.log('💱 [ExchangeRate] Obteniendo tipo de cambio de Hacienda...');
      
      // Verificar cache primero
      const now = Date.now();
      if (this.cache.data && (now - this.cache.timestamp) < this.CACHE_DURATION) {
        console.log(`💱 [ExchangeRate] Usando cache (${Math.round((now - this.cache.timestamp) / 1000)}s)`);
        return this.cache.data.venta.valor;
      }

      // Obtener datos de Hacienda
      const response = await fetch(this.HACIENDA_EXCHANGE_RATE_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'InvoSell-CostaRica/1.0'
        },
        // Timeout de 10 segundos
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: HaciendaExchangeRate = await response.json();
      
      // Validar estructura de respuesta
      if (!data.venta || typeof data.venta.valor !== 'number') {
        throw new Error('Estructura de respuesta inválida de Hacienda');
      }

      // Actualizar cache
      this.cache = { data, timestamp: now };
      
      const exchangeRate = data.venta.valor;
      console.log(`💱 [ExchangeRate] Tipo de cambio obtenido: ${exchangeRate} CRC por USD`);
      console.log(`💱 [ExchangeRate] Fecha: ${data.venta.fecha}`);
      
      return exchangeRate;
      
    } catch (error) {
      console.error('💱 [ExchangeRate] Error obteniendo tipo de cambio:', error);
      
      // Si hay cache válido, usarlo como fallback
      if (this.cache.data) {
        console.log('💱 [ExchangeRate] Usando cache como fallback debido al error');
        return this.cache.data.venta.valor;
      }
      
      return null;
    }
  }

  /**
   * Obtiene el tipo de cambio solo si la moneda es USD
   * @param currency Código de moneda
   * @returns El tipo de cambio o null si no es USD
   */
  static async getExchangeRateForCurrency(currency: string): Promise<number | null> {
    if (currency?.toUpperCase() === 'USD') {
      return await this.getExchangeRate();
    }
    return null;
  }

  /**
   * Limpia el cache del tipo de cambio
   */
  static clearCache(): void {
    this.cache = { data: null, timestamp: 0 };
    console.log('💱 [ExchangeRate] Cache limpiado');
  }

  /**
   * Obtiene información completa del tipo de cambio (para debugging)
   */
  static async getFullExchangeRateInfo(): Promise<HaciendaExchangeRate | null> {
    try {
      const response = await fetch(this.HACIENDA_EXCHANGE_RATE_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'InvoSell-CostaRica/1.0'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('💱 [ExchangeRate] Error obteniendo información completa:', error);
      return null;
    }
  }
}
