import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🔍 API Clientes - Datos recibidos:', body)

    const {
      // Información general
      name,
      commercialName,
      identification,
      identificationType,
      email,
      phone,
      phoneCountryCode,
      
      // Ubicación
      province,
      canton,
      district,
      otrasSenas,
      
      // Actividad económica
      economicActivity,
      
      // Exoneración
      hasExemption,
      exemptionType,
      exemptionDocumentNumber,
      exemptionDocumentDate,
      exemptionInstitution,
      exemptionInstitutionOthers,
      exemptionTariff,
      exemptionObservations,
      
      // Datos del sistema
      tenantId,
      createdBy,
      selectedCompanyId
    } = body

    // Validar datos requeridos
    if (!name || !identification || !email || !tenantId || !createdBy) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Preparar datos para Firestore
    const clientData = {
      // Información general
      name,
      commercialName: commercialName || '',
      identification,
      identificationType,
      email,
      phone: phone || '',
      phoneCountryCode: phoneCountryCode || '',
      
      // Ubicación
      province,
      canton,
      district,
      otrasSenas: otrasSenas || '',
      
      // Actividad económica
      economicActivity: economicActivity || {
        codigo: '',
        descripcion: '',
        estado: ''
      },
      
      // Exoneración (solo si aplica)
      exemption: hasExemption ? {
        exemptionType,
        documentNumber: exemptionDocumentNumber,
        documentDate: exemptionDocumentDate,
        institutionName: exemptionInstitution,
        institutionNameOthers: exemptionInstitutionOthers || '',
        tariffExempted: exemptionTariff || 0,
        observations: exemptionObservations || '',
        isExempt: true
      } : {
        isExempt: false
      },
      
      // Campos del sistema
      tenantId,
      createdBy,
      createdAt: serverTimestamp(),
      updatedBy: createdBy,
      updatedAt: serverTimestamp(),
      status: 'active',
      totalInvoices: 0,
      totalAmount: 0,
      companyIds: selectedCompanyId ? [selectedCompanyId] : [] // Empresa seleccionada al inicio del login
    }

    console.log('💾 Creando cliente en Firestore:', clientData)

    // Crear documento en Firestore
    const docRef = await addDoc(collection(db, 'clients'), clientData)
    
    console.log('✅ Cliente creado exitosamente con ID:', docRef.id)

    return NextResponse.json({
      success: true,
      clientId: docRef.id,
      message: 'Cliente creado exitosamente'
    })

  } catch (error) {
    console.error('❌ Error al crear cliente:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
