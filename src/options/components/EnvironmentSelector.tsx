import { useState, useRef, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStorage } from '../../hooks/useStorage'
import { Environment, AuthConfig } from '../../types'
import { generateId } from '../../lib/utils'
import { getSecuritySchemes } from '../../lib/auth'
import AuthConfigForm from './AuthConfigForm'

export default function EnvironmentSelector() {
  const { state, dispatch } = useAppContext()
  const { saveEnvironment, deleteEnvironment, saveSelectedEnvironment } = useStorage()
  const [showForm, setShowForm] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null)
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null)
  const [inlineEditValue, setInlineEditValue] = useState('')
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  
  // showTooltipは将来のツールチップ機能用（現在は未使用）
  // ESLintエラーを回避するため明示的に未使用と記載
  void showTooltip
  const inlineInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<{
    name: string
    baseUrl: string
    headers: Array<{ key: string; value: string }>
    auth: AuthConfig
  }>({
    name: '',
    baseUrl: '',
    headers: [{ key: '', value: '' }],
    auth: { type: 'none' }
  })

  useEffect(() => {
    if (inlineEditingId && inlineInputRef.current) {
      inlineInputRef.current.focus()
      inlineInputRef.current.select()
    }
  }, [inlineEditingId])

  const handleEnvironmentSelect = (env: Environment) => {
    dispatch({ type: 'SET_SELECTED_ENVIRONMENT', payload: env })
    saveSelectedEnvironment(env.id)
    setShowDropdown(false)
  }

  const handleNewEnvironment = () => {
    setFormData({
      name: '',
      baseUrl: '',
      headers: [{ key: '', value: '' }],
      auth: { type: 'none' }
    })
    setEditingEnv(null)
    setShowForm(true)
  }

  const handleEditEnvironment = (env: Environment) => {
    setFormData({
      name: env.name,
      baseUrl: env.baseUrl,
      headers: Object.entries(env.headers).map(([key, value]) => ({ key, value })),
      auth: env.auth || { type: 'none' }
    })
    setEditingEnv(env)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.baseUrl.trim()) return

    const headers: Record<string, string> = {}
    formData.headers.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) {
        headers[key.trim()] = value.trim()
      }
    })

    const environment: Environment = {
      id: editingEnv?.id || generateId(),
      name: formData.name.trim(),
      baseUrl: formData.baseUrl.trim(),
      headers,
      isDefault: !editingEnv && state.environments.length === 0,
      auth: formData.auth
    }

    await saveEnvironment(environment, !!editingEnv)
    dispatch({ type: 'SET_SELECTED_ENVIRONMENT', payload: environment })
    saveSelectedEnvironment(environment.id)
    setShowForm(false)
    setEditingEnv(null)
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingEnv(null)
  }

  const handleDelete = async (env: Environment, event: React.MouseEvent) => {
    event.stopPropagation()
    if (confirm(`Delete environment "${env.name}"?`)) {
      await deleteEnvironment(env.id)
    }
  }

  const handleInlineEdit = (env: Environment, event: React.MouseEvent) => {
    event.stopPropagation()
    setInlineEditingId(env.id)
    setInlineEditValue(env.name)
  }

  const handleInlineEditSave = async (env: Environment) => {
    if (inlineEditValue.trim() && inlineEditValue.trim() !== env.name) {
      const updatedEnv = { ...env, name: inlineEditValue.trim() }
      await saveEnvironment(updatedEnv, true)
      dispatch({ type: 'SET_SELECTED_ENVIRONMENT', payload: updatedEnv })
    }
    setInlineEditingId(null)
    setInlineEditValue('')
  }

  const handleInlineEditCancel = () => {
    setInlineEditingId(null)
    setInlineEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, env: Environment) => {
    if (e.key === 'Enter') {
      handleInlineEditSave(env)
    } else if (e.key === 'Escape') {
      handleInlineEditCancel()
    }
  }

  const availableSchemes = state.selectedSpec
    ? getSecuritySchemes(state.selectedSpec.spec)
    : undefined

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Environment</span>
        <button
          onClick={handleNewEnvironment}
          className="p-0.5 text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-100 rounded"
          title="Add Environment"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {!showForm ? (
        <div>
          {state.environments.length === 0 ? (
            <div className="text-center py-2 text-gray-500 dark:text-gray-400">
              <div className="text-lg mb-1">🌍</div>
              <p className="text-xs">No environments</p>
            </div>
          ) : (
            <div className="relative">
              {/* コンパクトプルダウンボタン */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between p-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-left hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <div className="flex-1 min-w-0">
                  {state.selectedEnvironment ? (
                    <div className="flex items-center space-x-1">
                      <span 
                        className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate"
                        onMouseEnter={() => setShowTooltip(state.selectedEnvironment?.id || null)}
                        onMouseLeave={() => setShowTooltip(null)}
                        title={state.selectedEnvironment.baseUrl}
                      >
                        {state.selectedEnvironment.name}
                      </span>
                      {state.selectedEnvironment.isDefault && (
                        <span className="px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded">
                          Default
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Select environment</span>
                  )}
                </div>
                <svg
                  className={`w-3 h-3 text-gray-400 dark:text-gray-300 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* コンパクトドロップダウンメニュー */}
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-48 overflow-auto">
                  {state.environments.map((env) => (
                    <div
                      key={env.id}
                      onClick={() => handleEnvironmentSelect(env)}
                      className="group flex items-center justify-between p-1.5 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer first:rounded-t last:rounded-b"
                    >
                      <div className="flex-1 min-w-0">
                        {inlineEditingId === env.id ? (
                          <input
                            ref={inlineInputRef}
                            type="text"
                            value={inlineEditValue}
                            onChange={(e) => setInlineEditValue(e.target.value)}
                            onBlur={() => handleInlineEditSave(env)}
                            onKeyDown={(e) => handleKeyDown(e, env)}
                            className="w-full px-1 py-0.5 text-sm bg-white dark:bg-gray-600 border border-blue-500 rounded focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center space-x-1">
                            <span 
                              className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate"
                              title={env.baseUrl}
                            >
                              {env.name}
                            </span>
                            {env.isDefault && (
                              <span className="px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded">
                                Default
                              </span>
                            )}
                            {state.selectedEnvironment?.id === env.id && (
                              <span className="text-blue-600 dark:text-blue-400">✓</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => handleInlineEdit(env, e)}
                          className="p-0.5 text-gray-400 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                          title="Rename"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditEnvironment(env)
                            setShowDropdown(false)
                          }}
                          className="p-0.5 text-gray-400 dark:text-gray-300 hover:text-gray-100 dark:hover:text-gray-100 rounded"
                          title="Edit Details"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(env, e)
                          }}
                          className="p-0.5 text-gray-400 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCancel}>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              {editingEnv ? 'Edit Environment' : 'New Environment'}
            </h3>
            
            <div className="space-y-3">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Environment name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              <AuthConfigForm
                auth={formData.auth}
                onChange={(auth) => setFormData(prev => ({ ...prev, auth }))}
                availableSchemes={availableSchemes}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Headers</label>
                {formData.headers.map((header, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => {
                        const newHeaders = [...formData.headers]
                        newHeaders[index] = { ...header, key: e.target.value }
                        setFormData(prev => ({ ...prev, headers: newHeaders }))
                      }}
                      placeholder="Header"
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => {
                        const newHeaders = [...formData.headers]
                        newHeaders[index] = { ...header, value: e.target.value }
                        setFormData(prev => ({ ...prev, headers: newHeaders }))
                      }}
                      placeholder="Value"
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {formData.headers.length > 1 && (
                      <button
                        onClick={() => {
                          const newHeaders = formData.headers.filter((_, i) => i !== index)
                          setFormData(prev => ({ ...prev, headers: newHeaders }))
                        }}
                        className="px-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    headers: [...prev.headers, { key: '', value: '' }] 
                  }))}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  + Add header
                </button>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || !formData.baseUrl.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}