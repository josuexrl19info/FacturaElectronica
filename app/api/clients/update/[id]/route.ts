import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    console.log('🔍 API Clientes Update - Datos recibidos:', body)
    console.log('🔍 API Clientes Update - ID del cliente:', id)

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

    // Validar ID del cliente
    if (!id) {
      return NextResponse.json(
        { error: 'ID del cliente es requerido' },
        { status: 400 }
      )
    }

    // Validar datos requeridos
    if (!name || !identification || !email || !tenantId || !createdBy) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Validar longitud del nombre comercial (máximo 80 caracteres)
    if (commercialName && commercialName.length > 80) {
      return NextResponse.json(
        { error: 'El nombre comercial no puede tener más de 80 caracteres' },
        { status: 400 }
      )
    }

    // Preparar datos para Firestore (solo los campos que se van a actualizar)
    const updateData: any = {
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
      
      // Campos del sistema para actualización
      updatedBy: createdBy,
      updatedAt: serverTimestamp()
    }

    // Agregar companyIds si se proporciona selectedCompanyId
    if (selectedCompanyId) {
      updateData.companyIds = [selectedCompanyId]
    }

    console.log('💾 Actualizando cliente en Firestore:', updateData)

    // Actualizar documento en Firestore
    const clientRef = doc(db, 'clients', id)
    await updateDoc(clientRef, updateData)
    
    console.log('✅ Cliente actualizado exitosamente con ID:', id)

    return NextResponse.json({
      success: true,
      clientId: id,
      message: 'Cliente actualizado exitosamente'
    })

  } catch (error) {
    console.error('❌ Error al actualizar cliente:', error)
    
    // Manejar errores específicos de Firestore
    if (error instanceof Error) {
      if (error.message.includes('No document to update')) {
        return NextResponse.json(
          { error: 'Cliente no encontrado' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
