import { getStatusColor } from '../../lib/colors'

interface ResponseStatusSectionProps {
  result: {
    status?: number
    statusText?: string
    duration?: number
    data?: any
  }
  statusInfo: string
  isExpanded: boolean
  onToggle: () => void
  onCopyAuditTrail: () => void
  isAuditTrailCopied: boolean
}

export default function ResponseStatusSection({
  result,
  statusInfo,
  isExpanded,
  onToggle,
  onCopyAuditTrail,
  isAuditTrailCopied,
}: ResponseStatusSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <button
            onClick={onToggle}
            className="flex items-center space-x-3 flex-1 text-left"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Status</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-md ${
              result.status ? getStatusColor(result.status) : 'text-gray-600 bg-gray-50'
            }`}>
              {statusInfo}
            </span>
            {result.duration && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ⏱️ {result.duration}ms
              </span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={onCopyAuditTrail}
            className={`ml-2 px-3 py-1 border rounded text-xs transition-colors ${
              isAuditTrailCopied
                ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
            }`}
            title="Copy complete request/response audit trail"
          >
            {isAuditTrailCopied ? 'Copied!' : 'Copy Audit Trail'}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="p-3 space-y-2">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Status Code:</span>
              <span className="font-mono">{result.status || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Status Text:</span>
              <span className="font-mono">{result.statusText || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span className="font-mono">{result.duration ? `${result.duration}ms` : 'N/A'}</span>
            </div>
            {result.data && typeof result.data === 'object' && (
              <>
                <div className="flex justify-between">
                  <span>Data Type:</span>
                  <span className="font-mono">{Array.isArray(result.data) ? 'Array' : 'Object'}</span>
                </div>
                <div className="flex justify-between">
                  <span>{Array.isArray(result.data) ? 'Items' : 'Properties'}:</span>
                  <span className="font-mono">
                    {Array.isArray(result.data)
                      ? result.data.length
                      : Object.keys(result.data).length
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Size:</span>
                  <span className="font-mono">{Math.round(JSON.stringify(result.data).length / 1024)} KB</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
