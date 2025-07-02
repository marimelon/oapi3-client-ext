import { useState } from 'react'
import type { SchemaFieldProps, Schema } from '../../../types/schema'
import { INPUT_CLASSES, BORDER_CLASSES } from '../../../lib/ui-constants'
import SchemaFieldInput from '../SchemaFieldInput'

export default function OneOfInput({ schema, value, onChange, name, required, level = 0 }: SchemaFieldProps) {
  const [selectedOneOfIndex, setSelectedOneOfIndex] = useState<number>(0)
  
  const options = schema.oneOf || []
  const currentOption = options[selectedOneOfIndex] || options[0]
  
  const getOptionLabel = (option: Schema, index: number) => {
    if (option.description) {
      return `${index + 1}. ${option.description}`
    }
    if (option.properties) {
      const props = Object.keys(option.properties)
      return `${index + 1}. Object (${props.slice(0, 2).join(', ')}${props.length > 2 ? '...' : ''})`
    }
    return `${index + 1}. ${option.type || 'Option'}`
  }

  return (
    <div className="space-y-3">
      {/* Option selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Select schema variant:
        </label>
        <select
          value={selectedOneOfIndex}
          onChange={(e) => {
            const newIndex = parseInt(e.target.value)
            setSelectedOneOfIndex(newIndex)
            // Reset value when switching schemas
            onChange(undefined)
          }}
          className={INPUT_CLASSES.full}
        >
          {options.map((option: Schema, index: number) => (
            <option key={index} value={index}>
              {getOptionLabel(option, index)}
            </option>
          ))}
        </select>
      </div>

      {/* Render the selected schema */}
      {currentOption && (
        <div className={BORDER_CLASSES.oneOf}>
          <SchemaFieldInput
            name={`${name}_variant`}
            schema={currentOption}
            value={value}
            onChange={onChange}
            required={required}
            level={level + 1}
          />
        </div>
      )}
    </div>
  )
}