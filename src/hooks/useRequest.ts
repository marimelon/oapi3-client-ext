import { useCallback } from 'react'
import { RequestBuilder, RequestConfig, RequestResult } from '../lib/request'
import { Environment, OpenAPISpec, EndpointInfo } from '../types'
import { useStorage } from './useStorage'
import { useAppContext } from '../context/AppContext'
import { lastRequestStorage } from '../lib/lastRequestStorage'

export interface RequestState {
  loading: boolean
  result: RequestResult | null
  error: string | null
}

export function useRequest() {
  const { state, dispatch } = useAppContext()
  const { saveRequestHistory } = useStorage()
  const requestBuilder = RequestBuilder.getInstance()
  
  const requestState = state.requestState

  // リクエスト実行
  const executeRequest = useCallback(async (
    spec: OpenAPISpec,
    endpoint: EndpointInfo,
    environment: Environment,
    parameters: {
      pathParams: Record<string, string>
      queryParams: Record<string, string>
      headers: Record<string, string>
      body?: any
    }
  ) => {
    try {
      dispatch({ type: 'SET_REQUEST_LOADING', payload: true })
      dispatch({ type: 'SET_REQUEST_ERROR', payload: null })

      // URLの構築
      const url = requestBuilder.buildUrl(
        environment.baseUrl,
        endpoint.path,
        parameters.pathParams,
        parameters.queryParams
      )

      // ヘッダーの構築
      const headers = requestBuilder.buildHeaders(
        environment.headers,
        parameters.headers
      )

      // Store request parameters for audit trail
      lastRequestStorage.setLastRequestParams({
        pathParams: parameters.pathParams,
        queryParams: parameters.queryParams,
        headers,
        body: parameters.body
      })

      // リクエスト設定
      const config: RequestConfig = {
        method: endpoint.method,
        url,
        headers,
        body: parameters.body,
        timeout: 30000
      }

      // リクエスト実行
      const result = await requestBuilder.executeRequest(config)

      // 履歴保存
      const historyEntry = requestBuilder.createHistoryEntry(
        spec.id,
        environment.id,
        endpoint.method,
        endpoint.path,
        {
          pathParams: parameters.pathParams,
          queryParams: parameters.queryParams
        },
        headers,
        parameters.body,
        result
      )
      
      await saveRequestHistory(historyEntry)

      dispatch({ type: 'SET_REQUEST_LOADING', payload: false })
      dispatch({ type: 'SET_REQUEST_RESULT', payload: result })
      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Request failed'
      dispatch({ type: 'SET_REQUEST_ERROR', payload: errorMessage })
      throw error
    }
  }, [requestBuilder, saveRequestHistory, dispatch])

  // パラメータバリデーション
  const validateParameters = useCallback((
    pathParams: Record<string, string>,
    requiredPathParams: string[],
    queryParams: Record<string, string>,
    requiredQueryParams: string[]
  ) => {
    return requestBuilder.validateParameters(
      pathParams,
      requiredPathParams,
      queryParams,
      requiredQueryParams
    )
  }, [requestBuilder])

  // cURLコマンド生成
  const generateCurlCommand = useCallback((
    endpoint: EndpointInfo,
    environment: Environment,
    parameters: {
      pathParams: Record<string, string>
      queryParams: Record<string, string>
      headers: Record<string, string>
      body?: any
    }
  ) => {
    try {
      const url = requestBuilder.buildUrl(
        environment.baseUrl,
        endpoint.path,
        parameters.pathParams,
        parameters.queryParams
      )

      const headers = requestBuilder.buildHeaders(
        environment.headers,
        parameters.headers
      )

      const config: RequestConfig = {
        method: endpoint.method,
        url,
        headers,
        body: parameters.body
      }

      return requestBuilder.generateCurlCommand(config)
    } catch (error) {
      console.error('Failed to generate cURL command:', error)
      return ''
    }
  }, [requestBuilder])

  // レスポンス整形
  const formatResponse = useCallback((result: RequestResult) => {
    return requestBuilder.formatResponse(result)
  }, [requestBuilder])

  // Content-Type推測
  const inferContentType = useCallback((body: any) => {
    return requestBuilder.inferContentType(body)
  }, [requestBuilder])

  // リクエスト状態リセット
  const resetRequestState = useCallback(() => {
    dispatch({ type: 'SET_REQUEST_LOADING', payload: false })
    dispatch({ type: 'SET_REQUEST_RESULT', payload: null })
    dispatch({ type: 'SET_REQUEST_ERROR', payload: null })
  }, [dispatch])

  return {
    // 状態
    requestState,
    
    // アクション
    executeRequest,
    validateParameters,
    generateCurlCommand,
    formatResponse,
    inferContentType,
    resetRequestState
  }
}