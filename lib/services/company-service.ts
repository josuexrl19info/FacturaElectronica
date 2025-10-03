/**
 * Servicio para gestión de empresas (tenants)
 * Maneja la creación, actualización y consulta de empresas en Firestore
 */

import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { initializeApp, getApps } from 'firebase/app'
import { firebaseConfig, Tenant } from '@/lib/firebase-config'
import { CompanyWizardData } from '@/lib/company-wizard-types'
import { EncryptionService } from '@/lib/encryption'

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const auth = getAuth(app)

export interface CreateCompanyRequest {
  wizardData: CompanyWizardData
  primaryColor?: string
  userId: string
}

export interface CreateCompanyResponse {
  id: string
  message: string
  company: Tenant
}

export interface UpdateCompanyRequest {
  id: string
  updates: Partial<Tenant>
}

export class CompanyService {
  private static readonly COLLECTION_NAME = 'companies'

  /**
   * Crea una nueva empresa desde los datos del wizard
   */
  static async createCompany(request: CreateCompanyRequest): Promise<CreateCompanyResponse> {
    try {
      const { wizardData, primaryColor = '#007bff', userId } = request
      const { personalInfo, atvCredentials, certificate } = wizardData

      // Validaciones básicas
      this.validateCreateRequest(wizardData)

      // Obtener datos del usuario desde Firestore usando el cliente
      const userDocRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        throw new Error('Usuario no encontrado')
      }

      const userData = userDoc.data()
      if (!userData) {
        throw new Error('Datos del usuario no disponibles')
      }

      // Encriptar datos sensibles
      const masterPassword = EncryptionService.getMasterPassword()
      
        // Debug: Verificar datos del certificado
        console.log('🔍 Debug certificado completo:', {
          certificate: certificate,
          certificateInfo: certificate.certificateInfo,
          hasCertificateInfo: !!certificate.certificateInfo,
          subject: certificate.certificateInfo?.subject,
          issuer: certificate.certificateInfo?.issuer,
          serialNumber: certificate.certificateInfo?.serialNumber,
          validFrom: certificate.certificateInfo?.validFrom,
          validTo: certificate.certificateInfo?.validTo
        })
      
      console.log('🔐 Debug encriptación:', {
        masterPassword: masterPassword ? 'Definida' : 'No definida',
        atvPasswordOriginal: atvCredentials.password,
        certPasswordOriginal: certificate.password
      })

      const encryptedAtvPassword = await EncryptionService.encrypt(
        atvCredentials.password,
        masterPassword
      )
      const encryptedCertPassword = await EncryptionService.encrypt(
        certificate.password,
        masterPassword
      )

      console.log('🔐 Resultado encriptación:', {
        atvPasswordEncrypted: encryptedAtvPassword,
        certPasswordEncrypted: encryptedCertPassword,
        atvPasswordLength: encryptedAtvPassword?.length,
        certPasswordLength: encryptedCertPassword?.length
      })

      // Usar tenantId del usuario o generar uno nuevo
      const tenantId = userData.tenantId || this.generateTenantId()

      // Preparar datos de la empresa según la estructura REAL de Firestore
      const companyData: Omit<Tenant, 'id'> = {
        name: personalInfo.legalName, // Razón Social
        nombreComercial: personalInfo.name, // Nombre Comercial
        identification: personalInfo.taxId.replace(/[-\s]/g, ''), // Cédula sin guiones
        identificationType: personalInfo.taxIdType === 'fisica' ? '01' : '02', // 01=física, 02=jurídica
        phone: personalInfo.phone, // Número de teléfono
      phoneCountryCode: personalInfo.phoneCountryCode.replace('+', ''), // Código de país sin +
      email: personalInfo.email,
      // Usar directamente los códigos que vienen del wizard (ya son códigos, no nombres)
      province: personalInfo.province || '1',
      canton: personalInfo.canton || '101', 
      district: personalInfo.district || '10101',
      barrio: personalInfo.barrio || '',
        otrasSenas: personalInfo.barrio || '', // Dirección específica
        brandColor: primaryColor,
        status: 'Activa',
        isDefault: false, // No será por defecto inicialmente
        tenantId: tenantId,
        proveedorSistemas: personalInfo.taxId.replace(/[-\s]/g, ''), // Mismo que identification
        registroFiscal8707: '', // Vacío inicialmente
        
        // Logo como objeto con metadata
        logo: (personalInfo as any).logoBase64 ? {
          fileName: personalInfo.logo?.name || 'logo.png',
          type: personalInfo.logo?.type || 'image/png',
          size: personalInfo.logo?.size || 0,
          fileData: (personalInfo as any).logoBase64
        } : undefined,
        
        // Actividad económica (desde la selección del usuario)
        economicActivity: personalInfo.economicActivity ? {
          codigo: personalInfo.economicActivity.codigo,
          descripcion: personalInfo.economicActivity.descripcion,
          estado: personalInfo.economicActivity.estado
        } : {
          codigo: '620100', // Código por defecto para servicios de software
          descripcion: 'DESARROLLO DE SOFTWARE',
          estado: 'A'
        },
        
        // Credenciales ATV encriptadas
        atvCredentials: {
          username: atvCredentials.username,
          password: encryptedAtvPassword,
          clientId: atvCredentials.clientId,
          environment: 'sandbox', // Por defecto sandbox
          receptionUrl: atvCredentials.receptionUrl,
          authUrl: atvCredentials.loginUrl, // authUrl en lugar de loginUrl
        },
        
        // Certificado digital encriptado
        certificadoDigital: {
          fileName: certificate.p12File?.name || '',
          password: encryptedCertPassword,
          fileData: (certificate as any).p12FileData || '',
          subject: certificate.certificateInfo?.subject || '',
          issuer: certificate.certificateInfo?.issuer || '',
          serialNumber: certificate.certificateInfo?.serialNumber || '',
          validFrom: certificate.certificateInfo?.validFrom || '',
          validTo: certificate.certificateInfo?.validTo || '',
          isActive: true,
        },
        
        // Campos del sistema
        createdBy: userId,
        updatedBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Convertir fechas a Timestamp para Firestore
      const firestoreData = {
        ...companyData,
        createdAt: Timestamp.fromDate(companyData.createdAt),
        updatedAt: Timestamp.fromDate(companyData.updatedAt),
      }

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), firestoreData)

      // Crear objeto de respuesta
      const createdCompany: Tenant = {
        id: docRef.id,
        ...companyData,
      }

      return {
        id: docRef.id,
        message: 'Empresa creada exitosamente',
        company: createdCompany
      }

    } catch (error) {
      console.error('Error creating company:', error)
      throw new Error(`Error al crear la empresa: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  /**
   * Obtiene una empresa por ID
   */
  static async getCompanyById(id: string): Promise<Tenant | null> {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      const data = docSnap.data()
      return this.convertFirestoreToTenant(docSnap.id, data)

    } catch (error) {
      console.error('Error getting company:', error)
      throw new Error('Error al obtener la empresa')
    }
  }

  /**
   * Obtiene todas las empresas de un usuario
   */
  static async getCompaniesByOwner(ownerId: string): Promise<Tenant[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('ownerId', '==', ownerId)
      )
      
      const querySnapshot = await getDocs(q)
      const companies: Tenant[] = []

      querySnapshot.forEach((doc) => {
        companies.push(this.convertFirestoreToTenant(doc.id, doc.data()))
      })

      return companies

    } catch (error) {
      console.error('Error getting companies:', error)
      throw new Error('Error al obtener las empresas')
    }
  }

  /**
   * Actualiza una empresa existente
   */
  static async updateCompany(request: UpdateCompanyRequest): Promise<void> {
    try {
      const { id, updates } = request
      
      // Encriptar contraseñas si están presentes
      if (updates.atvCredentials?.password) {
        const masterPassword = EncryptionService.getMasterPassword()
        updates.atvCredentials.password = await EncryptionService.encrypt(
          updates.atvCredentials.password,
          masterPassword
        )
      }

      if (updates.certificate?.password) {
        const masterPassword = EncryptionService.getMasterPassword()
        updates.certificate.password = await EncryptionService.encrypt(
          updates.certificate.password,
          masterPassword
        )
      }

      // Agregar timestamp de actualización
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now(),
      }

      // Convertir fechas a Timestamp si es necesario
      if (updateData.certificate?.validationDate) {
        updateData.certificate.validationDate = Timestamp.fromDate(
          new Date(updateData.certificate.validationDate)
        )
      }

      const docRef = doc(db, this.COLLECTION_NAME, id)
      await updateDoc(docRef, updateData)

    } catch (error) {
      console.error('Error updating company:', error)
      throw new Error('Error al actualizar la empresa')
    }
  }

  /**
   * Valida los datos de creación de empresa
   */
  private static validateCreateRequest(wizardData: CompanyWizardData): void {
    const { personalInfo, atvCredentials, certificate } = wizardData

    // Validar información personal
    if (!personalInfo.legalName?.trim()) {
      throw new Error('La razón social es requerida')
    }
    if (!personalInfo.name?.trim()) {
      throw new Error('El nombre comercial es requerido')
    }
    if (!personalInfo.taxId?.trim()) {
      throw new Error('La cédula es requerida')
    }
    if (!personalInfo.email?.trim()) {
      throw new Error('El correo electrónico es requerido')
    }
    if (!personalInfo.phone?.trim()) {
      throw new Error('El teléfono es requerido')
    }
    if (!personalInfo.province?.trim()) {
      throw new Error('La provincia es requerida')
    }
    if (!personalInfo.canton?.trim()) {
      throw new Error('El cantón es requerido')
    }
    if (!personalInfo.district?.trim()) {
      throw new Error('El distrito es requerido')
    }

    // Validar credenciales ATV
    if (!atvCredentials.username?.trim()) {
      throw new Error('El usuario ATV es requerido')
    }
    if (!atvCredentials.password?.trim()) {
      throw new Error('La contraseña ATV es requerida')
    }
    if (!atvCredentials.clientId?.trim()) {
      throw new Error('El Client ID es requerido')
    }
    if (!atvCredentials.receptionUrl?.trim()) {
      throw new Error('La URL de recepción es requerida')
    }
    if (!atvCredentials.loginUrl?.trim()) {
      throw new Error('La URL de login es requerida')
    }

    // Validar certificado
    if (!certificate.p12File) {
      throw new Error('El archivo de certificado es requerido')
    }
    if (!certificate.password?.trim()) {
      throw new Error('La clave del certificado es requerida')
    }
  }

  /**
   * Construye la dirección completa
   */
  private static buildFullAddress(personalInfo: CompanyWizardData['personalInfo']): string {
    const parts = [
      personalInfo.province,
      personalInfo.canton,
      personalInfo.district
    ]
    
    if (personalInfo.barrio?.trim()) {
      parts.push(personalInfo.barrio)
    }
    
    return parts.join(', ')
  }

  /**
   * Genera un tenantId único
   */
  private static generateTenantId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  /**
   * Extrae el número de teléfono sin código de país
   */
  private static extractPhoneNumber(phone: string): string {
    // Remover código de país y espacios
    return phone.replace(/^\+\d{1,3}\s?/, '').replace(/\s/g, '')
  }

  /**
   * Extrae el código de país del teléfono
   */
  private static extractCountryCode(phone: string): string {
    const match = phone.match(/^\+(\d{1,3})/)
    return match ? match[1] : '506' // Por defecto Costa Rica
  }

  /**
   * Convierte el nombre de provincia a código (fallback simple)
   */
  private static getProvinceCode(provinceName: string): string {
    // Si ya viene como código, devolverlo tal como está
    if (/^\d+$/.test(provinceName)) {
      return provinceName
    }
    
    // Mapeo básico como fallback
    const provinceMap: { [key: string]: string } = {
      'San José': '1',
      'Alajuela': '2',
      'Cartago': '3',
      'Heredia': '4',
      'Guanacaste': '5',
      'Puntarenas': '6',
      'Limón': '7'
    }
    return provinceMap[provinceName] || '1'
  }

  /**
   * Convierte el nombre de cantón a código (fallback simple)
   */
  private static getCantonCode(cantonName: string): string {
    // Si ya viene como código, devolverlo tal como está
    if (/^\d+$/.test(cantonName)) {
      return cantonName
    }
    
    // Por defecto, usar código de San José Central
    return '101'
  }

  /**
   * Convierte el nombre de distrito a código (fallback simple)
   */
  private static getDistrictCode(districtName: string): string {
    // Si ya viene como código, devolverlo tal como está
    if (/^\d+$/.test(districtName)) {
      return districtName
    }
    
    // Por defecto, usar código de Carmen (San José)
    return '10101'
  }


  /**
   * Convierte un documento de Firestore a Tenant
   */
  private static convertFirestoreToTenant(id: string, data: DocumentData): Tenant {
    return {
      id,
      name: data.name,
      nombreComercial: data.nombreComercial,
      identification: data.identification,
      identificationType: data.identificationType,
      phone: data.phone,
      phoneCountryCode: data.phoneCountryCode,
      email: data.email,
      province: data.province,
      canton: data.canton,
      district: data.district,
      barrio: data.barrio,
      otrasSenas: data.otrasSenas,
      brandColor: data.brandColor,
      status: data.status,
      isDefault: data.isDefault,
      tenantId: data.tenantId,
      proveedorSistemas: data.proveedorSistemas,
      registroFiscal8707: data.registroFiscal8707,
      logo: data.logo,
      economicActivity: data.economicActivity,
      atvCredentials: data.atvCredentials,
      certificadoDigital: data.certificadoDigital,
      createdBy: data.createdBy,
      updatedBy: data.updatedBy,
      createdAt: data.createdAt?.toDate?.() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    }
  }

  /**
   * Desencripta las credenciales ATV de una empresa
   */
  static async decryptATVCredentials(company: Tenant): Promise<{ username: string; password: string }> {
    try {
      const masterPassword = EncryptionService.getMasterPassword()
      const decryptedPassword = await EncryptionService.decrypt(
        company.atvCredentials.password,
        masterPassword
      )

      return {
        username: company.atvCredentials.username,
        password: decryptedPassword
      }
    } catch (error) {
      console.error('Error decrypting ATV credentials:', error)
      throw new Error('Error al desencriptar las credenciales ATV')
    }
  }

  /**
   * Desencripta la clave del certificado de una empresa
   */
  static async decryptCertificatePassword(company: Tenant): Promise<string> {
    try {
      const masterPassword = EncryptionService.getMasterPassword()
      return await EncryptionService.decrypt(
        company.certificadoDigital.password,
        masterPassword
      )
    } catch (error) {
      console.error('Error decrypting certificate password:', error)
      throw new Error('Error al desencriptar la clave del certificado')
    }
  }
}
