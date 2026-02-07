import { OpenAPISpec, Environment, RequestHistory, SavedRequest } from '../types'
import { STORAGE_CONSTANTS } from './constants'

export class StorageManager {
  private static instance: StorageManager
  
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  // OpenAPI仕様の管理
  async saveOpenApiSpec(spec: OpenAPISpec): Promise<void> {
    try {
      const specs = await this.getOpenApiSpecs()
      const existingIndex = specs.findIndex(s => s.id === spec.id)
      
      if (existingIndex >= 0) {
        specs[existingIndex] = { ...spec, updatedAt: new Date() }
      } else {
        specs.push(spec)
      }
      
      await chrome.storage.local.set({ openApiSpecs: specs })
    } catch (error) {
      console.error('Failed to save OpenAPI spec:', error)
      throw new Error('Failed to save OpenAPI specification')
    }
  }

  async getOpenApiSpecs(): Promise<OpenAPISpec[]> {
    try {
      const result = await chrome.storage.local.get(['openApiSpecs'])
      return (result.openApiSpecs as OpenAPISpec[] | undefined) || []
    } catch (error) {
      console.error('Failed to get OpenAPI specs:', error)
      return []
    }
  }

  async deleteOpenApiSpec(id: string): Promise<void> {
    try {
      const specs = await this.getOpenApiSpecs()
      const filteredSpecs = specs.filter(spec => spec.id !== id)
      await chrome.storage.local.set({ openApiSpecs: filteredSpecs })
    } catch (error) {
      console.error('Failed to delete OpenAPI spec:', error)
      throw new Error('Failed to delete OpenAPI specification')
    }
  }

  // 環境プリセットの管理
  async saveEnvironment(env: Environment): Promise<void> {
    try {
      const environments = await this.getEnvironments()
      const existingIndex = environments.findIndex(e => e.id === env.id)
      
      // デフォルト環境の設定
      if (env.isDefault) {
        environments.forEach(e => e.isDefault = false)
      }
      
      if (existingIndex >= 0) {
        environments[existingIndex] = env
      } else {
        environments.push(env)
      }
      
      await chrome.storage.local.set({ [STORAGE_CONSTANTS.STORAGE_KEYS.ENVIRONMENTS]: environments })
    } catch (error) {
      console.error('Failed to save environment:', error)
      throw new Error('Failed to save environment')
    }
  }

  async getEnvironments(): Promise<Environment[]> {
    try {
      const result = await chrome.storage.local.get([STORAGE_CONSTANTS.STORAGE_KEYS.ENVIRONMENTS])
      return (result[STORAGE_CONSTANTS.STORAGE_KEYS.ENVIRONMENTS] as Environment[] | undefined) || []
    } catch (error) {
      console.error('Failed to get environments:', error)
      return []
    }
  }

  async deleteEnvironment(id: string): Promise<void> {
    try {
      const environments = await this.getEnvironments()
      const filteredEnvironments = environments.filter(env => env.id !== id)
      await chrome.storage.local.set({ [STORAGE_CONSTANTS.STORAGE_KEYS.ENVIRONMENTS]: filteredEnvironments })
    } catch (error) {
      console.error('Failed to delete environment:', error)
      throw new Error('Failed to delete environment')
    }
  }

  async getDefaultEnvironment(): Promise<Environment | null> {
    try {
      const environments = await this.getEnvironments()
      return environments.find(env => env.isDefault) || null
    } catch (error) {
      console.error('Failed to get default environment:', error)
      return null
    }
  }

  // リクエスト履歴の管理
  async saveRequestHistory(history: RequestHistory): Promise<void> {
    try {
      const histories = await this.getRequestHistory(STORAGE_CONSTANTS.MAX_HISTORY_ITEMS)
      const newHistories = [history, ...histories]
      await chrome.storage.local.set({ [STORAGE_CONSTANTS.STORAGE_KEYS.REQUEST_HISTORY]: newHistories })
    } catch (error) {
      console.error('Failed to save request history:', error)
      throw new Error('Failed to save request history')
    }
  }

  async getRequestHistory(limit = 50): Promise<RequestHistory[]> {
    try {
      const result = await chrome.storage.local.get([STORAGE_CONSTANTS.STORAGE_KEYS.REQUEST_HISTORY])
      const histories = (result[STORAGE_CONSTANTS.STORAGE_KEYS.REQUEST_HISTORY] as RequestHistory[] | undefined) || []
      return histories.slice(0, limit)
    } catch (error) {
      console.error('Failed to get request history:', error)
      return []
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({ [STORAGE_CONSTANTS.STORAGE_KEYS.REQUEST_HISTORY]: [] })
    } catch (error) {
      console.error('Failed to clear history:', error)
      throw new Error('Failed to clear request history')
    }
  }

  // 選択された環境の管理
  async saveSelectedEnvironment(environmentId: string): Promise<void> {
    try {
      await chrome.storage.local.set({ selectedEnvironmentId: environmentId })
    } catch (error) {
      console.error('Failed to save selected environment:', error)
      throw new Error('Failed to save selected environment')
    }
  }

  async getSelectedEnvironmentId(): Promise<string | null> {
    try {
      const result = await chrome.storage.local.get(['selectedEnvironmentId'])
      return (result.selectedEnvironmentId as string | undefined) || null
    } catch (error) {
      console.error('Failed to get selected environment:', error)
      return null
    }
  }

  // ストレージ使用量取得
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    try {
      const usage = await chrome.storage.local.getBytesInUse()
      return {
        used: usage,
        quota: chrome.storage.local.QUOTA_BYTES
      }
    } catch (error) {
      console.error('Failed to get storage usage:', error)
      return { used: 0, quota: 0 }
    }
  }

  // 保存されたリクエストの管理
  async saveSavedRequest(savedRequest: SavedRequest): Promise<void> {
    try {
      const savedRequests = await this.getSavedRequests()
      const existingIndex = savedRequests.findIndex(req => req.id === savedRequest.id)
      
      if (existingIndex >= 0) {
        savedRequests[existingIndex] = { ...savedRequest, updatedAt: new Date() }
      } else {
        savedRequests.push(savedRequest)
      }
      
      await chrome.storage.local.set({ [STORAGE_CONSTANTS.STORAGE_KEYS.SAVED_REQUESTS]: savedRequests })
    } catch (error) {
      console.error('Failed to save request:', error)
      throw new Error('Failed to save request')
    }
  }

  async getSavedRequests(): Promise<SavedRequest[]> {
    try {
      const result = await chrome.storage.local.get([STORAGE_CONSTANTS.STORAGE_KEYS.SAVED_REQUESTS])
      return (result[STORAGE_CONSTANTS.STORAGE_KEYS.SAVED_REQUESTS] as SavedRequest[] | undefined) || []
    } catch (error) {
      console.error('Failed to get saved requests:', error)
      return []
    }
  }

  async getSavedRequestsBySpec(specId: string): Promise<SavedRequest[]> {
    try {
      const savedRequests = await this.getSavedRequests()
      return savedRequests.filter(req => req.specId === specId)
    } catch (error) {
      console.error('Failed to get saved requests by spec:', error)
      return []
    }
  }

  async getSavedRequestByEndpoint(specId: string, endpointKey: string): Promise<SavedRequest | null> {
    try {
      const savedRequests = await this.getSavedRequests()
      return savedRequests.find(req => req.specId === specId && req.endpointKey === endpointKey) || null
    } catch (error) {
      console.error('Failed to get saved request by endpoint:', error)
      return null
    }
  }

  async deleteSavedRequest(id: string): Promise<void> {
    try {
      const savedRequests = await this.getSavedRequests()
      const filteredRequests = savedRequests.filter(req => req.id !== id)
      await chrome.storage.local.set({ [STORAGE_CONSTANTS.STORAGE_KEYS.SAVED_REQUESTS]: filteredRequests })
    } catch (error) {
      console.error('Failed to delete saved request:', error)
      throw new Error('Failed to delete saved request')
    }
  }

  // 全データクリア（開発用）
  async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear()
    } catch (error) {
      console.error('Failed to clear all data:', error)
      throw new Error('Failed to clear all data')
    }
  }
}