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
