import { useState } from 'react'
import { useRequest } from '../../hooks/useRequest'
import { useMultiCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { getStatusColor } from '../../lib/utils'

export default function ResponsePanel() {
  const { requestState, formatResponse } = useRequest()
  const [isHeadersExpanded, setIsHeadersExpanded] = useState(false)
  const { copyToClipboard, isCopied } = useMultiCopyToClipboard()

  const handleCopy = (text: string, itemId: string) => {
    copyToClipboard(text, itemId)
  }

  if (requestState.loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Sending request...</p>
        </div>
      </div>
    )
  }

  if (requestState.error) {
    return (
      <div className="p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center mb-4">
            <div className="text-red-500 text-2xl mr-3">❌</div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-400">Request Failed</h3>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-md p-4">
            <p className="text-red-700 dark:text-red-400 font-mono text-sm">{requestState.error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!requestState.result) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📡</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Response Yet</h3>
          <p className="text-gray-600 dark:text-gray-400">Send a request to see the response here</p>
        </div>
      </div>
    )
  }

  const { statusInfo, headersFormatted, bodyFormatted } = formatResponse(requestState.result)

  return (
    <div className="p-3 space-y-3">
      {/* ステータス情報 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Status</h3>
          <div className="flex items-center space-x-4">
            {requestState.result.duration && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ⏱️ {requestState.result.duration}ms
              </span>
            )}
            <span className={`px-3 py-1 text-sm font-medium rounded-md ${
              requestState.result.status ? getStatusColor(requestState.result.status) : 'text-gray-600 bg-gray-50'
            }`}>
              {statusInfo}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {requestState.result.success ? (
            <>
              <span className="text-green-600 text-xl">✅</span>
              <span className="text-green-700 dark:text-green-400 font-medium">Success</span>
            </>
          ) : (
            <>
              <span className="text-red-600 text-xl">❌</span>
              <span className="text-red-700 dark:text-red-400 font-medium">Failed</span>
            </>
          )}
        </div>
      </div>

      {/* レスポンスヘッダー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsHeadersExpanded(!isHeadersExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Headers</h3>
            <svg
              className={`w-4 h-4 transition-transform ${isHeadersExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {isHeadersExpanded && (
          <div className="p-3">
            {headersFormatted ? (
              <div className="relative">
                <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-auto max-h-48">
                  {headersFormatted}
                </pre>
                <button
                  onClick={() => handleCopy(headersFormatted, 'headers')}
                  className={`absolute top-1 right-1 px-2 py-1 border rounded text-xs transition-colors ${
                    isCopied('headers')
                      ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                      : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {isCopied('headers') ? 'Copied!' : 'Copy'}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs">No response headers</p>
            )}
          </div>
        )}
      </div>

      {/* レスポンスボディ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Body</h3>
        </div>
        <div className="p-3">
          {bodyFormatted ? (
            <div className="relative">
              <pre className="text-xs font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-auto max-h-64">
                {bodyFormatted}
              </pre>
              <button
                onClick={() => handleCopy(bodyFormatted, 'body')}
                className={`absolute top-1 right-1 px-2 py-1 border rounded text-xs transition-colors ${
                  isCopied('body')
                    ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
                }`}
              >
                {isCopied('body') ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-xs">No response body</p>
          )}
        </div>
      </div>

      {/* レスポンス解析 */}
      {requestState.result.data && typeof requestState.result.data === 'object' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Analysis</h3>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {Array.isArray(requestState.result.data) ? '📋' : '📄'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Type</div>
                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  {Array.isArray(requestState.result.data) ? 'Array' : 'Object'}
                </div>
              </div>
              
              {Array.isArray(requestState.result.data) && (
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {requestState.result.data.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Items</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">Array Length</div>
                </div>
              )}
              
              {typeof requestState.result.data === 'object' && !Array.isArray(requestState.result.data) && (
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">
                    {Object.keys(requestState.result.data).length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Properties</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">Object Keys</div>
                </div>
              )}
              
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">
                  {Math.round(JSON.stringify(requestState.result.data).length / 1024)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Size</div>
                <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">KB</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}