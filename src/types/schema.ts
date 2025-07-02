export interface Schema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  format?: string
  enum?: any[]
  properties?: Record<string, Schema>
  items?: Schema
  oneOf?: Schema[]
  required?: string[]
  description?: string
  example?: any
  readOnly?: boolean
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  $ref?: string
}

export interface ResolvedRequestBodySchema {
  required: boolean
  description?: string
  schema: Schema
  contentType: string
}

export interface SchemaFieldProps {
  name: string
  schema: Schema
  value: any
  onChange: (value: any) => void
  required?: boolean
  level?: number
}

export type SchemaValue = string | number | boolean | any[] | Record<string, any> | undefined