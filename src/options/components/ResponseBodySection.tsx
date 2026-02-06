import React from 'react'
import JsonCollapsibleViewer from '../../components/JsonCollapsibleViewer'
import JsonSyntaxHighlighter from '../../components/JsonSyntaxHighlighter'

type ViewMode = 'compact' | 'expanded' | 'full'
type JsonDisplayMode = 'tree' | 'raw' | 'jq'

interface ResponseBodySectionProps {
  result: {
    data?: any
  }
  bodyFormatted: string | null
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  jsonDisplayMode: JsonDisplayMode
  onJsonDisplayModeChange: (mode: JsonDisplayMode) => void
  displayData: any
  getBodyHeight: () => number
  isResizing: boolean
  handleMouseDown: (e: React.MouseEvent) => void
  resizeRef: React.RefObject<HTMLDivElement | null>
  // jq props
  jqQuery: string
  onJqQueryChange: (query: string) => void
  jqResult: { data: any; error: string | null }
  jqProcessing: boolean
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
  isJqReady: boolean
  // copy props
  onCopy: (text: string, itemId: string) => void
  isCopied: (itemId: string) => boolean
}

export default function ResponseBodySection({
  result,
  bodyFormatted,
  viewMode,
  onViewModeChange,
  jsonDisplayMode,
  onJsonDisplayModeChange,
  displayData,
  getBodyHeight,
  handleMouseDown,
  resizeRef,
  jqQuery,
  onJqQueryChange,
  jqResult,
  jqProcessing,
  handlePaste,
  isJqReady,
  onCopy,
  isCopied,
}: ResponseBodySectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Body</h3>
          <div className="flex items-center space-x-2">
            {result?.data && typeof result.data === 'object' && (
              <div className="flex items-center space-x-1 border border-gray-300 dark:border-gray-600 rounded">
                <button
                  onClick={() => onJsonDisplayModeChange('tree')}
                  className={`px-2 py-1 text-xs transition-colors ${
                    jsonDisplayMode === 'tree'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Tree
                </button>
                <button
                  onClick={() => onJsonDisplayModeChange('raw')}
                  className={`px-2 py-1 text-xs transition-colors ${
                    jsonDisplayMode === 'raw'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  Raw
                </button>
                <button
                  onClick={() => onJsonDisplayModeChange('jq')}
                  className={`px-2 py-1 text-xs rounded-r transition-colors ${
                    jsonDisplayMode === 'jq'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                  disabled={!isJqReady}
                >
                  jq
                </button>
              </div>
            )}
            <select
              value={viewMode}
              onChange={(e) => onViewModeChange(e.target.value as ViewMode)}
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
        {jsonDisplayMode === 'jq' && result?.data && typeof result.data === 'object' && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center space-x-2">
              <label htmlFor="jq-query" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                jq Query:
              </label>
              {!isJqReady && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400">Initializing jq...</span>
              )}
              {jqProcessing && (
                <span className="text-xs text-blue-600 dark:text-blue-400">Processing...</span>
              )}
            </div>
            <input
              id="jq-query"
              type="text"
              value={jqQuery}
              onChange={(e) => onJqQueryChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={'e.g., .items[] | select(.status == "active")'}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              disabled={!isJqReady}
            />
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
              {result?.data && typeof result.data === 'object' ? (
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
                  onCopy(copyData, 'body')
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
  )
}
