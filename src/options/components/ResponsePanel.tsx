import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useRequest } from '../../hooks/useRequest'
import { useMultiCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { useJq } from '../../hooks/useJq'
import { getStatusColor } from '../../lib/utils'
import JsonCollapsibleViewer from '../../components/JsonCollapsibleViewer'
import JsonSyntaxHighlighter from '../../components/JsonSyntaxHighlighter'
import { buildAuditTrailData, formatAuditTrail } from '../../lib/auditTrail'
import { useAppContext } from '../../context/AppContext'
import { RequestBuilder } from '../../lib/request'
import { lastRequestStorage } from '../../lib/lastRequestStorage'
import { AiJqPopup } from './AiJqPopup'

type ViewMode = 'compact' | 'expanded' | 'full'
type JsonDisplayMode = 'tree' | 'raw' | 'jq'

// Constants
const AUDIT_TRAIL_COPY_ID = 'audit-trail'

export default function ResponsePanel() {
  const { requestState, formatResponse } = useRequest()
  const { state } = useAppContext()
  const [isHeadersExpanded, setIsHeadersExpanded] = useState(false)
  const [isStatusExpanded, setIsStatusExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('expanded')
  const [jsonDisplayMode, setJsonDisplayMode] = useState<JsonDisplayMode>('tree')
  const [bodyHeight, setBodyHeight] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [jqQuery, setJqQuery] = useState('')
  const [jqResult, setJqResult] = useState<{data: any, error: string | null}>({data: null, error: null})
  const [jqProcessing, setJqProcessing] = useState(false)
  const [showAiPopup, setShowAiPopup] = useState(false)
  const [aiButtonPosition, setAiButtonPosition] = useState({ x: 0, y: 0 })
  const resizeRef = useRef<HTMLDivElement>(null)
  const aiButtonRef = useRef<HTMLButtonElement>(null)
  const { copyToClipboard, isCopied } = useMultiCopyToClipboard()
  const { processQuery, isReady } = useJq()

  // All hooks and callbacks must be defined before any early returns
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

  const processJqQuery = useCallback(async (query: string) => {
    if (!requestState.result?.data || !isReady) return
    
    setJqProcessing(true)
    try {
      const result = await processQuery(requestState.result.data, query)
      setJqResult({data: result.data, error: result.error})
    } catch (error) {
      setJqResult({data: null, error: error instanceof Error ? error.message : 'Unknown error'})
    } finally {
      setJqProcessing(false)
    }
  }, [requestState.result?.data, processQuery, isReady])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const input = e.currentTarget
    const pastedText = e.clipboardData.getData('text')
    
    // Normalize whitespace in pasted text
    const normalizedText = pastedText.replace(/\s+/g, ' ').trim()
    
    // Get current cursor position with safe fallbacks
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const currentValue = input.value
    
    // Insert normalized text at cursor position
    const newValue = currentValue.substring(0, start) + normalizedText + currentValue.substring(end)
    setJqQuery(newValue)
    
    // Restore cursor position after the pasted text
    setTimeout(() => {
      const newCursorPos = start + normalizedText.length
      input.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [])

  const displayData = useMemo(() => {
    if (jsonDisplayMode === 'jq') {
      return jqResult.data
    }
    return requestState.result?.data
  }, [jsonDisplayMode, jqResult.data, requestState.result?.data])

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

  useEffect(() => {
    if (jsonDisplayMode === 'jq' && jqQuery.trim()) {
      const timeoutId = setTimeout(() => {
        processJqQuery(jqQuery)
      }, 300) // debounce
      return () => clearTimeout(timeoutId)
    }
  }, [jqQuery, jsonDisplayMode, processJqQuery])

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
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsStatusExpanded(!isStatusExpanded)}
              className="flex items-center space-x-3 flex-1 text-left"
            >
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
              <svg
                className={`w-4 h-4 transition-transform ${isStatusExpanded ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              onClick={() => {
                // Get request data from state
                const endpoint = state.selectedEndpoint
                const environment = state.selectedEnvironment
                if (!endpoint || !environment) return

                // Get stored request parameters
                const lastRequestParams = lastRequestStorage.getLastRequestParams()
                if (!lastRequestParams) return
                
                const { pathParams, queryParams, headers, body } = lastRequestParams
                
                // Build URL using RequestBuilder
                const requestBuilder = RequestBuilder.getInstance()
                const url = requestBuilder.buildUrl(
                  environment.baseUrl,
                  endpoint.path,
                  pathParams || {},
                  queryParams || {}
                )

                if (!requestState.result) return
                
                const auditData = buildAuditTrailData(
                  endpoint.method,
                  url,
                  headers,
                  body,
                  requestState.result
                )
                
                if (auditData) {
                  const formatted = formatAuditTrail(auditData)
                  copyToClipboard(formatted, AUDIT_TRAIL_COPY_ID)
                }
              }}
              className={`ml-2 px-3 py-1 border rounded text-xs transition-colors ${
                isCopied(AUDIT_TRAIL_COPY_ID)
                  ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                  : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
              }`}
              title="Copy complete request/response audit trail"
            >
              {isCopied('audit-trail') ? 'Copied!' : 'Copy Audit Trail'}
            </button>
          </div>
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
                    className={`px-2 py-1 text-xs transition-colors ${
                      jsonDisplayMode === 'tree'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setJsonDisplayMode('raw')}
                    className={`px-2 py-1 text-xs transition-colors ${
                      jsonDisplayMode === 'raw'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    Raw
                  </button>
                  <button
                    onClick={() => setJsonDisplayMode('jq')}
                    className={`px-2 py-1 text-xs rounded-r transition-colors ${
                      jsonDisplayMode === 'jq'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                    disabled={!isReady}
                  >
                    jq
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
          {/* jq入力フィールド */}
          {jsonDisplayMode === 'jq' && requestState.result?.data && typeof requestState.result.data === 'object' && (
            <div className="mb-3 space-y-2">
              <div className="flex items-center space-x-2">
                <label htmlFor="jq-query" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  jq Query:
                </label>
                {!isReady && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">Initializing jq...</span>
                )}
                {jqProcessing && (
                  <span className="text-xs text-blue-600 dark:text-blue-400">Processing...</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  id="jq-query"
                  type="text"
                  value={jqQuery}
                  onChange={(e) => setJqQuery(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={'e.g., .items[] | select(.status == "active")'}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  disabled={!isReady}
                />
                <button
                  ref={aiButtonRef}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setAiButtonPosition({ x: rect.left, y: rect.bottom + 5 });
                    setShowAiPopup(true);
                  }}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={!isReady}
                  title="Generate jq query with AI"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
              {jqResult.error && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  {jqResult.error}
                </div>
              )}
            </div>
          )}
          
          {bodyFormatted ? (
            <div className="relative">
              <div 
                className="font-mono text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-auto border border-gray-200 dark:border-gray-600"
                style={{ fontSize: '10px', height: getBodyHeight() }}
              >
                {requestState.result?.data && typeof requestState.result.data === 'object' ? (
                  jsonDisplayMode === 'tree' ? (
                    <div style={{ fontSize: '10px' }}>
                      <JsonCollapsibleViewer data={displayData} />
                    </div>
                  ) : jsonDisplayMode === 'jq' ? (
                    displayData !== null ? (
                      <div style={{ fontSize: '10px' }}>
                        <JsonCollapsibleViewer data={displayData} />
                      </div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400 text-center py-8">
                        {jqQuery.trim() ? 'No results' : 'Enter a jq query to filter the data'}
                      </div>
                    )
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
                  onClick={() => {
                    const copyData = jsonDisplayMode === 'jq' && displayData !== null 
                      ? JSON.stringify(displayData, null, 2) 
                      : bodyFormatted
                    handleCopy(copyData, 'body')
                  }}
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

      {/* AI jq Query Popup */}
      <AiJqPopup
        isOpen={showAiPopup}
        onClose={() => setShowAiPopup(false)}
        onGenerate={(query) => {
          setJqQuery(query);
          setShowAiPopup(false);
        }}
        jsonSample={requestState.result?.data}
        position={aiButtonPosition}
      />
    </div>
  )
}