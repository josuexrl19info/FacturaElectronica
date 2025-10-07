// Script para debuggear el problema de facturas
console.log('🔍 Debugging invoices issue...')

// Simular el entorno del navegador
if (typeof window === 'undefined') {
  global.window = {}
  global.localStorage = {
    getItem: (key) => {
      console.log(`Getting ${key} from localStorage`)
      return null // Simular que no hay datos
    }
  }
}

// Verificar datos de autenticación
const user = JSON.parse(localStorage.getItem('user') || '{}')
const selectedCompanyId = localStorage.getItem('selectedCompanyId')

console.log('📋 Datos de autenticación:')
console.log('- user:', user)
console.log('- selectedCompanyId:', selectedCompanyId)
console.log('- user.tenantId:', user.tenantId)
console.log('- user.id:', user.id)

// Verificar si los datos están completos
const hasCompleteAuth = !!(user.tenantId && selectedCompanyId && user.id)
console.log('✅ Datos completos:', hasCompleteAuth)

if (!hasCompleteAuth) {
  console.log('❌ Datos de autenticación incompletos - esto explicaría por qué no se cargan las facturas')
} else {
  console.log('✅ Datos de autenticación completos - el problema puede estar en otro lado')
}
