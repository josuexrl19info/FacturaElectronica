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
      
      // Exoneración (nuevo formato)
      tieneExoneracion,
      exoneracion,
      
      // Exoneración (formato antiguo - para retrocompatibilidad)
      hasExemption,
      exemptionType,
      exemptionDocumentNumber,
      exemptionDocumentDate,
      exemptionInstitution,
      exemptionInstitutionOthers,
      exemptionTariff,
      exemptionObservations,
      
      // Campos individuales de exoneración del frontend
      exemptionArticle,
      exemptionSubsection,
      exemptionLawName,
      exemptionPurchasePercentage,
      
      // Datos del sistema
      tenantId,
      createdBy,
      selectedCompanyId
    } = body

    console.log('🔍 Campos de exoneración individuales:', {
      hasExemption,
      exemptionArticle,
      exemptionSubsection,
      exemptionLawName,
      exemptionPurchasePercentage,
      exemptionType,
      exemptionDocumentNumber
    })

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
      
      // Exoneración (lógica mejorada para manejar ambos formatos)
      tieneExoneracion: tieneExoneracion !== undefined ? tieneExoneracion : (hasExemption || false),
      exoneracion: (() => {
        // Si tenemos el formato nuevo (tieneExoneracion con objeto exoneracion)
        if (tieneExoneracion && exoneracion) {
          return {
            tipoDocumento: exoneracion.tipoDocumento || '',
            tipoDocumentoOtro: exoneracion.tipoDocumentoOtro || '',
            numeroDocumento: exoneracion.numeroDocumento || '',
            nombreLey: exoneracion.nombreLey || '',
            articulo: exoneracion.articulo || '',
            inciso: exoneracion.inciso || '',
            porcentajeCompra: exoneracion.porcentajeCompra || '',
            nombreInstitucion: exoneracion.nombreInstitucion || '',
            nombreInstitucionOtros: exoneracion.nombreInstitucionOtros || '',
            fechaEmision: exoneracion.fechaEmision || '',
            tarifaExonerada: exoneracion.tarifaExonerada || '',
            montoExoneracion: exoneracion.montoExoneracion || ''
          }
        }
        // Si tenemos hasExemption = true (formato del frontend)
        else if (hasExemption) {
          return {
            tipoDocumento: exemptionType || '',
            tipoDocumentoOtro: '',
            numeroDocumento: exemptionDocumentNumber || '',
            nombreLey: exemptionLawName || '', // Campo individual del frontend
            articulo: exemptionArticle || '', // Campo individual del frontend
            inciso: exemptionSubsection || '', // Campo individual del frontend
            porcentajeCompra: exemptionPurchasePercentage || '', // Campo individual del frontend
            nombreInstitucion: exemptionInstitution || '',
            nombreInstitucionOtros: exemptionInstitutionOthers || '',
            fechaEmision: exemptionDocumentDate || '',
            tarifaExonerada: exemptionTariff || '',
            montoExoneracion: ''
          }
        }
        return null
      })(),
      
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
