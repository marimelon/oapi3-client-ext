import { useState, useMemo } from 'react'
import { useRequest } from '../../hooks/useRequest'
import { useMultiCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { useResizePanel } from '../../hooks/useResizePanel'
import { useJqProcessing } from '../../hooks/useJqProcessing'
import { buildAuditTrailData, formatAuditTrail } from '../../lib/auditTrail'
import { useAppContext } from '../../context/AppContext'
import { RequestBuilder } from '../../lib/request'
import { lastRequestStorage } from '../../lib/lastRequestStorage'
import ResponseStatusSection from './ResponseStatusSection'
import ResponseHeadersSection from './ResponseHeadersSection'
import ResponseBodySection from './ResponseBodySection'

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
  const { copyToClipboard, isCopied } = useMultiCopyToClipboard()
  const { bodyHeight, isResizing, handleMouseDown, resizeRef } = useResizePanel()
  const { jqQuery, setJqQuery, jqResult, jqProcessing, handlePaste, isReady } = useJqProcessing({
    data: requestState.result?.data,
    jsonDisplayMode,
  })

  const displayData = useMemo(() => {
    if (jsonDisplayMode === 'jq') {
      return jqResult.data
    }
    return requestState.result?.data
  }, [jsonDisplayMode, jqResult.data, requestState.result?.data])

  const handleCopy = (text: string, itemId: string) => {
    copyToClipboard(text, itemId)
  }

  const getBodyHeight = () => {
    switch (viewMode) {
      case 'compact': return 256
      case 'full': return Math.max(400, window.innerHeight - 300)
      default: return bodyHeight
    }
  }

  const handleCopyAuditTrail = () => {
    const endpoint = state.selectedEndpoint
    const environment = state.selectedEnvironment
    if (!endpoint || !environment) return

    const lastRequestParams = lastRequestStorage.getLastRequestParams()
    if (!lastRequestParams) return

    const { pathParams, queryParams, headers, body } = lastRequestParams

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
      <ResponseStatusSection
        result={requestState.result}
        statusInfo={statusInfo}
        isExpanded={isStatusExpanded}
        onToggle={() => setIsStatusExpanded(!isStatusExpanded)}
        onCopyAuditTrail={handleCopyAuditTrail}
        isAuditTrailCopied={isCopied(AUDIT_TRAIL_COPY_ID)}
      />

      <ResponseHeadersSection
        headersFormatted={headersFormatted}
        isExpanded={isHeadersExpanded}
        onToggle={() => setIsHeadersExpanded(!isHeadersExpanded)}
        onCopy={(text) => handleCopy(text, 'headers')}
        isCopied={isCopied('headers')}
      />

      <ResponseBodySection
        result={requestState.result}
        bodyFormatted={bodyFormatted}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        jsonDisplayMode={jsonDisplayMode}
        onJsonDisplayModeChange={setJsonDisplayMode}
        displayData={displayData}
        getBodyHeight={getBodyHeight}
        isResizing={isResizing}
        handleMouseDown={handleMouseDown}
        resizeRef={resizeRef}
        jqQuery={jqQuery}
        onJqQueryChange={setJqQuery}
        jqResult={jqResult}
        jqProcessing={jqProcessing}
        handlePaste={handlePaste}
        isJqReady={isReady}
        onCopy={handleCopy}
        isCopied={isCopied}
      />
    </div>
  )
}
