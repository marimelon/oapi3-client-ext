import * as yaml from 'js-yaml'
import { EndpointInfo, HttpMethod } from '../types'
import { safeJsonParse, debugLog } from './utils'
import { OPENAPI_CONSTANTS } from './constants'

export class OpenApiParser {
  private static instance: OpenApiParser
  
  public static getInstance(): OpenApiParser {
    if (!OpenApiParser.instance) {
      OpenApiParser.instance = new OpenApiParser()
    }
    return OpenApiParser.instance
  }

  // OpenAPI仕様のパース
  async parseSpec(specContent: string | object): Promise<any> {
    try {
      let spec: any

      if (typeof specContent === 'string') {
        // YAML形式の場合
        if (specContent.trim().startsWith('openapi:') || specContent.trim().startsWith('swagger:')) {
          debugLog('Parsing YAML format...')
          spec = yaml.load(specContent, { 
            schema: yaml.JSON_SCHEMA 
          })
          debugLog('YAML parsed successfully')
        } else {
          // JSON形式の場合
          debugLog('Parsing JSON format...')
          spec = safeJsonParse(specContent)
          if (!spec) {
            throw new Error('Invalid JSON format')
          }
          debugLog('JSON parsed successfully')
        }
      } else {
        spec = specContent
      }

      // 基本的なバリデーション（SwaggerParserの代替）
      if (!(spec as any).openapi && !(spec as any).swagger) {
        throw new Error('Not a valid OpenAPI specification')
      }

      // $ref参照を解決
      const resolvedSpec = this.resolveReferences(spec)
      
      // 解決後の仕様をデバッグ出力
      debugLog('Checking components structure:', {
        components: !!resolvedSpec.components,
        parameters: !!resolvedSpec.components?.parameters,
        schemas: !!resolvedSpec.components?.schemas
      })
      
      if (resolvedSpec.components?.parameters) {
        debugLog('Available parameters:', Object.keys(resolvedSpec.components.parameters))
      }
      
      if (resolvedSpec.paths) {
        const samplePath = Object.keys(resolvedSpec.paths)[0]
        if (samplePath) {
          const sampleOperation = Object.values(resolvedSpec.paths[samplePath])[0] as any
          if (sampleOperation?.parameters) {
            console.log('🧪 Sample resolved parameters:', sampleOperation.parameters.slice(0, 2))
          }
        }
      }
      
      return resolvedSpec
    } catch (error) {
      console.error('Failed to parse OpenAPI spec:', error)
      throw new Error(`Failed to parse OpenAPI specification: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // URLからOpenAPI仕様を取得
  async fetchSpecFromUrl(url: string): Promise<any> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const contentType = response.headers.get('content-type') || ''
      let specContent: string
      
      if (contentType.includes('application/json')) {
        const jsonData = await response.json()
        specContent = JSON.stringify(jsonData)
      } else {
        specContent = await response.text()
      }
      
      return await this.parseSpec(specContent)
    } catch (error) {
      console.error('Failed to fetch OpenAPI spec from URL:', error)
      throw new Error(`Failed to fetch specification from URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // $ref参照を解決する（改良版）
  private resolveReferences(spec: any): any {
    try {
      debugLog('Starting reference resolution...')
      const resolvedSpec = JSON.parse(JSON.stringify(spec)) // Deep copy
      
      // まず全エンドポイントの$ref参照を収集
      const allRefs = this.collectAllRefs(resolvedSpec)
      debugLog(`Found ${allRefs.size} unique $ref references to resolve`)
      
      // 段階的に解決
      let retryCount = 0
      const maxRetries = 3
      
      while (retryCount < maxRetries) {
        const visitedRefs = new Set<string>() // 循環参照検出用
        const resolutionStack: string[] = [] // 解決スタック追跡用
        
        try {
          this.resolveReferencesRecursive(resolvedSpec, resolvedSpec, visitedRefs, resolutionStack)
          
          // 解決状況をチェック
          const remainingRefs = this.collectAllRefs(resolvedSpec)
          debugLog(`Retry ${retryCount + 1}: ${remainingRefs.size} references remaining`)
          
          if (remainingRefs.size === 0) {
            debugLog('All references resolved successfully')
            break
          }
          
          retryCount++
        } catch (error) {
          console.warn(`❌ Retry ${retryCount + 1} failed:`, error)
          retryCount++
        }
      }
      
      debugLog('Reference resolution completed')
      return resolvedSpec
    } catch (error) {
      console.warn('❌ Failed to resolve references, using original spec:', error)
      return spec
    }
  }

  // 全$ref参照を収集
  private collectAllRefs(obj: any, refs: Set<string> = new Set()): Set<string> {
    if (obj === null || typeof obj !== 'object') {
      return refs
    }

    if (Array.isArray(obj)) {
      obj.forEach(item => this.collectAllRefs(item, refs))
      return refs
    }

    if (obj.$ref && typeof obj.$ref === 'string') {
      refs.add(obj.$ref)
    }

    for (const value of Object.values(obj)) {
      this.collectAllRefs(value, refs)
    }

    return refs
  }

  // 再帰的に$ref参照を解決（循環参照検出付き）
  private resolveReferencesRecursive(
    obj: any, 
    rootSpec: any, 
    visitedRefs: Set<string> = new Set(), 
    resolutionStack: string[] = [],
    maxDepth: number = OPENAPI_CONSTANTS.DEFAULT_MAX_DEPTH
  ): any {
    // 最大深度チェック
    if (resolutionStack.length > maxDepth) {
      console.warn(`⚠️ Maximum resolution depth (${maxDepth}) exceeded. Stack:`, resolutionStack)
      return obj
    }

    if (obj === null || typeof obj !== 'object') {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveReferencesRecursive(item, rootSpec, visitedRefs, resolutionStack, maxDepth))
    }

    // $refが見つかった場合
    if (obj.$ref && typeof obj.$ref === 'string') {
      const refPath = obj.$ref
      
      // 循環参照チェック
      if (resolutionStack.includes(refPath)) {
        console.warn(`🔄 Circular reference detected: ${refPath}`)
        console.warn(`📚 Resolution stack: ${resolutionStack.join(' -> ')} -> ${refPath}`)
        // 循環参照の場合は元のオブジェクトを返す（$refのまま）
        return { $ref: refPath, _circular: true }
      }

      // 訪問済み参照の重複解決を防ぐ
      if (visitedRefs.has(refPath)) {
        console.log(`♻️ Reference already resolved: ${refPath}`)
        try {
          // 既に解決済みの参照を再度取得
          return this.resolveReference(refPath, rootSpec)
        } catch (error) {
          console.warn(`❌ Failed to re-resolve reference ${refPath}:`, error)
          return obj
        }
      }

      try {
        console.log(`🔍 Resolving reference: ${refPath} (depth: ${resolutionStack.length})`)
        
        // 解決スタックに追加
        const newResolutionStack = [...resolutionStack, refPath]
        
        const resolved = this.resolveReference(refPath, rootSpec)
        if (resolved) {
          // 訪問済みに追加
          visitedRefs.add(refPath)
          console.log(`✅ Reference resolved: ${refPath}`)
          
          // 解決した参照をさらに再帰的に処理
          return this.resolveReferencesRecursive(resolved, rootSpec, visitedRefs, newResolutionStack, maxDepth)
        }
      } catch (error) {
        console.warn(`❌ Failed to resolve reference ${refPath}:`, error)
        return obj
      }
    }

    // オブジェクトの各プロパティを再帰的に処理
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (key !== '$ref') { // $refプロパティは除外
        result[key] = this.resolveReferencesRecursive(value, rootSpec, visitedRefs, resolutionStack, maxDepth)
      }
    }

    return result
  }

  // 単一の$ref参照を解決
  private resolveReference(refPath: string, rootSpec: any): any {
    if (!refPath.startsWith('#/')) {
      // 外部ファイル参照は現在サポートしない
      console.warn(`External reference not supported: ${refPath}`)
      return null
    }

    // #/components/parameters/Ids -> ['components', 'parameters', 'Ids']
    const pathParts = refPath.substring(2).split('/')
    console.log(`🔍 Resolving path: ${refPath} -> [${pathParts.join(', ')}]`)
    
    let current = rootSpec
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
        console.log(`  ✅ Found: ${pathParts.slice(0, i + 1).join('/')}`)
      } else {
        console.error(`❌ Reference path not found at: ${pathParts.slice(0, i + 1).join('/')}`)
        console.error(`Available keys at this level:`, current ? Object.keys(current) : 'null/undefined')
        throw new Error(`Reference path not found: ${refPath}`)
      }
    }

    console.log(`🎯 Final resolved value for ${refPath}:`, current)
    return current
  }

  // エンドポイント一覧取得
  getEndpoints(spec: any): EndpointInfo[] {
    try {
      const endpoints: EndpointInfo[] = []
      const paths = spec.paths || {}

      for (const [path, pathItem] of Object.entries(paths)) {
        if (typeof pathItem !== 'object' || pathItem === null) continue

        const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']
        
        for (const method of methods) {
          const operation = (pathItem as any)[method]
          if (operation) {
            endpoints.push({
              path,
              method: method.toUpperCase() as HttpMethod,
              summary: operation.summary,
              description: operation.description,
              parameters: operation.parameters,
              requestBody: operation.requestBody,
              responses: operation.responses
            })
          }
        }
      }

      return endpoints.sort((a, b) => a.path.localeCompare(b.path))
    } catch (error) {
      console.error('Failed to extract endpoints:', error)
      return []
    }
  }

  // パラメータスキーマ取得
  getParameterSchema(spec: any, path: string, method: string): any {
    try {
      // console.log(`🔍 Getting parameter schema for: ${method} ${path}`)
      const operation = spec.paths?.[path]?.[method.toLowerCase()]
      if (!operation) {
        // console.log('❌ No operation found')
        return null
      }

      const parameters = operation.parameters || []
      // console.log(`📋 Found ${parameters.length} parameters:`, parameters)

      const schema: {
        path: any[]
        query: any[]
        header: any[]
        cookie: any[]
      } = {
        path: [],
        query: [],
        header: [],
        cookie: []
      }

      for (const param of parameters) {
        // $refがまだ残っている場合の警告と手動解決
        if (param.$ref) {
          console.warn(`⚠️ Unresolved $ref found in parameter: ${param.$ref}`)
          
          // 手動で解決を試行
          try {
            const resolved = this.resolveReference(param.$ref, spec)
            if (resolved && resolved.name && resolved.in) {
              console.log(`🔄 Manual resolution successful for: ${param.$ref}`)
              // 解決されたパラメータを使用
              const resolvedParam = resolved
              
              const paramInfo = {
                name: resolvedParam.name,
                required: resolvedParam.required || false,
                type: resolvedParam.schema?.type || 'string',
                description: resolvedParam.description,
                example: resolvedParam.example || resolvedParam.schema?.example,
                enum: resolvedParam.schema?.enum,
                format: resolvedParam.schema?.format
              }

              // console.log(`✅ Processing resolved parameter: ${resolvedParam.name} (${resolvedParam.in})`)

              switch (resolvedParam.in) {
                case 'path':
                  schema.path.push(paramInfo)
                  break
                case 'query':
                  schema.query.push(paramInfo)
                  break
                case 'header':
                  schema.header.push(paramInfo)
                  break
                case 'cookie':
                  schema.cookie.push(paramInfo)
                  break
                default:
                  console.warn(`⚠️ Unknown parameter location: ${resolvedParam.in}`)
              }
              continue
            }
          } catch (error) {
            console.warn(`❌ Manual resolution failed for ${param.$ref}:`, error)
          }
          
          continue
        }

        if (!param.name || !param.in) {
          console.warn('⚠️ Invalid parameter structure:', param)
          continue
        }

        const paramInfo = {
          name: param.name,
          required: param.required || false,
          type: param.schema?.type || 'string',
          description: param.description,
          example: param.example || param.schema?.example,
          enum: param.schema?.enum,
          format: param.schema?.format
        }

        // console.log(`✅ Processing parameter: ${param.name} (${param.in})`)

        switch (param.in) {
          case 'path':
            schema.path.push(paramInfo)
            break
          case 'query':
            schema.query.push(paramInfo)
            break
          case 'header':
            schema.header.push(paramInfo)
            break
          case 'cookie':
            schema.cookie.push(paramInfo)
            break
          default:
            console.warn(`⚠️ Unknown parameter location: ${param.in}`)
        }
      }

      // console.log('📊 Final parameter schema:', schema)
      return schema
    } catch (error) {
      console.error('❌ Failed to get parameter schema:', error)
      return null
    }
  }

  // リクエストボディスキーマ取得
  getRequestBodySchema(spec: any, path: string, method: string): any {
    try {
      const operation = spec.paths?.[path]?.[method.toLowerCase()]
      if (!operation?.requestBody) return null

      const requestBody = operation.requestBody
      const content = requestBody.content || {}
      
      // JSON形式を優先的に探す
      const jsonContent = content['application/json'] || 
                         content['application/vnd.api+json'] ||
                         Object.values(content)[0]

      if (!jsonContent?.schema) return null

      return {
        required: requestBody.required || false,
        description: requestBody.description,
        schema: jsonContent.schema,
        contentType: Object.keys(content)[0] || 'application/json',
        example: jsonContent.example || jsonContent.schema.example
      }
    } catch (error) {
      console.error('Failed to get request body schema:', error)
      return null
    }
  }

  // レスポンススキーマ取得
  getResponseSchemas(spec: any, path: string, method: string): any {
    try {
      const operation = spec.paths?.[path]?.[method.toLowerCase()]
      if (!operation?.responses) return {}

      const responses: Record<string, any> = {}
      
      for (const [statusCode, response] of Object.entries(operation.responses)) {
        if (typeof response !== 'object' || response === null) continue
        
        const responseData = response as any
        const content = responseData.content || {}
        const jsonContent = content['application/json'] || Object.values(content)[0]
        
        responses[statusCode] = {
          description: responseData.description,
          schema: jsonContent?.schema,
          example: jsonContent?.example || jsonContent?.schema?.example,
          headers: responseData.headers
        }
      }

      return responses
    } catch (error) {
      console.error('Failed to get response schemas:', error)
      return {}
    }
  }

  // バリデーション
  validateRequest(schema: any, data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!schema) {
      return { valid: true, errors: [] }
    }

    try {
      // 必須フィールドのチェック
      if (schema.required && Array.isArray(schema.required)) {
        for (const requiredField of schema.required) {
          if (data[requiredField] === undefined || data[requiredField] === null || data[requiredField] === '') {
            errors.push(`Required field '${requiredField}' is missing`)
          }
        }
      }

      // 型チェック（基本的なもの）
      if (schema.properties) {
        for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
          const fieldValue = data?.[fieldName]
          if (fieldValue !== undefined && fieldValue !== null) {
            const fieldSchemaTyped = fieldSchema as any
            if (fieldSchemaTyped.type && !this.validateFieldType(fieldValue, fieldSchemaTyped.type)) {
              errors.push(`Field '${fieldName}' should be of type '${fieldSchemaTyped.type}'`)
            }
          }
        }
      }

      return { valid: errors.length === 0, errors }
    } catch (error) {
      console.error('Validation error:', error)
      return { valid: false, errors: ['Validation failed'] }
    }
  }

  private validateFieldType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string'
      case 'number':
      case 'integer':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'array':
        return Array.isArray(value)
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      default:
        return true
    }
  }

  // スキーマからサンプルデータ生成
  generateSampleData(schema: any): any {
    if (!schema || typeof schema !== 'object') return null

    if (schema.example !== undefined) {
      return schema.example
    }

    if (schema.type === 'object' && schema.properties) {
      const sample: Record<string, any> = {}
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        sample[key] = this.generateSampleData(propSchema)
      }
      return sample
    }

    if (schema.type === 'array' && schema.items) {
      return [this.generateSampleData(schema.items)]
    }

    switch (schema.type) {
      case 'string':
        return schema.enum ? schema.enum[0] : 'string'
      case 'number':
        return 0
      case 'integer':
        return 0
      case 'boolean':
        return false
      default:
        return null
    }
  }
}
