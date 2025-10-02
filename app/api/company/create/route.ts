/**
 * API Route para crear empresas
 * POST /api/company/create
 */

import { NextRequest, NextResponse } from 'next/server'
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore'
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { firebaseConfig, Tenant } from '@/lib/firebase-config'
import { EncryptionService } from '@/lib/encryption'

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const auth = getAuth(app)

export async function POST(request: NextRequest) {
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      return NextResponse.json(
        { message: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      personalInfo,
      atvCredentials,
      certificate,
      primaryColor = '#10b981'
    } = body

    // Validaciones básicas
    if (!personalInfo || !atvCredentials || !certificate) {
      return NextResponse.json(
        { message: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Encriptar datos sensibles
    const masterPassword = EncryptionService.getMasterPassword()
    
    const encryptedAtvPassword = await EncryptionService.encrypt(
      atvCredentials.password,
      masterPassword
    )
    
    const encryptedCertPassword = await EncryptionService.encrypt(
      certificate.password,
      masterPassword
    )

    // Preparar datos de la empresa
    const companyData: Omit<Tenant, 'id'> = {
      name: personalInfo.commercialName,
      legalName: personalInfo.legalName,
      taxId: personalInfo.taxId,
      taxIdType: personalInfo.taxIdType,
      commercialActivity: personalInfo.commercialActivity || 'Actividad comercial no especificada',
      province: personalInfo.province,
      canton: personalInfo.canton,
      district: personalInfo.district,
      barrio: personalInfo.barrio,
      address: `${personalInfo.province}, ${personalInfo.canton}, ${personalInfo.district}${personalInfo.barrio ? `, ${personalInfo.barrio}` : ''}`,
      phone: personalInfo.phone,
      email: personalInfo.email,
      primaryColor: primaryColor,
      logo: personalInfo.logo ? await convertFileToBase64(personalInfo.logo) : undefined,
      atvCredentials: {
        username: atvCredentials.username,
        password: encryptedAtvPassword,
        clientId: atvCredentials.clientId,
        receptionUrl: atvCredentials.receptionUrl,
        loginUrl: atvCredentials.loginUrl,
      },
      certificate: {
        fileName: certificate.p12File?.name || '',
        password: encryptedCertPassword,
        isValidated: true, // Ya fue validado en el wizard
        validationDate: new Date(),
      },
      ownerId: currentUser.uid,
      collaborators: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Guardar en Firestore
    const docRef = await addDoc(collection(db, 'tenants'), {
      ...companyData,
      createdAt: Timestamp.fromDate(companyData.createdAt),
      updatedAt: Timestamp.fromDate(companyData.updatedAt),
      certificate: {
        ...companyData.certificate,
        validationDate: Timestamp.fromDate(companyData.certificate.validationDate!),
      },
    })

    return NextResponse.json({
      id: docRef.id,
      message: 'Empresa creada exitosamente'
    })

  } catch (error) {
    console.error('Error creating company:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * Convierte un archivo a base64
 */
async function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
