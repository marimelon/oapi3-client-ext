import { useState, useEffect, useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useOpenApi } from '../../hooks/useOpenApi'
import { useRequest } from '../../hooks/useRequest'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { useSavedRequest } from '../../hooks/useSavedRequest'
import { useUrlInput } from '../../hooks/useUrlInput'
import { HttpMethod } from '../../types'
import {
  extractPathParameters,
  validatePathParameters,
  buildUrlPreview
} from '../../lib/url-utils'
import RequestBodyEditor from './RequestBodyEditor'
import PathParametersSection from './PathParametersSection'
import QueryParametersSection from './QueryParametersSection'
import CustomQueryParametersSection from './CustomQueryParametersSection'
import CustomHeadersSection from './CustomHeadersSection'
import AuthSection from './AuthSection'

export default function RequestPanel() {
  const { state } = useAppContext()
  const { getParameterSchema, getRequestBodySchema, generateSampleData } = useOpenApi()
  const { executeRequest, requestState } = useRequest()
  const { copied: copiedUrl, copyToClipboard } = useCopyToClipboard()

  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<Record<string, string>>({})
  const [customQueryParams, setCustomQueryParams] = useState<Record<string, string>>({})
  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [requestBody, setRequestBody] = useState('')
  const [customUrlPath, setCustomUrlPath] = useState('')
  const [customMethod, setCustomMethod] = useState('GET')

  const selectedEndpoint = state.selectedEndpoint

  const { hasSavedRequest, loadSavedRequest, autoSaveRequest } = useSavedRequest({
    selectedSpec: state.selectedSpec ?? null,
    selectedEndpoint,
  })

  const { inputFieldValue, handleUrlPathChange, handleUrlKeyDown, handleUrlBlur } = useUrlInput({
    customUrlPath,
    setCustomUrlPath,
    customQueryParams,
    setCustomQueryParams,
    queryParams,
  })

  const parameterSchema = useMemo(() => {
    return selectedEndpoint && state.selectedSpec
      ? getParameterSchema(state.selectedSpec, selectedEndpoint.path, selectedEndpoint.method)
      : null
  }, [selectedEndpoint, state.selectedSpec, getParameterSchema])

  const requestBodySchema = useMemo(() => {
    return selectedEndpoint && state.selectedSpec
      ? getRequestBodySchema(state.selectedSpec, selectedEndpoint.path, selectedEndpoint.method)
      : null
  }, [selectedEndpoint, state.selectedSpec, getRequestBodySchema])

  // URLプレビュー
  const allQueryParams = { ...queryParams, ...customQueryParams }
  const currentPath = customUrlPath || selectedEndpoint?.path || ''
  const urlPreview = state.selectedEnvironment
    ? buildUrlPreview(state.selectedEnvironment.baseUrl, currentPath, pathParams, allQueryParams)
    : ''

  // パスパラメータの自動抽出
  const pathParametersFromUrl = extractPathParameters(currentPath)

  // パスパラメータのバリデーション
  const pathParamValidation = validatePathParameters(currentPath, pathParams)

  // クエリパラメータのバリデーション
  const queryParamValidation = parameterSchema?.query ? (() => {
    const missing = parameterSchema.query
      .filter((param: any) => param.required && (!queryParams[param.name] || queryParams[param.name].trim() === ''))
      .map((param: any) => param.name)
    return { valid: missing.length === 0, missing }
  })() : { valid: true, missing: [] }

  // エンドポイント変更時に自動的にパスとメソッドを更新し、保存されたリクエストを読み込み
  useEffect(() => {
    if (!selectedEndpoint) return

    setCustomUrlPath(selectedEndpoint.path || '')
    setCustomMethod(selectedEndpoint.method || 'GET')

    loadSavedRequest().then((data) => {
      if (data) {
        setPathParams(data.pathParams)
        setQueryParams(data.queryParams)
        setHeaders(data.headers)
        if (data.body) {
          setRequestBody(data.body)
        }
      }
    })
  }, [selectedEndpoint])

  // 保存されたリクエストがない場合のみサンプルデータを生成
  useEffect(() => {
    if (hasSavedRequest) return

    const initialPathParams: Record<string, string> = {}
    pathParametersFromUrl.forEach(param => {
      initialPathParams[param] = ''
    })

    setPathParams(initialPathParams)
    setQueryParams({})
    setCustomQueryParams({})
    setHeaders({})
    setRequestBody('')

    if (requestBodySchema?.schema) {
      const sample = generateSampleData(requestBodySchema.schema)
      if (sample) {
        setRequestBody(JSON.stringify(sample, null, 2))
      }
    }
  }, [selectedEndpoint, requestBodySchema, generateSampleData, hasSavedRequest])

  // パスパラメータの変更に対応する別のuseEffect
  useEffect(() => {
    const initialPathParams: Record<string, string> = {}
    pathParametersFromUrl.forEach(param => {
      initialPathParams[param] = ''
    })
    setPathParams(initialPathParams)
  }, [pathParametersFromUrl.join(',')])

  const handleSendRequest = async () => {
    if (!state.selectedEnvironment) return

    if (!currentPath) {
      alert('Please enter a URL path')
      return
    }

    if (!pathParamValidation.valid) {
      alert(`Missing required path parameters: ${pathParamValidation.missing.join(', ')}`)
      return
    }

    if (!queryParamValidation.valid) {
      alert(`Missing required query parameters: ${queryParamValidation.missing.join(', ')}`)
      return
    }

    try {
      const finalEndpoint = {
        path: currentPath,
        method: customMethod as HttpMethod,
        summary: selectedEndpoint?.summary || 'Custom Request'
      }

      if (state.selectedSpec) {
        await autoSaveRequest({
          pathParams,
          queryParams: allQueryParams,
          headers,
          requestBody,
        })

        await executeRequest(
          state.selectedSpec,
          finalEndpoint,
          state.selectedEnvironment,
          {
            pathParams,
            queryParams: allQueryParams,
            headers,
            body: requestBody ? JSON.parse(requestBody) : undefined
          }
        )
      }
    } catch (error) {
      console.error('Request failed:', error)
      if (error instanceof SyntaxError) {
        alert('Invalid JSON in request body')
      }
    }
  }

  const handleParamChange = (
    type: 'path' | 'query' | 'header' | 'customQuery',
    name: string,
    value: string
  ) => {
    switch (type) {
      case 'path':
        setPathParams(prev => ({ ...prev, [name]: value }))
        break
      case 'query':
        setQueryParams(prev => ({ ...prev, [name]: value }))
        break
      case 'customQuery':
        setCustomQueryParams(prev => ({ ...prev, [name]: value }))
        break
      case 'header':
        setHeaders(prev => ({ ...prev, [name]: value }))
        break
    }
  }

  const addCustomQueryParam = () => {
    const newKey = `param${Object.keys(customQueryParams).length + 1}`
    setCustomQueryParams(prev => ({ ...prev, [newKey]: '' }))
  }

  const addCustomHeader = () => {
    const newKey = `header${Object.keys(headers).length + 1}`
    setHeaders(prev => ({ ...prev, [newKey]: '' }))
  }

  const removeCustomQueryParam = (key: string) => {
    setCustomQueryParams(prev => {
      const newParams = { ...prev }
      delete newParams[key]
      return newParams
    })
  }

  const updateCustomQueryParamKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return
    setCustomQueryParams(prev => {
      const newParams = { ...prev }
      const value = newParams[oldKey]
      delete newParams[oldKey]
      newParams[newKey] = value
      return newParams
    })
  }

  const removeHeader = (key: string) => {
    setHeaders(prev => {
      const newHeaders = { ...prev }
      delete newHeaders[key]
      return newHeaders
    })
  }

  const updateHeaderKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return
    setHeaders(prev => {
      const newHeaders = { ...prev }
      const value = newHeaders[oldKey]
      delete newHeaders[oldKey]
      newHeaders[newKey] = value
      return newHeaders
    })
  }

  if (!state.selectedEnvironment) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <div className="text-4xl mb-2">⚠️</div>
        <p>Please select an environment</p>
      </div>
    )
  }

  return (
    <div className="p-3">
      {/* エンドポイント情報 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-3">
        {/* URL設定 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <select
              value={customMethod}
              onChange={(e) => setCustomMethod(e.target.value)}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
            <input
              type="text"
              value={inputFieldValue}
              onChange={(e) => handleUrlPathChange(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              onBlur={handleUrlBlur}
              placeholder={selectedEndpoint?.path || '/api/v1/example?param=value'}
              className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSendRequest}
              disabled={requestState.loading || !pathParamValidation.valid || !queryParamValidation.valid}
              className="px-4 py-1 bg-blue-600 dark:bg-blue-700 text-white font-medium text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {requestState.loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </div>
              ) : (
                'Send'
              )}
            </button>
          </div>
          {selectedEndpoint && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                API Spec: <span className="font-mono">{selectedEndpoint.method} {selectedEndpoint.path}</span>
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setCustomUrlPath(selectedEndpoint.path)
                    setCustomMethod(selectedEndpoint.method)
                  }}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Reset to original API specification path and method"
                >
                  Reset to Spec
                </button>
                {hasSavedRequest && (
                  <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                    Auto-saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedEndpoint?.summary && (
          <p className="text-gray-700 dark:text-gray-300 mb-1 text-sm">{selectedEndpoint.summary}</p>
        )}

        {selectedEndpoint?.description && (
          <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">{selectedEndpoint.description}</p>
        )}

        {/* URLプレビュー */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Request URL</span>
            <button
              onClick={() => copyToClipboard(urlPreview)}
              className={`text-xs px-2 py-1 border rounded transition-colors ${
                copiedUrl
                  ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                  : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
              }`}
            >
              {copiedUrl ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
            {urlPreview || `${state.selectedEnvironment.baseUrl}${currentPath}`}
          </div>
          {!pathParamValidation.valid && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              ⚠️ Missing: {pathParamValidation.missing.join(', ')}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium">Env:</span> {state.selectedEnvironment.name}
        </div>
      </div>

      <AuthSection
        endpoint={selectedEndpoint}
        selectedSpec={state.selectedSpec}
        selectedEnvironment={state.selectedEnvironment}
      />

      <div className="space-y-3">
        <PathParametersSection
          pathParametersFromUrl={pathParametersFromUrl}
          parameterSchema={parameterSchema}
          pathParams={pathParams}
          onParamChange={(name, value) => handleParamChange('path', name, value)}
        />

        <QueryParametersSection
          parameterSchema={parameterSchema}
          queryParams={queryParams}
          onParamChange={(name, value) => handleParamChange('query', name, value)}
        />

        <CustomQueryParametersSection
          customQueryParams={customQueryParams}
          onParamChange={(name, value) => handleParamChange('customQuery', name, value)}
          onAdd={addCustomQueryParam}
          onRemove={removeCustomQueryParam}
          onKeyChange={updateCustomQueryParamKey}
          onClearAll={() => setCustomQueryParams({})}
        />

        <CustomHeadersSection
          headers={headers}
          onParamChange={(name, value) => handleParamChange('header', name, value)}
          onAdd={addCustomHeader}
          onRemove={removeHeader}
          onKeyChange={updateHeaderKey}
          onClearAll={() => setHeaders({})}
        />

        {/* リクエストボディ */}
        {(requestBodySchema || ['POST', 'PUT', 'PATCH', 'DELETE'].includes(customMethod.toUpperCase())) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Request Body
              {requestBodySchema?.required && <span className="text-red-500 ml-1">*</span>}
            </h3>
            {requestBodySchema?.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{requestBodySchema.description}</p>
            )}
            <RequestBodyEditor
              schema={requestBodySchema}
              value={requestBody}
              onChange={setRequestBody}
              placeholder={requestBodySchema?.example ? JSON.stringify(requestBodySchema.example, null, 2) : 'Enter JSON request body'}
            />
          </div>
        )}

        {/* バリデーション表示エリア */}
        {(!pathParamValidation.valid || !queryParamValidation.valid) && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
            ⚠️ Cannot send request: Missing required parameters
            {!pathParamValidation.valid && (
              <div className="mt-1">Path: {pathParamValidation.missing.join(', ')}</div>
            )}
            {!queryParamValidation.valid && (
              <div className="mt-1">Query: {queryParamValidation.missing.join(', ')}</div>
            )}
          </div>
        )}

        {pathParamValidation.valid && queryParamValidation.valid && (
          <div className="text-xs text-green-600 dark:text-green-400 text-center">
            ✅ All required parameters configured
            {pathParametersFromUrl.length > 0 && (
              <span className="ml-1">({pathParametersFromUrl.length} path, {parameterSchema?.query?.filter((p: any) => p.required).length || 0} query)</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
