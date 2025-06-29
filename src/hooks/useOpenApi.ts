import { useState, useCallback } from 'react'
import { OpenApiParser } from '../lib/openapi'
import { OpenAPISpec, EndpointInfo } from '../types'
import { generateId } from '../lib/utils'
import { useAppContext } from '../context/AppContext'

export function useOpenApi() {
  const { dispatch } = useAppContext()
  const parser = OpenApiParser.getInstance()
  const [endpoints, setEndpoints] = useState<EndpointInfo[]>([])
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointInfo | null>(null)

  // ファイルからOpenAPI仕様を読み込み
  const loadSpecFromFile = useCallback(async (file: File): Promise<OpenAPISpec | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const text = await file.text()
      const parsedSpec = await parser.parseSpec(text)
      
      const spec: OpenAPISpec = {
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ''), // 拡張子を除去
        spec: parsedSpec,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return spec
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse specification'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return null
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [dispatch, parser])

  // URLからOpenAPI仕様を読み込み
  const loadSpecFromUrl = useCallback(async (url: string, name?: string): Promise<OpenAPISpec | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      dispatch({ type: 'SET_ERROR', payload: null })

      const parsedSpec = await parser.fetchSpecFromUrl(url)
      
      const spec: OpenAPISpec = {
        id: generateId(),
        name: name || parsedSpec.info?.title || 'API Specification',
        spec: parsedSpec,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      return spec
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch specification'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      return null
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [dispatch, parser])

  // エンドポイント一覧を取得
  const loadEndpoints = useCallback((spec: OpenAPISpec) => {
    try {
      const endpointList = parser.getEndpoints(spec.spec)
      setEndpoints(endpointList)
      setSelectedEndpoint(null)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load endpoints' })
      setEndpoints([])
    }
  }, [dispatch, parser])

  // エンドポイントを選択
  const selectEndpoint = useCallback((endpoint: EndpointInfo) => {
    setSelectedEndpoint(endpoint)
  }, [])

  // パラメータスキーマを取得
  const getParameterSchema = useCallback((spec: OpenAPISpec, path: string, method: string) => {
    try {
      return parser.getParameterSchema(spec.spec, path, method)
    } catch (error) {
      console.error('Failed to get parameter schema:', error)
      return null
    }
  }, [parser])

  // リクエストボディスキーマを取得
  const getRequestBodySchema = useCallback((spec: OpenAPISpec, path: string, method: string) => {
    try {
      return parser.getRequestBodySchema(spec.spec, path, method)
    } catch (error) {
      console.error('Failed to get request body schema:', error)
      return null
    }
  }, [parser])

  // レスポンススキーマを取得
  const getResponseSchemas = useCallback((spec: OpenAPISpec, path: string, method: string) => {
    try {
      return parser.getResponseSchemas(spec.spec, path, method)
    } catch (error) {
      console.error('Failed to get response schemas:', error)
      return {}
    }
  }, [parser])

  // リクエストデータのバリデーション
  const validateRequestData = useCallback((schema: any, data: any) => {
    try {
      return parser.validateRequest(schema, data)
    } catch (error) {
      console.error('Validation error:', error)
      return { valid: false, errors: ['Validation failed'] }
    }
  }, [parser])

  // サンプルデータ生成
  const generateSampleData = useCallback((schema: any) => {
    try {
      return parser.generateSampleData(schema)
    } catch (error) {
      console.error('Failed to generate sample data:', error)
      return null
    }
  }, [parser])

  // エンドポイントフィルタリング
  const filterEndpoints = useCallback((searchTerm: string, method?: string) => {
    let filtered = endpoints

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(endpoint => 
        endpoint.path.toLowerCase().includes(term) ||
        endpoint.summary?.toLowerCase().includes(term) ||
        endpoint.description?.toLowerCase().includes(term)
      )
    }

    if (method && method !== 'ALL') {
      filtered = filtered.filter(endpoint => 
        endpoint.method.toLowerCase() === method.toLowerCase()
      )
    }

    return filtered
  }, [endpoints])

  return {
    // 仕様読み込み
    loadSpecFromFile,
    loadSpecFromUrl,
    
    // エンドポイント管理
    endpoints,
    selectedEndpoint,
    loadEndpoints,
    selectEndpoint,
    filterEndpoints,
    
    // スキーマ取得
    getParameterSchema,
    getRequestBodySchema,
    getResponseSchemas,
    
    // ユーティリティ
    validateRequestData,
    generateSampleData
  }
}