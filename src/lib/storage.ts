import { OpenAPISpec, Environment, RequestHistory } from '../types'

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
      return result.openApiSpecs || []
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
      
      await chrome.storage.local.set({ environments })
    } catch (error) {
      console.error('Failed to save environment:', error)
      throw new Error('Failed to save environment')
    }
  }

  async getEnvironments(): Promise<Environment[]> {
    try {
      const result = await chrome.storage.local.get(['environments'])
      return result.environments || []
    } catch (error) {
      console.error('Failed to get environments:', error)
      return []
    }
  }

  async deleteEnvironment(id: string): Promise<void> {
    try {
      const environments = await this.getEnvironments()
      const filteredEnvironments = environments.filter(env => env.id !== id)
      await chrome.storage.local.set({ environments: filteredEnvironments })
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
      const histories = await this.getRequestHistory(49) // 最新49件 + 新規1件 = 50件
      const newHistories = [history, ...histories]
      await chrome.storage.local.set({ requestHistory: newHistories })
    } catch (error) {
      console.error('Failed to save request history:', error)
      throw new Error('Failed to save request history')
    }
  }

  async getRequestHistory(limit = 50): Promise<RequestHistory[]> {
    try {
      const result = await chrome.storage.local.get(['requestHistory'])
      const histories = result.requestHistory || []
      return histories.slice(0, limit)
    } catch (error) {
      console.error('Failed to get request history:', error)
      return []
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await chrome.storage.local.set({ requestHistory: [] })
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
      return result.selectedEnvironmentId || null
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