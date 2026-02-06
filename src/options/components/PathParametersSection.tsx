interface PathParametersSectionProps {
  pathParametersFromUrl: string[]
  parameterSchema: any
  pathParams: Record<string, string>
  onParamChange: (name: string, value: string) => void
}

export default function PathParametersSection({
  pathParametersFromUrl,
  parameterSchema,
  pathParams,
  onParamChange,
}: PathParametersSectionProps) {
  if (pathParametersFromUrl.length === 0 && !(parameterSchema?.path && parameterSchema.path.length > 0)) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
      <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
        Path Parameters
        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
          ({pathParametersFromUrl.length})
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* URL から抽出されたパラメータ */}
        {pathParametersFromUrl.map((paramName) => {
          const schemaParam = parameterSchema?.path?.find((p: any) => p.name === paramName)
          const isRequired = schemaParam?.required !== false
          const isMissing = !pathParams[paramName] || pathParams[paramName].trim() === ''

          return (
            <div key={paramName}>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <div className="flex items-center space-x-1">
                  <span>{paramName}</span>
                  {isRequired && <span className="text-red-500">*</span>}
                  <span className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                    URL
                  </span>
                </div>
              </label>
              <input
                type="text"
                value={pathParams[paramName] || ''}
                onChange={(e) => onParamChange(paramName, e.target.value)}
                placeholder={schemaParam?.description || schemaParam?.example || `Enter ${paramName}`}
                className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isMissing && isRequired
                    ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {schemaParam?.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{schemaParam.description}</p>
              )}
              {isMissing && isRequired && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Required</p>
              )}
            </div>
          )
        })}

        {/* OpenAPI仕様にあってURLにないパラメータ */}
        {parameterSchema?.path?.filter((param: any) =>
          !pathParametersFromUrl.includes(param.name)
        ).map((param: any) => (
          <div key={param.name}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <div className="flex items-center space-x-2">
                <span>{param.name}</span>
                {param.required && <span className="text-red-500">*</span>}
                <span className="px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded">
                  Schema
                </span>
              </div>
            </label>
            <input
              type="text"
              value={pathParams[param.name] || ''}
              onChange={(e) => onParamChange(param.name, e.target.value)}
              placeholder={param.description || param.example || `Enter ${param.name}`}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {param.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{param.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
