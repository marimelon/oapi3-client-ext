import type { Schema } from '../types/schema'

export function isObjectProperty(obj: any, key: string): boolean {
  return obj && typeof obj === 'object' && key in obj
}

export function filterReadOnlyProperties(properties: Record<string, Schema>): Array<[string, Schema]> {
  return Object.entries(properties).filter(([, propSchema]) => !propSchema.readOnly)
}

export function getInputType(schema: Schema): string {
  if (schema.format === 'date-time') return 'datetime-local'
  if (schema.format === 'date') return 'date'
  if (schema.format === 'url') return 'url'
  if (schema.type === 'number' || schema.type === 'integer') return 'number'
  return 'text'
}

export function hasOneOfSchema(schema: Schema): boolean {
  return Boolean(schema.oneOf && Array.isArray(schema.oneOf))
}

export function canUseFormMode(schema: any): boolean {
  if (!schema || !schema.schema) return false

  const s = schema.schema
  const schemaType = s.type

  // type が明示されていなくても properties や items があればフォームモード可
  if (!schemaType) {
    return Boolean(s.properties || s.items)
  }

  return Boolean(
    schemaType === 'object' ||
    schemaType === 'array' ||
    schemaType === 'string' ||
    schemaType === 'number' ||
    schemaType === 'integer' ||
    schemaType === 'boolean'
  )
}