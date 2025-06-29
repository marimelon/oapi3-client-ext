// ユーティリティ関数

// デバッグログ制御
const DEBUG = import.meta.env.DEV

export function debugLog(message: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`🔍 ${message}`, ...args)
  }
}

export function debugWarn(message: string, ...args: any[]) {
  if (DEBUG) {
    console.warn(`⚠️ ${message}`, ...args)
  }
}

export function debugError(message: string, ...args: any[]) {
  if (DEBUG) {
    console.error(`❌ ${message}`, ...args)
  }
}

// UUIDv4生成
export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 日付フォーマット
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

// JSONの安全なパース
export function safeJsonParse(jsonString: string): any {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.error('JSON parse error:', error)
    return null
  }
}

// JSONの安全な文字列化
export function safeJsonStringify(obj: any, space?: number): string {
  try {
    return JSON.stringify(obj, null, space)
  } catch (error) {
    console.error('JSON stringify error:', error)
    return ''
  }
}

// HTTPメソッドの色分け
export function getMethodColor(method: string): string {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-green-600 bg-green-50'
    case 'POST':
      return 'text-blue-600 bg-blue-50'
    case 'PUT':
      return 'text-orange-600 bg-orange-50'
    case 'DELETE':
      return 'text-red-600 bg-red-50'
    case 'PATCH':
      return 'text-purple-600 bg-purple-50'
    case 'HEAD':
      return 'text-gray-600 bg-gray-50'
    case 'OPTIONS':
      return 'text-yellow-600 bg-yellow-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

// ステータスコードの色分け
export function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) {
    return 'text-green-600 bg-green-50'
  } else if (status >= 300 && status < 400) {
    return 'text-blue-600 bg-blue-50'
  } else if (status >= 400 && status < 500) {
    return 'text-orange-600 bg-orange-50'
  } else if (status >= 500) {
    return 'text-red-600 bg-red-50'
  }
  return 'text-gray-600 bg-gray-50'
}

// URLバリデーション
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ファイル拡張子チェック
export function isOpenApiFile(filename: string): boolean {
  const extension = filename.toLowerCase().split('.').pop()
  return ['json', 'yaml', 'yml'].includes(extension || '')
}

// バイト数を人間読みやすい形式に変換
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// デバウンス関数
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  
  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// エラーメッセージの取得
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unknown error occurred'
}

// パスパラメータの抽出
export function extractPathParameters(path: string): string[] {
  const matches = path.match(/\{([^}]+)\}/g)
  if (!matches) return []
  
  return matches.map(match => match.slice(1, -1)) // {}を除去
}

// パスパラメータの置換
export function replacePathParameters(path: string, params: Record<string, string>): string {
  let result = path
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, encodeURIComponent(value))
  })
  return result
}

// パスパラメータの必須チェック
export function validatePathParameters(path: string, params: Record<string, string>): { valid: boolean; missing: string[] } {
  const requiredParams = extractPathParameters(path)
  const missing = requiredParams.filter(param => !params[param] || params[param].trim() === '')
  
  return {
    valid: missing.length === 0,
    missing
  }
}

// URLプレビュー生成
export function buildUrlPreview(baseUrl: string, path: string, pathParams: Record<string, string>, queryParams: Record<string, string>): string {
  try {
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
    const pathWithParams = replacePathParameters(path, pathParams)
    let fullUrl = normalizedBaseUrl + pathWithParams
    
    const validQueryParams = Object.entries(queryParams).filter(([key, value]) => 
      key.trim() !== '' && value.trim() !== ''
    )
    
    if (validQueryParams.length > 0) {
      const queryString = validQueryParams
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
      fullUrl += `?${queryString}`
    }
    
    return fullUrl
  } catch (error) {
    return `${baseUrl}${path}`
  }
}