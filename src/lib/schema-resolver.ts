import type { ResolvedRequestBodySchema } from '../types/schema'

export class SchemaResolver {
  /**
   * Recursively resolve $ref references in a schema
   */
  static resolveSchema(schema: any, rootSpec: any): any {
    if (!schema || !rootSpec) {
      return schema
    }

    return this.resolveRefsRecursive(schema, rootSpec, new Set())
  }

  /**
   * Resolve $ref references in a request body schema
   */
  static resolveRequestBodySchema(requestBodySchema: any, rootSpec: any): ResolvedRequestBodySchema | null {
    if (!requestBodySchema || !rootSpec) {
      return null
    }

    try {
      const resolvedSchemaObj = this.resolveSchema(requestBodySchema.schema, rootSpec)
      return {
        ...requestBodySchema,
        schema: resolvedSchemaObj
      }
    } catch (error) {
      console.warn('Failed to resolve request body schema:', error)
      return requestBodySchema
    }
  }

  private static resolveRefsRecursive(obj: any, rootSpec: any, visited: Set<string>): any {
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
        const resolved = this.resolveRefPath(refPath, rootSpec)
        
        if (resolved) {
          // Recursively resolve the resolved reference
          return this.resolveRefsRecursive(resolved, rootSpec, new Set(visited))
        }
      }
      return obj
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item: any) => this.resolveRefsRecursive(item, rootSpec, new Set(visited)))
    }

    // Handle objects - recursively resolve properties
    const resolved: any = {}
    for (const [key, value] of Object.entries(obj)) {
      resolved[key] = this.resolveRefsRecursive(value, rootSpec, new Set(visited))
    }
    
    return resolved
  }

  private static resolveRefPath(refPath: string, rootSpec: any): any {
    if (!refPath.startsWith('#/')) {
      return null
    }

    const pathParts = refPath.substring(2).split('/')
    let current: any = rootSpec
    
    for (const part of pathParts) {
      if (current && typeof current === 'object') {
        current = current[part]
      } else {
        return null
      }
    }
    
    return current
  }
}