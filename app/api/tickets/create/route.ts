import { NextRequest, NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { firebaseConfig } from '@/lib/firebase-config'

/**
 * Crea un nuevo tiquete electrónico en Firestore
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Los datos ya vienen completos desde handleCreateDocument
    const { 
      consecutivo,
      status,
      clientId,
      companyId,
      tenantId,
      subtotal,
      totalImpuesto,
      totalDescuento,
      total,
      exchangeRate,
      currency,
      condicionVenta,
      paymentTerm,
      paymentMethod,
      notes,
      items,
      createdBy
    } = body

    // Validar campos requeridos
    if (!consecutivo || !clientId || !companyId || !tenantId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Inicializar Firebase si no está inicializado
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    const db = getFirestore(app)

    // Preparar datos para Firestore
    const ticketData = {
      // Información básica del tiquete
      consecutivo,
      status: status || 'draft',
      documentType: 'tiquetes',
      
      // Relaciones
      clientId,
      companyId,
      tenantId,
      
      // Totales
      subtotal: subtotal || 0,
      totalImpuesto: totalImpuesto || 0,
      totalDescuento: totalDescuento || 0,
      total: total || 0,
      exchangeRate: exchangeRate || 1,
      currency: currency || 'CRC',
      
      // Condiciones de venta y pago
      condicionVenta: condicionVenta || '01',
      paymentTerm: paymentTerm || '01',
      paymentMethod: paymentMethod || '01',
      
      // Notas
      notes: notes || '',
      
      // Items del tiquete
      items: items || [],
      
      // Campos de auditoría
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    // Crear documento en Firestore
    const docRef = await addDoc(collection(db, 'tickets'), ticketData)

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
      consecutivo,
      message: 'Tiquete creado exitosamente'
    })

  } catch (error) {
    console.error('Error al crear tiquete:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
