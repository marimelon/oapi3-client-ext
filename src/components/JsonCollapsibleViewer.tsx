import React, { useState } from 'react'

interface JsonViewerProps {
  data: any
  level?: number
}

const JsonCollapsibleViewer: React.FC<JsonViewerProps> = ({ data, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2)
  
  if (data === null) {
    return <span className="text-gray-500 dark:text-gray-400">null</span>
  }
  
  if (typeof data === 'string') {
    return <span className="text-green-600 dark:text-green-400">"{data}"</span>
  }
  
  if (typeof data === 'number') {
    return <span className="text-blue-600 dark:text-blue-400">{data}</span>
  }
  
  if (typeof data === 'boolean') {
    return <span className="text-purple-600 dark:text-purple-400">{data.toString()}</span>
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-600 dark:text-gray-400">[]</span>
    }
    
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg
            className={`w-3 h-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-600 dark:text-gray-400">
            [{data.length} items]
          </span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l border-gray-200 dark:border-gray-600 pl-2">
            {data.map((item, index) => (
              <div key={index} className="my-1">
                <span className="text-gray-500 dark:text-gray-400 mr-2">{index}:</span>
                <JsonCollapsibleViewer data={item} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  if (typeof data === 'object') {
    const keys = Object.keys(data)
    if (keys.length === 0) {
      return <span className="text-gray-600 dark:text-gray-400">{}</span>
    }
    
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <svg
            className={`w-3 h-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-600 dark:text-gray-400">
            {`{${keys.length} properties}`}
          </span>
        </button>
        {isExpanded && (
          <div className="ml-4 border-l border-gray-200 dark:border-gray-600 pl-2">
            {keys.map((key) => (
              <div key={key} className="my-1">
                <span className="text-orange-600 dark:text-orange-400 mr-2">"{key}":</span>
                <JsonCollapsibleViewer data={data[key]} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  return <span>{String(data)}</span>
}

export default JsonCollapsibleViewer