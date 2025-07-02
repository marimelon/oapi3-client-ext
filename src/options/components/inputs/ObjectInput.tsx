import type { SchemaFieldProps } from '../../../types/schema'
import { BORDER_CLASSES } from '../../../lib/ui-constants'
import SchemaFieldInput from '../SchemaFieldInput'

export default function ObjectInput({ schema, value, onChange, level = 0 }: SchemaFieldProps) {
  const objectValue = value || {}
  const properties = schema.properties || {}

  return (
    <div className={`space-y-3 ${BORDER_CLASSES.object}`}>
      {Object.entries(properties)
        .filter(([, propSchema]: [string, any]) => !propSchema.readOnly) // Skip readOnly fields
        .map(([propName, propSchema]: [string, any]) => (
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
}