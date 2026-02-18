/**
 * Script para inspeccionar la estructura de un tenant en Firestore
 * Ejecutar con: npx ts-node scripts/inspect-tenant.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { firebaseConfig } from '../lib/firebase-config'

const TENANT_ID = 'aWBhK37lHJOEyVqMlNCi'

async function inspectTenant() {
  try {
    const app = initializeApp(firebaseConfig)
    const db = getFirestore(app)

    console.log('🔍 Inspeccionando tenant:', TENANT_ID)
    
    const tenantRef = doc(db, 'tenants', TENANT_ID)
    const tenantSnap = await getDoc(tenantRef)

    if (!tenantSnap.exists()) {
      console.error('❌ Tenant no encontrado')
      return
    }

    const data = tenantSnap.data()
    
    console.log('\n📊 Estructura del Tenant:')
    console.log('ID:', tenantSnap.id)
    console.log('\n📋 Campos:')
    console.log(JSON.stringify(data, null, 2))
    
    console.log('\n📝 Campos encontrados:')
    Object.keys(data).forEach(key => {
      const value = data[key]
      const type = typeof value
      const isDate = value?.toDate ? 'Date' : type
      console.log(`  - ${key}: ${isDate} ${value?.toDate ? `(${value.toDate()})` : ''}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

inspectTenant()
