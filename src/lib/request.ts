import { RequestHistory } from '../types'
import { generateId } from './utils'
import { safeJsonStringify, safeJsonParse } from './json'
import { headerModifier } from './headerModifier'

export interface RequestConfig {
  method: string
  url: string
  headers?: Record<string, string>
  body?: any
  timeout?: number
}

export interface RequestResult {
  success: boolean
  status?: number
  statusText?: string
  headers?: Record<string, string>
  data?: any
  error?: string
  duration?: number
}

export class RequestBuilder {
  private static instance: RequestBuilder
  
  public static getInstance(): RequestBuilder {
    if (!RequestBuilder.instance) {
      RequestBuilder.instance = new RequestBuilder()
    }
    return RequestBuilder.instance
  }

  // リクエストURL構築
  buildUrl(
    baseUrl: string,
    path: string,
    pathParams: Record<string, string> = {},
    queryParams: Record<string, string> = {},
    authQueryParams: Record<string, string> = {}
  ): string {
    try {
      // ベースURLの正規化
      let url = baseUrl.replace(/\/$/, '')

      // パスの正規化
      let normalizedPath = path.startsWith('/') ? path : '/' + path

      // パスパラメータの置換
      for (const [key, value] of Object.entries(pathParams)) {
        normalizedPath = normalizedPath.replace(`{${key}}`, encodeURIComponent(value))
      }

      // URLの結合
      const fullUrl = url + normalizedPath

      // クエリパラメータの追加（auth → 通常、通常が優先）
      const allQueryParams = { ...authQueryParams, ...queryParams }
      if (Object.keys(allQueryParams).length > 0) {
        const urlObj = new URL(fullUrl)
        for (const [key, value] of Object.entries(allQueryParams)) {
          if (value !== undefined && value !== null && value !== '') {
            urlObj.searchParams.set(key, value)
          }
        }
        return urlObj.toString()
      }

      return fullUrl
    } catch (error) {
      console.error('Failed to build URL:', error)
      throw new Error('Failed to build request URL')
    }
  }

  // リクエストヘッダー構築
  buildHeaders(
    authHeaders: Record<string, string> = {},
    envHeaders: Record<string, string> = {},
    customHeaders: Record<string, string> = {}
  ): Record<string, string> {
    const headers: Record<string, string> = {}

    // 認証ヘッダーを追加（最低優先）
    for (const [key, value] of Object.entries(authHeaders)) {
      if (value && value.trim() !== '') {
        headers[key] = value.trim()
      }
    }

    // 環境ヘッダーで上書き
    for (const [key, value] of Object.entries(envHeaders)) {
      if (value && value.trim() !== '') {
        headers[key] = value.trim()
      }
    }

    // カスタムヘッダーで上書き（最高優先）
    for (const [key, value] of Object.entries(customHeaders)) {
      if (value && value.trim() !== '') {
        headers[key] = value.trim()
      }
    }

    return headers
  }

  // リクエスト実行
  async executeRequest(config: RequestConfig): Promise<RequestResult> {
    const startTime = Date.now()
    
    try {
      // Restricted headers (User-Agent, etc.) setup via declarativeNetRequest if available
      if (config.headers && headerModifier.isDeclarativeNetRequestAvailable()) {
        const restrictedHeaders = headerModifier.getRestrictedHeaders(config.headers)
        if (Object.keys(restrictedHeaders).length > 0) {
          try {
            await headerModifier.setupHeaderModification({
              url: config.url,
              headers: restrictedHeaders,
              method: config.method
            })
          } catch (error) {
            console.warn('Failed to setup header modification:', error)
          }
        }
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), config.timeout || 30000)

      // Use only non-restricted headers for fetch API
      const fetchHeaders = config.headers 
        ? headerModifier.getNormalHeaders(config.headers)
        : undefined

      const fetchOptions: RequestInit = {
        method: config.method,
        headers: fetchHeaders,
        signal: controller.signal
      }

      // リクエストボディの設定
      if (config.body !== undefined && config.method !== 'GET' && config.method !== 'HEAD') {
        if (typeof config.body === 'string') {
          fetchOptions.body = config.body
        } else {
          fetchOptions.body = safeJsonStringify(config.body)
          // Content-Typeが設定されていない場合はJSONを設定
          if (fetchOptions.headers && !Object.keys(fetchOptions.headers).some(key => 
            key.toLowerCase() === 'content-type'
          )) {
            (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json'
          }
        }
      }

      const response = await fetch(config.url, fetchOptions)
      clearTimeout(timeoutId)

      const duration = Date.now() - startTime
      const responseHeaders = this.extractHeaders(response.headers)
      
      // レスポンスボディの処理
      let responseData: any
      const contentType = response.headers.get('content-type') || ''
      
      if (contentType.includes('application/json')) {
        try {
          const text = await response.text()
          responseData = text ? safeJsonParse(text) : null
        } catch {
          responseData = await response.text()
        }
      } else {
        responseData = await response.text()
      }

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        duration
      }

    } catch (error) {
      // Clean up declarativeNetRequest rules on error
      if (headerModifier.isDeclarativeNetRequestAvailable()) {
        headerModifier.clearRules().catch(console.warn)
      }
      
      const duration = Date.now() - startTime
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout',
            duration
          }
        }
        return {
          success: false,
          error: error.message,
          duration
        }
      }
      
      return {
        success: false,
        error: 'Unknown error occurred',
        duration
      }
    }
  }

  // レスポンスヘッダーの抽出
  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  // リクエスト履歴エントリの作成
  createHistoryEntry(
    specId: string,
    environmentId: string,
    method: string,
    endpoint: string,
    parameters: Record<string, any>,
    headers: Record<string, string>,
    body: any,
    result: RequestResult
  ): RequestHistory {
    return {
      id: generateId(),
      specId,
      environmentId,
      method,
      endpoint,
      parameters,
      headers,
      body,
      response: {
        status: result.status || 0,
        headers: result.headers || {},
        body: result.data,
        timestamp: new Date()
      },
      timestamp: new Date()
    }
  }

  // cURLコマンド生成
  generateCurlCommand(config: RequestConfig): string {
    let curl = `curl -X ${config.method}`
    
    // ヘッダーの追加
    if (config.headers) {
      for (const [key, value] of Object.entries(config.headers)) {
        curl += ` -H "${key}: ${value}"`
      }
    }
    
    // ボディの追加
    if (config.body && config.method !== 'GET' && config.method !== 'HEAD') {
      const bodyStr = typeof config.body === 'string' 
        ? config.body 
        : safeJsonStringify(config.body)
      curl += ` -d '${bodyStr.replace(/'/g, "'\\''")}' `
    }
    
    curl += ` "${config.url}"`
    
    return curl
  }

  // レスポンスの整形
  formatResponse(result: RequestResult): {
    statusInfo: string
    headersFormatted: string
    bodyFormatted: string
  } {
    const statusInfo = result.status 
      ? `${result.status} ${result.statusText || ''}`
      : 'No response'

    const headersFormatted = result.headers 
      ? Object.entries(result.headers)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      : 'No headers'

    let bodyFormatted = 'No response body'
    if (result.data !== undefined) {
      if (typeof result.data === 'object') {
        bodyFormatted = safeJsonStringify(result.data, 2)
      } else {
        bodyFormatted = String(result.data)
      }
    }

    return {
      statusInfo,
      headersFormatted,
      bodyFormatted
    }
  }

  // パラメータの検証
  validateParameters(
    pathParams: Record<string, string>,
    requiredPathParams: string[] = [],
    queryParams: Record<string, string> = {},
    requiredQueryParams: string[] = []
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 必須パスパラメータのチェック
    for (const param of requiredPathParams) {
      if (!pathParams[param] || pathParams[param].trim() === '') {
        errors.push(`Required path parameter '${param}' is missing`)
      }
    }

    // 必須クエリパラメータのチェック
    for (const param of requiredQueryParams) {
      if (!queryParams[param] || queryParams[param].trim() === '') {
        errors.push(`Required query parameter '${param}' is missing`)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // Content-Typeの推測
  inferContentType(body: any): string {
    if (typeof body === 'string') {
      try {
        JSON.parse(body)
        return 'application/json'
      } catch {
        return 'text/plain'
      }
    }
    
    if (typeof body === 'object') {
      return 'application/json'
    }
    
    return 'text/plain'
  }
}