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
