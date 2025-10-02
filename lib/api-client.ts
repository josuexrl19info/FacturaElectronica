/**
 * Cliente API para comunicación con endpoints de Firebase
 * 
 * Este módulo proporciona funciones para interactuar con las API routes
 * que manejan las operaciones de Firebase de forma centralizada.
 */

import { UserProfile } from './firebase-config'

/**
 * Cliente base para realizar peticiones HTTP
 */
class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_URL || ''
      : ''
  }

  /**
   * Realiza una petición GET
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin)
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error en la petición')
    }

    return response.json()
  }

  /**
   * Realiza una petición POST
   */
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error en la petición')
    }

    return response.json()
  }

  /**
   * Realiza una petición PUT
   */
  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error en la petición')
    }

    return response.json()
  }

  /**
   * Realiza una petición DELETE
   */
  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error en la petición')
    }

    return response.json()
  }
}

// Instancia del cliente
const apiClient = new ApiClient()

/**
 * Servicio para gestión de usuarios
 */
export const usersApi = {
  /**
   * Obtiene todos los usuarios de un tenant
   */
  async getUsers(tenantId: string): Promise<{ users: UserProfile[] }> {
    return apiClient.get<{ users: UserProfile[] }>('/api/users', { tenantId })
  },

  /**
   * Obtiene un usuario específico por ID
   */
  async getUser(userId: string): Promise<{ user: UserProfile }> {
    return apiClient.get<{ user: UserProfile }>(`/api/users/${userId}`)
  },

  /**
   * Crea un nuevo usuario
   */
  async createUser(userData: {
    name: string
    email: string
    roleId: string
    tenantId: string
    status?: 'active' | 'inactive'
    profile?: any
  }): Promise<{ id: string; message: string }> {
    return apiClient.post<{ id: string; message: string }>('/api/users', userData)
  },

  /**
   * Actualiza un usuario
   */
  async updateUser(userId: string, userData: Partial<UserProfile>): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(`/api/users/${userId}`, userData)
  },

  /**
   * Elimina un usuario
   */
  async deleteUser(userId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/api/users/${userId}`)
  }
}

/**
 * Servicio para gestión del perfil
 */
export const profileApi = {
  /**
   * Obtiene el perfil del usuario actual
   */
  async getProfile(userId: string): Promise<{ profile: UserProfile }> {
    return apiClient.get<{ profile: UserProfile }>('/api/profile', { userId })
  },

  /**
   * Actualiza el perfil del usuario actual
   */
  async updateProfile(userId: string, profileData: Partial<UserProfile>): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/api/profile', profileData, { userId })
  }
}

/**
 * Servicio para gestión de contraseñas
 */
export const passwordApi = {
  /**
   * Envía email de restablecimiento de contraseña
   */
  async sendPasswordResetEmail(): Promise<{ message: string }> {
    // Esta funcionalidad se mantiene en el cliente porque requiere Firebase Auth
    // No se puede hacer desde el servidor sin exponer credenciales
    throw new Error('Esta funcionalidad debe implementarse en el cliente')
  }
}
