import { useState } from 'react'
import type { SchemaFieldProps } from '../../types/schema'
import { FORM_CONSTANTS } from '../../lib/ui-constants'
import { hasOneOfSchema } from '../../lib/schema-utils'

// Import specialized input components
import BaseInput from './inputs/BaseInput'
import ArrayInput from './inputs/ArrayInput'
import OneOfInput from './inputs/OneOfInput'
import ObjectInput from './inputs/ObjectInput'

export default function SchemaFieldInput({ 
  name, 
  schema, 
  value, 
  onChange, 
  required = false,
  level = 0 
}: SchemaFieldProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const indent = level * FORM_CONSTANTS.INDENT_PX


  const renderInput = () => {
    // Handle oneOf schemas
    if (hasOneOfSchema(schema)) {
      return <OneOfInput name={name} schema={schema} value={value} onChange={onChange} required={required} level={level} />
    }

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
          <BaseInput
            type="number"
            value={value}
            onChange={(val) => onChange(val ? Number(val) : undefined)}
            schema={schema}
            name={name}
            placeholder={schema.example?.toString() || '0'}
          />
        )

      case 'array':
        return <ArrayInput name={name} schema={schema} value={value} onChange={onChange} level={level} />

      case 'object':
        return <ObjectInput name={name} schema={schema} value={value} onChange={onChange} level={level} />

      default:
        // string type (default) - BaseInput handles enum automatically
        return <BaseInput value={value} onChange={onChange} schema={schema} name={name} />
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