import type { SchemaFieldProps } from '../../../types/schema'
import SchemaFieldInput from '../SchemaFieldInput'

export default function ArrayInput({ value, onChange, schema, name, level = 0 }: SchemaFieldProps) {
  const arrayValue = Array.isArray(value) ? value : []
  
  const getDefaultValue = () => {
    const itemType = schema.items?.type || 'string'
    switch (itemType) {
      case 'boolean': return false
      case 'number':
      case 'integer': return 0
      case 'array': return []
      case 'object': return {}
      default: return ''
    }
  }

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
          onChange([...arrayValue, getDefaultValue()])
        }}
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
      >
        + Add item
      </button>
    </div>
  )
}