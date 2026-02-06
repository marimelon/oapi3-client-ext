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
