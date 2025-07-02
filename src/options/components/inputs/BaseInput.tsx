import type { Schema } from '../../../types/schema'
import { INPUT_CLASSES } from '../../../lib/ui-constants'

interface BaseInputProps {
  value: any
  onChange: (value: any) => void
  schema: Schema
  name: string
  type?: string
  placeholder?: string
  className?: string
}

export default function BaseInput({ 
  value, 
  onChange, 
  schema, 
  name, 
  type = 'text',
  placeholder,
  className = INPUT_CLASSES.full 
}: BaseInputProps) {
  // Handle enum as select dropdown
  if (schema.enum) {
    return (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className={className}
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

  const inputType = schema.format === 'date-time' ? 'datetime-local' : 
                   schema.format === 'date' ? 'date' :
                   schema.format === 'url' ? 'url' : type
  
  return (
    <input
      type={inputType}
      value={value || ''}
      onChange={(e) => onChange(e.target.value || undefined)}
      placeholder={placeholder || schema.example || schema.description || `Enter ${name}`}
      maxLength={schema.maxLength}
      minLength={schema.minLength}
      min={schema.minimum}
      max={schema.maximum}
      step={type === 'number' && schema.type === 'integer' ? 1 : 'any'}
      className={className}
    />
  )
}