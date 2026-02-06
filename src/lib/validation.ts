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
