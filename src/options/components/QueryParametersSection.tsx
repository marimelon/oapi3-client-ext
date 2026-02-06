interface QueryParametersSectionProps {
  parameterSchema: any
  queryParams: Record<string, string>
  onParamChange: (name: string, value: string) => void
}

export default function QueryParametersSection({
  parameterSchema,
  queryParams,
  onParamChange,
}: QueryParametersSectionProps) {
  if (!parameterSchema?.query || parameterSchema.query.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
      <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
        Query Parameters
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          ({parameterSchema.query.length})
        </span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {parameterSchema.query.map((param: any) => {
          const currentValue = queryParams[param.name] || ''
          const isRequired = param.required
          const isMissing = isRequired && (!currentValue || currentValue.trim() === '')

          return (
            <div key={param.name}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <div className="flex items-center space-x-1">
                  <span>{param.name}</span>
                  {isRequired && <span className="text-red-500">*</span>}
                  {param.type && (
                    <span className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                      {param.type}
                    </span>
                  )}
                  {param.format && (
                    <span className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
                      {param.format}
                    </span>
                  )}
                </div>
              </label>

              {/* Enum選択肢がある場合はセレクトボックス */}
              {param.enum && param.enum.length > 0 ? (
                <select
                  value={currentValue}
                  onChange={(e) => onParamChange(param.name, e.target.value)}
                  className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isMissing ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">-- Select {param.name} --</option>
                  {param.enum.map((option: any) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : param.type === 'boolean' ? (
                /* Boolean型の場合はセレクトボックス */
                <select
                  value={currentValue}
                  onChange={(e) => onParamChange(param.name, e.target.value)}
                  className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isMissing ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">-- Select --</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                /* 通常のテキスト入力 */
                <input
                  type={param.type === 'number' || param.type === 'integer' ? 'number' : 'text'}
                  value={currentValue}
                  onChange={(e) => onParamChange(param.name, e.target.value)}
                  placeholder={param.example || param.description || `Enter ${param.name}`}
                  className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    isMissing ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  step={param.type === 'number' ? 'any' : undefined}
                />
              )}

              {/* パラメータの説明 */}
              {param.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{param.description}</p>
              )}

              {/* エラーメッセージ */}
              {isMissing && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Required</p>
              )}

              {/* Enumの場合は選択肢を表示 */}
              {param.enum && param.enum.length > 0 && param.enum.length <= 5 && (
                <div className="mt-0.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Options: {param.enum.join(', ')}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
