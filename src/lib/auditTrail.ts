import type { RequestResult } from './request'

// Constants
const SENSITIVE_HEADERS = ['authorization', 'x-api-key', 'api-key', 'token', 'x-auth-token']
const HEADER_INDENT = '  '
const BODY_INDENT = '  '

export interface AuditTrailData {
  timestamp: string
  request: {
    method: string
    url: string
    headers?: Record<string, string>
    body?: any
  }
  response: {
    status: number
    statusText: string
    headers: Record<string, string>
    body: any
    duration: number
  }
}

/**
 * Format audit trail data into a human-readable string
 */
export function formatAuditTrail(data: AuditTrailData): string {
  const lines: string[] = []
  
  lines.push('========== API Request/Response Audit Trail ==========')
  lines.push(`Timestamp: ${data.timestamp}`)
  lines.push('')
  
  // Request section
  lines.push('REQUEST')
  lines.push('-------')
  lines.push(`Method: ${data.request.method}`)
  lines.push(`URL: ${data.request.url}`)
  
  if (data.request.headers && Object.keys(data.request.headers).length > 0) {
    lines.push('Headers:')
    Object.entries(data.request.headers).forEach(([key, value]) => {
      // Mask sensitive headers
      const maskedValue = maskSensitiveHeader(key, value)
      lines.push(`${HEADER_INDENT}${key}: ${maskedValue}`)
    })
  }
  
  if (data.request.body !== undefined) {
    lines.push('Body:')
    const bodyStr = typeof data.request.body === 'string' 
      ? data.request.body 
      : JSON.stringify(data.request.body, null, 2)
    lines.push(formatIndentedBody(bodyStr, BODY_INDENT))
  }
  
  lines.push('')
  
  // Response section
  lines.push('RESPONSE')
  lines.push('--------')
  lines.push(`Status: ${data.response.status} ${data.response.statusText}`)
  lines.push(`Duration: ${data.response.duration}ms`)
  
  if (data.response.headers && Object.keys(data.response.headers).length > 0) {
    lines.push('Headers:')
    Object.entries(data.response.headers).forEach(([key, value]) => {
      lines.push(`${HEADER_INDENT}${key}: ${value}`)
    })
  }
  
  if (data.response.body !== undefined) {
    lines.push('Body:')
    const bodyStr = typeof data.response.body === 'string' 
      ? data.response.body 
      : JSON.stringify(data.response.body, null, 2)
    lines.push(formatIndentedBody(bodyStr, BODY_INDENT))
  }
  
  lines.push('======================================================')
  
  return lines.join('\n')
}

/**
 * Build audit trail data from request configuration and response result
 */
export function buildAuditTrailData(
  method: string,
  url: string,
  headers: Record<string, string> | undefined,
  requestBody: any,
  response: RequestResult
): AuditTrailData | null {
  if (!response.status || response.status === 0) {
    return null
  }
  
  return {
    timestamp: new Date().toISOString(),
    request: {
      method,
      url,
      headers,
      body: requestBody
    },
    response: {
      status: response.status,
      statusText: response.statusText || '',
      headers: response.headers || {},
      body: response.data,
      duration: response.duration || 0
    }
  }
}

/**
 * Mask sensitive header values
 */
function maskSensitiveHeader(key: string, value: string): string {
  const lowerKey = key.toLowerCase()
  if (!SENSITIVE_HEADERS.includes(lowerKey)) {
    return value
  }
  
  // Special handling for Authorization Bearer tokens
  if (lowerKey === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
    return 'Bearer ****'
  }
  
  // Mask other sensitive headers (show first 4 chars if long enough)
  if (value.length > 8) {
    return value.substring(0, 4) + '****'
  }
  
  return '****'
}

/**
 * Format body content with proper indentation
 */
function formatIndentedBody(bodyStr: string, indent: string): string {
  return bodyStr.split('\n').map(line => indent + line).join('\n').trimEnd()
}