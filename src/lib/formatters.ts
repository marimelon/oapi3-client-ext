// 日付フォーマット
export function formatDate(date: Date): string {
  // 無効な日付をチェック
  if (!date || isNaN(date.getTime())) {
    return 'Invalid Date'
  }

  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  } catch (error) {
    console.warn('Date formatting error:', error, date)
    return 'Invalid Date'
  }
}

// バイト数を人間読みやすい形式に変換
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
