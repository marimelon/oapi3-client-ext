import { useState, useEffect, useMemo } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useOpenApi } from '../../hooks/useOpenApi'
import { useRequest } from '../../hooks/useRequest'
import { useStorage } from '../../hooks/useStorage'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { HttpMethod, SavedRequest } from '../../types'
import { 
  extractPathParameters, 
  validatePathParameters, 
  buildUrlPreview 
} from '../../lib/utils'
import RequestBodyEditor from './RequestBodyEditor'

export default function RequestPanel() {
  const { state } = useAppContext()
  const { getParameterSchema, getRequestBodySchema, generateSampleData } = useOpenApi()
  const { executeRequest, requestState } = useRequest()
  const { saveSavedRequest, getSavedRequestByEndpoint } = useStorage()
  const { copied: copiedUrl, copyToClipboard } = useCopyToClipboard()
  
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<Record<string, string>>({})
  const [customQueryParams, setCustomQueryParams] = useState<Record<string, string>>({})
  const [headers, setHeaders] = useState<Record<string, string>>({})
  const [requestBody, setRequestBody] = useState('')
  const [customUrlPath, setCustomUrlPath] = useState('')
  const [customMethod, setCustomMethod] = useState('GET')
  const [hasSavedRequest, setHasSavedRequest] = useState(false)

  const selectedEndpoint = state.selectedEndpoint

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
  
  // URL入力フィールド用のフルパス（クエリパラメータを含む）
  const getFullUrlForInput = () => {
    let fullUrl = currentPath
    if (Object.keys(allQueryParams).length > 0) {
      const queryString = Object.entries(allQueryParams)
        .filter(([_, value]) => value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
      if (queryString) {
        fullUrl += '?' + queryString
      }
    }
    return fullUrl
  }

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

    // 1. まずエンドポイントの情報を自動設定
    setCustomUrlPath(selectedEndpoint.path || '')
    setCustomMethod(selectedEndpoint.method || 'GET')

    // 2. 保存されたリクエストを読み込み（これにより上書きされる可能性がある）
    loadSavedRequest()
  }, [selectedEndpoint])

  // 保存されたリクエストがない場合のみサンプルデータを生成
  useEffect(() => {
    if (hasSavedRequest) return

    // パスパラメータを自動で初期化
    const initialPathParams: Record<string, string> = {}
    pathParametersFromUrl.forEach(param => {
      initialPathParams[param] = ''
    })
    
    setPathParams(initialPathParams)
    setQueryParams({})
    setCustomQueryParams({})
    setHeaders({})
    setRequestBody('')

    // サンプルデータを生成
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
    if (!state.selectedEnvironment) {
      return
    }
    
    if (!currentPath) {
      alert('Please enter a URL path')
      return
    }

    // パスパラメータのバリデーション
    if (!pathParamValidation.valid) {
      alert(`Missing required path parameters: ${pathParamValidation.missing.join(', ')}`)
      return
    }

    // クエリパラメータのバリデーション
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
        // リクエスト実行前に設定を自動保存
        await autoSaveRequest()
        
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

  // URLからクエリパラメータを抽出する関数
  const extractQueryParamsFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://example.com${url}`)
      const params: Record<string, string> = {}
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value
      })
      return params
    } catch {
      return {}
    }
  }

  // クエリパラメータを抽出して分離する関数
  const extractAndSeparateQueryParams = (fullUrl: string) => {
    if (fullUrl.includes('?') && fullUrl.includes('=')) {
      const [pathPart, queryPart] = fullUrl.split('?', 2)
      // 完全なkey=value形式が含まれている場合のみ処理
      if (queryPart && queryPart.includes('=') && !queryPart.endsWith('=')) {
        const extractedParams = extractQueryParamsFromUrl(fullUrl)
        if (Object.keys(extractedParams).length > 0) {
          // パスとクエリパラメータを別々に設定
          setCustomUrlPath(pathPart)
          setCustomQueryParams(extractedParams)
        }
      }
    }
  }

  // 入力フィールドの状態を管理する別のstate
  const [inputFieldValue, setInputFieldValue] = useState('')

  // inputFieldValueを現在の状態に同期（カスタムクエリパラメータとAPIクエリパラメータが変更された時のみ）
  useEffect(() => {
    setInputFieldValue(getFullUrlForInput())
  }, [customUrlPath, JSON.stringify(customQueryParams), JSON.stringify(queryParams)])

  // URLパス変更時の処理
  const handleUrlPathChange = (newFullUrl: string) => {
    setInputFieldValue(newFullUrl)
    
    // クエリパラメータが含まれていない場合はパスのみ更新
    if (!newFullUrl.includes('?')) {
      setCustomUrlPath(newFullUrl)
    }
  }

  // キー入力時の処理（Enter, Tab, スペースで自動抽出）
  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === ' ') {
      extractAndSeparateQueryParams(inputFieldValue)
    }
  }

  // フィールドからフォーカスが外れた時の処理
  const handleUrlBlur = () => {
    extractAndSeparateQueryParams(inputFieldValue)
  }

  // URLコピー処理
  const handleUrlCopy = () => {
    copyToClipboard(urlPreview)
  }

  // エンドポイントキーを生成
  const getEndpointKey = (method: string, path: string) => {
    return `${method.toUpperCase()}:${path}`
  }

  // 保存されたリクエストを読み込み
  const loadSavedRequest = async () => {
    if (!state.selectedSpec || !selectedEndpoint) return
    
    try {
      const endpointKey = getEndpointKey(selectedEndpoint.method, selectedEndpoint.path)
      const savedRequest = await getSavedRequestByEndpoint(state.selectedSpec.id, endpointKey)
      
      if (savedRequest) {
        setPathParams(savedRequest.pathParams)
        setQueryParams(savedRequest.queryParams)
        setHeaders(savedRequest.headers)
        if (savedRequest.body) {
          setRequestBody(typeof savedRequest.body === 'string' ? savedRequest.body : JSON.stringify(savedRequest.body, null, 2))
        }
        setHasSavedRequest(true)
      } else {
        setHasSavedRequest(false)
      }
    } catch (error) {
      console.error('Failed to load saved request:', error)
    }
  }

  // リクエストを自動保存
  const autoSaveRequest = async () => {
    if (!state.selectedSpec || !selectedEndpoint) return
    
    try {
      const endpointKey = getEndpointKey(selectedEndpoint.method, selectedEndpoint.path)
      const savedRequest: SavedRequest = {
        id: `${state.selectedSpec.id}_${endpointKey}`,
        specId: state.selectedSpec.id,
        endpointKey,
        name: `${selectedEndpoint.method} ${selectedEndpoint.path}`,
        pathParams,
        queryParams: { ...queryParams, ...customQueryParams },
        headers,
        body: requestBody ? JSON.parse(requestBody) : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      await saveSavedRequest(savedRequest)
      setHasSavedRequest(true)
    } catch (error) {
      console.error('Failed to auto-save request:', error)
      // 自動保存のエラーは静かに処理（ユーザーにアラートは表示しない）
    }
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
              onClick={handleUrlCopy}
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


      <div className="space-y-3">
        {/* パスパラメータ */}
        {(pathParametersFromUrl.length > 0 || (parameterSchema?.path && parameterSchema.path.length > 0)) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Path Parameters
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ({pathParametersFromUrl.length})
              </span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* URL から抽出されたパラメータ */}
              {pathParametersFromUrl.map((paramName) => {
                const schemaParam = parameterSchema?.path?.find((p: any) => p.name === paramName)
                const isRequired = schemaParam?.required !== false // デフォルトでrequired
                const isMissing = !pathParams[paramName] || pathParams[paramName].trim() === ''
                
                return (
                  <div key={paramName}>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <div className="flex items-center space-x-1">
                        <span>{paramName}</span>
                        {isRequired && <span className="text-red-500">*</span>}
                        <span className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          URL
                        </span>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={pathParams[paramName] || ''}
                      onChange={(e) => handleParamChange('path', paramName, e.target.value)}
                      placeholder={schemaParam?.description || schemaParam?.example || `Enter ${paramName}`}
                      className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        isMissing && isRequired 
                          ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {schemaParam?.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{schemaParam.description}</p>
                    )}
                    {isMissing && isRequired && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Required</p>
                    )}
                  </div>
                )
              })}
              
              {/* OpenAPI仕様にあってURLにないパラメータ */}
              {parameterSchema?.path?.filter((param: any) => 
                !pathParametersFromUrl.includes(param.name)
              ).map((param: any) => (
                <div key={param.name}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <div className="flex items-center space-x-2">
                      <span>{param.name}</span>
                      {param.required && <span className="text-red-500">*</span>}
                      <span className="px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded">
                        Schema
                      </span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={pathParams[param.name] || ''}
                    onChange={(e) => handleParamChange('path', param.name, e.target.value)}
                    placeholder={param.description || param.example || `Enter ${param.name}`}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {param.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{param.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        {/* クエリパラメータ */}
        {parameterSchema?.query && parameterSchema.query.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3">
              Query Parameters
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ({parameterSchema.query.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {parameterSchema.query.map((param: any) => {
                const currentValue = queryParams[param.name] || ''
                const isRequired = param.required
                const isMissing = isRequired && (!currentValue || currentValue.trim() === '')
                
                return (
                  <div key={param.name}>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <div className="flex items-center space-x-1">
                        <span>{param.name}</span>
                        {isRequired && <span className="text-red-500">*</span>}
                        {param.type && (
                          <span className="px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {param.type}
                          </span>
                        )}
                        {param.format && (
                          <span className="px-1 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
                            {param.format}
                          </span>
                        )}
                      </div>
                    </label>
                    
                    {/* Enum選択肢がある場合はセレクトボックス */}
                    {param.enum && param.enum.length > 0 ? (
                      <select
                        value={currentValue}
                        onChange={(e) => handleParamChange('query', param.name, e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isMissing ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">-- Select {param.name} --</option>
                        {param.enum.map((option: any) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : param.type === 'boolean' ? (
                      /* Boolean型の場合はセレクトボックス */
                      <select
                        value={currentValue}
                        onChange={(e) => handleParamChange('query', param.name, e.target.value)}
                        className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isMissing ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <option value="">-- Select --</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : (
                      /* 通常のテキスト入力 */
                      <input
                        type={param.type === 'number' || param.type === 'integer' ? 'number' : 'text'}
                        value={currentValue}
                        onChange={(e) => handleParamChange('query', param.name, e.target.value)}
                        placeholder={param.example || param.description || `Enter ${param.name}`}
                        className={`w-full px-2 py-1 border rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          isMissing ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        step={param.type === 'number' ? 'any' : undefined}
                      />
                    )}
                    
                    {/* パラメータの説明 */}
                    {param.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{param.description}</p>
                    )}
                    
                    {/* エラーメッセージ */}
                    {isMissing && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Required</p>
                    )}
                    
                    {/* Enumの場合は選択肢を表示 */}
                    {param.enum && param.enum.length > 0 && param.enum.length <= 5 && (
                      <div className="mt-0.5">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Options: {param.enum.join(', ')}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* カスタムクエリパラメータ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
              Custom Query Parameters
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ({Object.keys(customQueryParams).length})
              </span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={addCustomQueryParam}
                className="px-2 py-1 bg-blue-600 dark:bg-blue-700 text-white text-xs rounded hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                + Add
              </button>
              {Object.keys(customQueryParams).length > 0 && (
                <button
                  onClick={() => setCustomQueryParams({})}
                  className="px-2 py-1 bg-gray-400 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-500 dark:hover:bg-gray-500"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(customQueryParams).map(([key, value], index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => updateCustomQueryParamKey(key, e.target.value)}
                  placeholder="Parameter name"
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleParamChange('customQuery', key, e.target.value)}
                  placeholder="Parameter value"
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => removeCustomQueryParam(key)}
                  className="px-2 py-1 bg-red-500 dark:bg-red-600 text-white text-sm rounded hover:bg-red-600 dark:hover:bg-red-500"
                >
                  ×
                </button>
              </div>
            ))}
            {Object.keys(customQueryParams).length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                No custom query parameters. Click "Add" to create one.
              </p>
            )}
          </div>
        </div>

        {/* カスタムヘッダー */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 flex items-center">
              Custom Headers
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                ({Object.keys(headers).length})
              </span>
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={addCustomHeader}
                className="px-2 py-1 bg-blue-600 dark:bg-blue-700 text-white text-xs rounded hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                + Add
              </button>
              {Object.keys(headers).length > 0 && (
                <button
                  onClick={() => setHeaders({})}
                  className="px-2 py-1 bg-gray-400 dark:bg-gray-600 text-white text-xs rounded hover:bg-gray-500 dark:hover:bg-gray-500"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(headers).map(([key, value], index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={key}
                  onChange={(e) => {
                    const newHeaders = { ...headers }
                    delete newHeaders[key]
                    newHeaders[e.target.value] = value
                    setHeaders(newHeaders)
                  }}
                  placeholder="Header name"
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleParamChange('header', key, e.target.value)}
                  placeholder="Header value"
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    const newHeaders = { ...headers }
                    delete newHeaders[key]
                    setHeaders(newHeaders)
                  }}
                  className="px-2 py-1 bg-red-500 dark:bg-red-600 text-white text-sm rounded hover:bg-red-600 dark:hover:bg-red-500"
                >
                  ×
                </button>
              </div>
            ))}
            {Object.keys(headers).length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                No custom headers. Click "Add" to create one.
              </p>
            )}
          </div>
        </div>

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