import { useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStorage } from '../../hooks/useStorage'
import { useOpenApi } from '../../hooks/useOpenApi'
import { getMethodColor } from '../../lib/utils'
import ApiLoader from './ApiLoader'
import EnvironmentSelector from './EnvironmentSelector'

export default function Sidebar() {
  const { state, dispatch } = useAppContext()
  const { deleteOpenApiSpec } = useStorage()
  const { loadEndpoints, endpoints } = useOpenApi()
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const handleApiSelect = (spec: any) => {
    dispatch({ type: 'SET_SELECTED_SPEC', payload: spec })
    dispatch({ type: 'SET_SELECTED_ENDPOINT', payload: null })
    loadEndpoints(spec)
    
    // APIを展開
    setExpandedApis(prev => new Set([...prev, spec.id]))
  }

  const handleApiDelete = async (spec: any, event: React.MouseEvent) => {
    event.stopPropagation()
    if (confirm(`Delete "${spec.name}"?`)) {
      await deleteOpenApiSpec(spec.id)
    }
  }

  const handleEndpointSelect = (endpoint: any) => {
    dispatch({ type: 'SET_SELECTED_ENDPOINT', payload: endpoint })
  }

  const toggleApiExpansion = (apiId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setExpandedApis(prev => {
      const newSet = new Set(prev)
      if (newSet.has(apiId)) {
        newSet.delete(apiId)
      } else {
        newSet.add(apiId)
      }
      return newSet
    })
  }

  const filteredEndpoints = endpoints.filter(endpoint => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      endpoint.path.toLowerCase().includes(term) ||
      endpoint.method.toLowerCase().includes(term) ||
      endpoint.summary?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 環境選択 */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <EnvironmentSelector />
      </div>

      {/* API読み込み */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <ApiLoader />
      </div>

      {/* 検索 */}
      {state.selectedSpec && endpoints.length > 0 && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder="Search endpoints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* API一覧 */}
      <div className="flex-1 overflow-auto">
        {state.openApiSpecs.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <div className="text-3xl mb-1">📋</div>
            <p className="text-sm">No APIs loaded</p>
          </div>
        ) : (
          <div className="space-y-1">
            {state.openApiSpecs.map((spec) => {
              const isSelected = state.selectedSpec?.id === spec.id
              const isExpanded = expandedApis.has(spec.id)
              const showEndpoints = isSelected && isExpanded

              return (
                <div key={spec.id}>
                  {/* API項目 */}
                  <div
                    onClick={() => handleApiSelect(spec)}
                    className={`group flex items-center justify-between p-1.5 mx-1 rounded cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {/* 展開ボタン */}
                      <button
                        onClick={(e) => toggleApiExpansion(spec.id, e)}
                        className="p-1 rounded hover:bg-gray-200"
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      
                      {/* API情報 */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
                          {spec.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {spec.spec?.info?.version && `v${spec.spec.info.version}`}
                        </div>
                      </div>
                    </div>

                    {/* 削除ボタン */}
                    <button
                      onClick={(e) => handleApiDelete(spec, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  {/* エンドポイント一覧 */}
                  {showEndpoints && (
                    <div className="ml-4 mr-1 mb-1">
                      {filteredEndpoints.length === 0 ? (
                        <div className="p-2 text-center text-gray-500 dark:text-gray-400 text-xs">
                          No endpoints found
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {filteredEndpoints.map((endpoint, index) => {
                            const isEndpointSelected = 
                              state.selectedEndpoint?.path === endpoint.path &&
                              state.selectedEndpoint?.method === endpoint.method

                            return (
                              <div
                                key={`${endpoint.method}-${endpoint.path}-${index}`}
                                onClick={() => handleEndpointSelect(endpoint)}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  isEndpointSelected 
                                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' 
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-1 mb-0.5">
                                  <span className={`px-1 py-0.5 text-xs font-medium rounded ${getMethodColor(endpoint.method)}`}>
                                    {endpoint.method}
                                  </span>
                                </div>
                                <div className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                                  {endpoint.path}
                                </div>
                                {endpoint.summary && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                    {endpoint.summary}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}