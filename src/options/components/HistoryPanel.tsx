import { useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { getMethodColor, getStatusColor, formatDate } from '../../lib/utils'

// 履歴データの正規化とバリデーション
const normalizeHistoryItem = (history: any) => {
  try {
    // タイムスタンプを安全に変換するヘルパー関数
    const safeDate = (value: any): Date => {
      if (!value) return new Date()
      
      try {
        const date = new Date(value)
        // 無効な日付をチェック
        if (isNaN(date.getTime())) {
          console.warn('Invalid timestamp detected, using current time:', value)
          return new Date()
        }
        return date
      } catch (error) {
        console.warn('Error parsing timestamp, using current time:', value, error)
        return new Date()
      }
    }
    
    return {
      id: history.id || 'unknown',
      specId: history.specId || '',
      environmentId: history.environmentId || '',
      method: history.method || 'GET',
      endpoint: history.endpoint || '',
      parameters: {
        pathParams: history.parameters?.pathParams || {},
        queryParams: history.parameters?.queryParams || {},
        ...history.parameters
      },
      headers: history.headers || {},
      body: history.body || null,
      response: {
        status: history.response?.status || 0,
        headers: history.response?.headers || {},
        body: history.response?.body || null,
        timestamp: safeDate(history.response?.timestamp)
      },
      timestamp: safeDate(history.timestamp)
    }
  } catch (error) {
    console.warn('Invalid history item detected:', error, history)
    return null
  }
}

export default function HistoryPanel() {
  const { state } = useAppContext()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedHistory, setSelectedHistory] = useState<any>(null)

  // 履歴データをフィルタリングし、無効なアイテムを除外
  const validHistory = state.requestHistory
    .map(normalizeHistoryItem)
    .filter((history): history is NonNullable<typeof history> => Boolean(history))

  const filteredHistory = validHistory.filter(history => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    try {
      return (
        (history.endpoint || '').toLowerCase().includes(term) ||
        (history.method || '').toLowerCase().includes(term) ||
        formatDate(history.timestamp).toLowerCase().includes(term)
      )
    } catch (error) {
      console.warn('Error filtering history item:', error, history)
      return false
    }
  })

  if (validHistory.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Request History</h3>
          <p className="text-gray-600 dark:text-gray-400">Your API requests will appear here after you send them</p>
          {state.requestHistory.length > 0 && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-2">
              ⚠️ Some history items were invalid and have been filtered out
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 検索とフィルタ */}
      <div className="mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filteredHistory.length} of {validHistory.length} requests
            {state.requestHistory.length !== validHistory.length && (
              <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                ({state.requestHistory.length - validHistory.length} invalid)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 履歴一覧 */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Requests</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredHistory.map((history) => {
              const isSelected = selectedHistory?.id === history.id
              const apiSpec = state.openApiSpecs.find(spec => spec.id === history.specId)
              const environment = state.environments.find(env => env.id === history.environmentId)

              return (
                <div
                  key={history.id}
                  onClick={() => setSelectedHistory(history)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getMethodColor(history.method)}`}>
                        {history.method}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(history.response?.status || 0)}`}>
                        {history.response?.status || 'N/A'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(history.timestamp)}
                    </span>
                  </div>
                  
                  <div className="font-mono text-sm text-gray-700 dark:text-gray-300 truncate mb-2">
                    {history.endpoint}
                  </div>
                  
                  <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>🌍 {environment?.name || 'Unknown'}</span>
                    <span>•</span>
                    <span>📋 {apiSpec?.name || 'Unknown API'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 詳細表示 */}
        <div>
          {selectedHistory ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Request Details</h3>
              
              {/* リクエスト概要 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded ${getMethodColor(selectedHistory.method)}`}>
                    {selectedHistory.method}
                  </span>
                  <span className="font-mono text-sm flex-1 text-gray-900 dark:text-gray-100">{selectedHistory.endpoint}</span>
                  <span className={`px-2 py-1 text-sm font-medium rounded ${getStatusColor(selectedHistory.response?.status || 0)}`}>
                    {selectedHistory.response?.status || 'N/A'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Environment:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                      {state.environments.find(env => env.id === selectedHistory.environmentId)?.name || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">API:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                      {state.openApiSpecs.find(spec => spec.id === selectedHistory.specId)?.name || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Timestamp:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{formatDate(selectedHistory.timestamp)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Response Time:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                      {selectedHistory.response?.timestamp ? formatDate(selectedHistory.response.timestamp) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* リクエストパラメータ */}
              {(Object.keys(selectedHistory.parameters?.pathParams || {}).length > 0 ||
                Object.keys(selectedHistory.parameters?.queryParams || {}).length > 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Parameters</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {Object.keys(selectedHistory.parameters?.pathParams || {}).length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Path Parameters:</div>
                        <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          {JSON.stringify(selectedHistory.parameters.pathParams, null, 2)}
                        </pre>
                      </div>
                    )}
                    {Object.keys(selectedHistory.parameters?.queryParams || {}).length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Query Parameters:</div>
                        <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                          {JSON.stringify(selectedHistory.parameters.queryParams, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* リクエストヘッダー */}
              {Object.keys(selectedHistory.headers || {}).length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Request Headers</h4>
                  </div>
                  <div className="p-4">
                    <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded max-h-32 overflow-auto">
                      {JSON.stringify(selectedHistory.headers, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* リクエストボディ */}
              {selectedHistory.body && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">Request Body</h4>
                  </div>
                  <div className="p-4">
                    <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded max-h-32 overflow-auto">
                      {JSON.stringify(selectedHistory.body, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* レスポンス */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Response</h4>
                </div>
                <div className="p-4 space-y-3">
                  {/* レスポンスヘッダー */}
                  {Object.keys(selectedHistory.response?.headers || {}).length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Headers:</div>
                      <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-24 overflow-auto">
                        {JSON.stringify(selectedHistory.response.headers, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* レスポンスボディ */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Body:</div>
                    <pre className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded max-h-48 overflow-auto">
                      {selectedHistory.response?.body 
                        ? JSON.stringify(selectedHistory.response.body, null, 2)
                        : 'No response body'
                      }
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-center text-gray-500 dark:text-gray-400">
              <div>
                <div className="text-4xl mb-2">👆</div>
                <p>Select a request from the list</p>
                <p className="text-sm mt-1">to view detailed information</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}