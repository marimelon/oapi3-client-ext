interface CustomQueryParametersSectionProps {
  customQueryParams: Record<string, string>
  onParamChange: (name: string, value: string) => void
  onAdd: () => void
  onRemove: (key: string) => void
  onKeyChange: (oldKey: string, newKey: string) => void
  onClearAll: () => void
}

export default function CustomQueryParametersSection({
  customQueryParams,
  onParamChange,
  onAdd,
  onRemove,
  onKeyChange,
  onClearAll,
}: CustomQueryParametersSectionProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
          Custom Query Parameters
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({Object.keys(customQueryParams).length})
          </span>
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAdd}
            className="px-2 py-1 bg-blue-600 dark:bg-blue-700 text-white text-xs rounded hover:bg-blue-700 dark:hover:bg-blue-600"
          >
            + Add
          </button>
          {Object.keys(customQueryParams).length > 0 && (
            <button
              onClick={onClearAll}
              className="px-2 py-1 bg-gray-400 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-500 dark:hover:bg-gray-500"
            >
              Clear All
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {Object.entries(customQueryParams).map(([key, value], index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={key}
              onChange={(e) => onKeyChange(key, e.target.value)}
              placeholder="Parameter name"
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => onParamChange(key, e.target.value)}
              placeholder="Parameter value"
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={() => onRemove(key)}
              className="px-2 py-1 bg-red-500 dark:bg-red-600 text-white text-sm rounded hover:bg-red-600 dark:hover:bg-red-500"
            >
              ×
            </button>
          </div>
        ))}
        {Object.keys(customQueryParams).length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
            No custom query parameters. Click "Add" to create one.
          </p>
        )}
      </div>
    </div>
  )
}
