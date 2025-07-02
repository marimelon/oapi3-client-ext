import React, { useState, useRef, useCallback } from 'react'
import { useRequest } from '../../hooks/useRequest'
import { useMultiCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { getStatusColor } from '../../lib/utils'
import JsonCollapsibleViewer from '../../components/JsonCollapsibleViewer'
import JsonSyntaxHighlighter from '../../components/JsonSyntaxHighlighter'

type ViewMode = 'compact' | 'expanded' | 'full'
type JsonDisplayMode = 'tree' | 'raw'

export default function ResponsePanel() {
  const { requestState, formatResponse } = useRequest()
  const [isHeadersExpanded, setIsHeadersExpanded] = useState(false)
  const [isStatusExpanded, setIsStatusExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('expanded')
  const [jsonDisplayMode, setJsonDisplayMode] = useState<JsonDisplayMode>('tree')
  const [bodyHeight, setBodyHeight] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)
  const { copyToClipboard, isCopied } = useMultiCopyToClipboard()

  const handleCopy = (text: string, itemId: string) => {
    copyToClipboard(text, itemId)
  }

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    
    const rect = resizeRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const newHeight = e.clientY - rect.top
    setBodyHeight(Math.max(200, Math.min(800, newHeight)))
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const getBodyHeight = () => {
    switch (viewMode) {
      case 'compact': return 256
      case 'full': return Math.max(400, window.innerHeight - 300)
      default: return bodyHeight
    }
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsStatusExpanded(!isStatusExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Status</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                requestState.result.status ? getStatusColor(requestState.result.status) : 'text-gray-600 bg-gray-50'
              }`}>
                {statusInfo}
              </span>
              {requestState.result.duration && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ⏱️ {requestState.result.duration}ms
                </span>
              )}
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${isStatusExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {isStatusExpanded && (
          <div className="p-3 space-y-2">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Status Code:</span>
                <span className="font-mono">{requestState.result.status || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Text:</span>
                <span className="font-mono">{requestState.result.statusText || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span className="font-mono">{requestState.result.duration ? `${requestState.result.duration}ms` : 'N/A'}</span>
              </div>
              {requestState.result.data && typeof requestState.result.data === 'object' && (
                <>
                  <div className="flex justify-between">
                    <span>Data Type:</span>
                    <span className="font-mono">{Array.isArray(requestState.result.data) ? 'Array' : 'Object'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{Array.isArray(requestState.result.data) ? 'Items' : 'Properties'}:</span>
                    <span className="font-mono">
                      {Array.isArray(requestState.result.data) 
                        ? requestState.result.data.length
                        : Object.keys(requestState.result.data).length
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-mono">{Math.round(JSON.stringify(requestState.result.data).length / 1024)} KB</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
                <pre className="font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-auto max-h-48" style={{ fontSize: '10px' }}>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Body</h3>
            <div className="flex items-center space-x-2">
              {requestState.result?.data && typeof requestState.result.data === 'object' && (
                <div className="flex items-center space-x-1 border border-gray-300 dark:border-gray-600 rounded">
                  <button
                    onClick={() => setJsonDisplayMode('tree')}
                    className={`px-2 py-1 text-xs rounded-l transition-colors ${
                      jsonDisplayMode === 'tree'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setJsonDisplayMode('raw')}
                    className={`px-2 py-1 text-xs rounded-r transition-colors ${
                      jsonDisplayMode === 'raw'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    Raw
                  </button>
                </div>
              )}
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                <option value="compact">Compact</option>
                <option value="expanded">Expanded</option>
                <option value="full">Full</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-3" ref={resizeRef}>
          {bodyFormatted ? (
            <div className="relative">
              <div 
                className="font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-auto border border-gray-200 dark:border-gray-600"
                style={{ fontSize: '10px', height: getBodyHeight() }}
              >
                {requestState.result?.data && typeof requestState.result.data === 'object' ? (
                  jsonDisplayMode === 'tree' ? (
                    <div style={{ fontSize: '10px' }}>
                      <JsonCollapsibleViewer data={requestState.result.data} />
                    </div>
                  ) : (
                    <JsonSyntaxHighlighter jsonString={bodyFormatted} />
                  )
                ) : (
                  // For non-JSON responses, try to detect if it's JSON-like and highlight accordingly
                  bodyFormatted.trim().startsWith('{') || bodyFormatted.trim().startsWith('[') ? (
                    <JsonSyntaxHighlighter jsonString={bodyFormatted} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{bodyFormatted}</pre>
                  )
                )}
              </div>
              
              {viewMode === 'expanded' && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  onMouseDown={handleMouseDown}
                  title="Drag to resize"
                />
              )}
              
              <div className="absolute top-1 right-1 flex space-x-1">
                <button
                  onClick={() => handleCopy(bodyFormatted, 'body')}
                  className={`px-2 py-1 border rounded text-xs transition-colors ${
                    isCopied('body')
                      ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                      : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {isCopied('body') ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: '10px' }}>No response body</p>
          )}
        </div>
      </div>

    </div>
  )
}