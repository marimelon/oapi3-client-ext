import { useState, useEffect, useMemo } from 'react'
import RequestBodyModeToggle from './RequestBodyModeToggle'
import RequestBodyForm from './RequestBodyForm'
import { useAppContext } from '../../context/AppContext'

interface RequestBodyEditorProps {
  schema: any
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function RequestBodyEditor({ 
  schema, 
  value, 
  onChange, 
  placeholder 
}: RequestBodyEditorProps) {
  const { state } = useAppContext()
  const [mode, setMode] = useState<'form' | 'raw'>('form')
  const [formValue, setFormValue] = useState<any>({})
  const [rawValue, setRawValue] = useState(value)

  // Recursively resolve $ref references in schema
  const resolvedSchema = useMemo(() => {
    if (!schema || !schema.schema || !state.selectedSpec) {
      return schema
    }

    const fullResolvedSpec: any = state.selectedSpec.spec

    // Recursive function to resolve $ref references
    const resolveRefs = (obj: any, visited = new Set<string>()): any => {
      if (!obj || typeof obj !== 'object') {
        return obj
      }

      // Handle $ref
      if (obj.$ref) {
        const refPath = obj.$ref
        if (refPath.startsWith('#/')) {
          // Prevent circular references
          if (visited.has(refPath)) {
            console.warn('Circular reference detected:', refPath)
            return obj
          }

          visited.add(refPath)
          
          const pathParts = refPath.substring(2).split('/')
          let resolvedRef: any = fullResolvedSpec
          for (const part of pathParts) {
            if (resolvedRef && typeof resolvedRef === 'object') {
              resolvedRef = resolvedRef[part]
            } else {
              resolvedRef = undefined
              break
            }
          }
          
          if (resolvedRef) {
            // Recursively resolve the resolved reference
            return resolveRefs(resolvedRef, new Set(visited))
          }
        }
        return obj
      }

      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map((item: any) => resolveRefs(item, new Set(visited)))
      }

      // Handle objects - recursively resolve properties
      const resolved: any = {}
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = resolveRefs(value, new Set(visited))
      }
      
      return resolved
    }

    try {
      const resolvedSchemaObj = resolveRefs(schema.schema)
      return {
        ...schema,
        schema: resolvedSchemaObj
      }
    } catch (error) {
      console.warn('Failed to resolve $ref references:', error)
      return schema
    }
  }, [schema, state.selectedSpec])

  // Initialize form value from JSON string
  useEffect(() => {
    try {
      if (value && value.trim()) {
        const parsed = JSON.parse(value)
        setFormValue(parsed)
      } else {
        setFormValue({})
      }
    } catch (e) {
      // If JSON is invalid, keep current form value
      console.warn('Failed to parse JSON for form mode:', e)
    }
    setRawValue(value)
  }, [value])

  // Handle mode switching with state synchronization
  const handleModeChange = (newMode: 'form' | 'raw') => {
    if (newMode === 'raw' && mode === 'form') {
      // Switching from form to raw - convert form data to JSON
      try {
        const jsonString = JSON.stringify(formValue, null, 2)
        setRawValue(jsonString)
        onChange(jsonString)
      } catch (e) {
        console.error('Failed to serialize form data to JSON:', e)
      }
    } else if (newMode === 'form' && mode === 'raw') {
      // Switching from raw to form - parse JSON to form data
      try {
        if (rawValue && rawValue.trim()) {
          const parsed = JSON.parse(rawValue)
          setFormValue(parsed)
        }
      } catch (e) {
        console.warn('Failed to parse JSON for form mode:', e)
        // Keep current form value if JSON is invalid
      }
    }
    setMode(newMode)
  }

  const handleFormChange = (newFormValue: any) => {
    setFormValue(newFormValue)
    try {
      const jsonString = JSON.stringify(newFormValue, null, 2)
      onChange(jsonString)
    } catch (e) {
      console.error('Failed to serialize form data:', e)
    }
  }

  const handleRawChange = (newRawValue: string) => {
    setRawValue(newRawValue)
    onChange(newRawValue)
  }

  // Check if form mode is available (use resolved schema)
  const hasSchema = resolvedSchema && resolvedSchema.schema
  const canUseForm = hasSchema && (
    resolvedSchema.schema.type === 'object' || 
    resolvedSchema.schema.type === 'array' || 
    resolvedSchema.schema.type === 'string' || 
    resolvedSchema.schema.type === 'number' || 
    resolvedSchema.schema.type === 'integer' || 
    resolvedSchema.schema.type === 'boolean'
  )

  return (
    <div>
      {/* Mode Toggle - only show if form mode is available */}
      {canUseForm && (
        <RequestBodyModeToggle 
          mode={mode} 
          onModeChange={handleModeChange} 
        />
      )}

      {/* Form Mode */}
      {mode === 'form' && canUseForm && (
        <RequestBodyForm
          schema={resolvedSchema}
          value={formValue}
          onChange={handleFormChange}
        />
      )}

      {/* Raw JSON Mode */}
      {(mode === 'raw' || !canUseForm) && (
        <textarea
          value={rawValue}
          onChange={(e) => handleRawChange(e.target.value)}
          placeholder={placeholder || 'Enter JSON request body'}
          className="w-full h-48 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      )}
    </div>
  )
}