interface ResponseHeadersSectionProps {
  headersFormatted: string | null
  isExpanded: boolean
  onToggle: () => void
  onCopy: (text: string) => void
  isCopied: boolean
}

export default function ResponseHeadersSection({
  headersFormatted,
  isExpanded,
  onToggle,
  onCopy,
  isCopied,
}: ResponseHeadersSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onToggle}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Response Headers</h3>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {isExpanded && (
        <div className="p-3">
          {headersFormatted ? (
            <div className="relative">
              <pre className="font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 p-3 rounded overflow-auto max-h-48" style={{ fontSize: '10px' }}>
                {headersFormatted}
              </pre>
              <button
                onClick={() => onCopy(headersFormatted)}
                className={`absolute top-1 right-1 px-2 py-1 border rounded text-xs transition-colors ${
                  isCopied
                    ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
                }`}
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-xs">No response headers</p>
          )}
        </div>
      )}
    </div>
  )
}
