import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig } from '@/lib/firebase-config'

// Inicializar Firebase si no está ya inicializado
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

/**
 * POST /api/invoices/create
 * Crea una nueva factura en Firestore
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('🔍 API Facturas - Datos recibidos:', body)

    // Los datos ya vienen completos desde handleCreateInvoice
    const { 
      consecutivo,
      status,
      clientId,
      companyId,
      tenantId,
      createdBy,
      condicionVenta,
      paymentTerm,
      paymentMethod,
      notes,
      items,
      subtotal,
      totalImpuesto,
      totalDescuento,
      total,
      exchangeRate,
      currency
    } = body

    // Validar campos requeridos
    if (!clientId || !items || !tenantId || !companyId || !createdBy || !consecutivo) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Preparar datos para Firestore (usar los datos que ya vienen completos)
    const invoiceData = {
      consecutivo,
      status,
      clientId,
      companyId,
      tenantId,
      createdBy,
      
      // Condiciones de venta
      condicionVenta,
      paymentTerm,
      paymentMethod,
      
      // Notas
      notes,
      
      // Totales
      subtotal,
      totalImpuesto,
      totalDescuento,
      total,
      exchangeRate,
      currency,
      
      // Items (ya vienen con la estructura correcta)
      items: items.map((item: any, index: number) => {
        const baseImponible = item.cantidad * item.precioUnitario
        const impuestoMonto = (baseImponible * (item.tarifa || 0)) / 100
        
        return {
          numeroLinea: index + 1,
          codigoCABYS: item.codigoCABYS || '8399000000000',
          cantidad: Number(item.cantidad),
          unidadMedida: item.unidadMedida || 'Sp',
          detalle: item.detalle,
          codigoComercial: '', // Campo requerido por formato real
          unidadMedidaComercial: '', // Campo requerido por formato real
          precioUnitario: Number(item.precioUnitario),
          montoTotal: baseImponible,
          subTotal: baseImponible,
          baseImponible: baseImponible,
          montoTotalLinea: baseImponible + impuestoMonto,
          
          // Impuestos (estructura correcta para Hacienda 4.4)
          impuesto: [{
            codigo: item.tipoImpuesto || '01',
            codigoTarifaIVA: item.codigoTarifa || '08', // Corregido: usar codigoTarifaIVA
            tarifa: Number(item.tarifa) || 13,
            monto: impuestoMonto
          }],
          impuestoAsumidoEmisorFabrica: 0,
          impuestoNeto: impuestoMonto
        }
      }),
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }

    console.log('💾 Creando factura en Firestore:', invoiceData)

    // Crear documento en Firestore
    const docRef = await addDoc(collection(db, 'invoices'), invoiceData)

    console.log('✅ Factura creada exitosamente con ID:', docRef.id)

    return NextResponse.json({
      success: true,
      invoiceId: docRef.id,
      consecutivo,
      message: 'Factura creada exitosamente'
    })

  } catch (error) {
    console.error('❌ Error al crear factura:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
