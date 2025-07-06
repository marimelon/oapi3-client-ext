/**
 * Storage for last request parameters
 * This is used for audit trail functionality
 */

export interface LastRequestParams {
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  headers: Record<string, string>
  body?: any
}

class LastRequestStorage {
  private static instance: LastRequestStorage
  private lastParams: LastRequestParams | null = null

  static getInstance(): LastRequestStorage {
    if (!LastRequestStorage.instance) {
      LastRequestStorage.instance = new LastRequestStorage()
    }
    return LastRequestStorage.instance
  }

  setLastRequestParams(params: LastRequestParams): void {
    this.lastParams = params
  }

  getLastRequestParams(): LastRequestParams | null {
    return this.lastParams
  }

  clear(): void {
    this.lastParams = null
  }
}

export const lastRequestStorage = LastRequestStorage.getInstance()