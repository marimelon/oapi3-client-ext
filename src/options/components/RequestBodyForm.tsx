import SchemaFieldInput from './SchemaFieldInput'
import type { ResolvedRequestBodySchema } from '../../types/schema'
import { filterReadOnlyProperties } from '../../lib/schema-utils'

interface RequestBodyFormProps {
  schema: ResolvedRequestBodySchema
  value: any
  onChange: (value: any) => void
}

export default function RequestBodyForm({ schema, value, onChange }: RequestBodyFormProps) {
  if (!schema || !schema.schema) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
        No schema available for form generation
      </div>
    )
  }

  const handleRootChange = (newValue: any) => {
    onChange(newValue)
  }

  return (
    <div className="space-y-2">
      {schema.schema.type === 'object' && schema.schema.properties ? (
        // Object schema - render each property
        filterReadOnlyProperties(schema.schema.properties)
          .map(([propName, propSchema]: [string, any]) => (
            <SchemaFieldInput
              key={propName}
              name={propName}
              schema={propSchema}
              value={value?.[propName]}
              onChange={(newValue) => {
                const updatedValue = { ...value }
                if (newValue === undefined || newValue === '') {
                  delete updatedValue[propName]
                } else {
                  updatedValue[propName] = newValue
                }
                handleRootChange(updatedValue)
              }}
              required={schema.schema.required?.includes(propName)}
            />
          ))
      ) : (
        // Non-object schema - render as single field
        <SchemaFieldInput
          name="value"
          schema={schema.schema}
          value={value}
          onChange={handleRootChange}
          required={schema.required}
        />
      )}
    </div>
  )
}