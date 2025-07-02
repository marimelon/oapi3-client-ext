import { useState } from 'react'

interface SchemaFieldInputProps {
  name: string
  schema: any
  value: any
  onChange: (value: any) => void
  required?: boolean
  level?: number
}

export default function SchemaFieldInput({ 
  name, 
  schema, 
  value, 
  onChange, 
  required = false,
  level = 0 
}: SchemaFieldInputProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const indent = level * 16 // px

  const renderInput = () => {
    const type = schema.type || 'string'

    switch (type) {
      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {value ? 'true' : 'false'}
            </span>
          </label>
        )

      case 'number':
      case 'integer':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
            placeholder={schema.example?.toString() || '0'}
            step={type === 'integer' ? 1 : 'any'}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )

      case 'array':
        const arrayValue = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {arrayValue.map((item: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newValue = [...arrayValue]
                    newValue.splice(index, 1)
                    onChange(newValue)
                  }}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 flex items-center justify-center text-xs"
                >
                  ×
                </button>
                <SchemaFieldInput
                  name={`${name}[${index}]`}
                  schema={schema.items || { type: 'string' }}
                  value={item}
                  onChange={(newItem) => {
                    const newValue = [...arrayValue]
                    newValue[index] = newItem
                    onChange(newValue)
                  }}
                  level={level + 1}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const itemType = schema.items?.type || 'string'
                const defaultValue = itemType === 'boolean' ? false : 
                                   itemType === 'number' || itemType === 'integer' ? 0 : 
                                   itemType === 'array' ? [] :
                                   itemType === 'object' ? {} : ''
                onChange([...arrayValue, defaultValue])
              }}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              + Add item
            </button>
          </div>
        )

      case 'object':
        const objectValue = value || {}
        const properties = schema.properties || {}
        return (
          <div className="space-y-3 border-l-2 border-gray-200 dark:border-gray-600 pl-4">
            {Object.entries(properties).map(([propName, propSchema]: [string, any]) => (
              <SchemaFieldInput
                key={propName}
                name={propName}
                schema={propSchema}
                value={objectValue[propName]}
                onChange={(newValue) => {
                  const newObjectValue = { ...objectValue }
                  if (newValue === undefined || newValue === '') {
                    delete newObjectValue[propName]
                  } else {
                    newObjectValue[propName] = newValue
                  }
                  onChange(newObjectValue)
                }}
                required={schema.required?.includes(propName)}
                level={level + 1}
              />
            ))}
          </div>
        )

      default:
        // enum support
        if (schema.enum) {
          return (
            <select
              value={value || ''}
              onChange={(e) => onChange(e.target.value || undefined)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {schema.enum.map((option: any) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )
        }

        // string type (default)
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            placeholder={schema.example || schema.description || `Enter ${name}`}
            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )
    }
  }

  const shouldCollapse = schema.type === 'object' && level > 0

  return (
    <div style={{ marginLeft: `${indent}px` }}>
      <div className="flex items-center gap-2 mb-2">
        {shouldCollapse && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-4 h-4 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {name}
          {required && <span className="text-red-500 ml-1">*</span>}
          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
            ({schema.type || 'string'})
          </span>
        </label>
        {schema.description && (
          <div className="group relative">
            <span className="text-gray-400 cursor-help">?</span>
            <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-1 text-xs text-white bg-gray-900 rounded shadow-lg">
              {schema.description}
            </div>
          </div>
        )}
      </div>
      
      {(!shouldCollapse || isExpanded) && (
        <div className="mb-3">
          {renderInput()}
        </div>
      )}
    </div>
  )
}