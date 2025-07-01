import { useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStorage } from '../../hooks/useStorage'
import { Environment } from '../../types'
import { generateId } from '../../lib/utils'

export default function EnvironmentSelector() {
  const { state, dispatch } = useAppContext()
  const { saveEnvironment, deleteEnvironment, saveSelectedEnvironment } = useStorage()
  const [showForm, setShowForm] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    headers: [{ key: '', value: '' }]
  })

  const handleEnvironmentSelect = (env: Environment) => {
    dispatch({ type: 'SET_SELECTED_ENVIRONMENT', payload: env })
    saveSelectedEnvironment(env.id)
    setShowDropdown(false)
  }

  const handleNewEnvironment = () => {
    setFormData({
      name: '',
      baseUrl: '',
      headers: [{ key: '', value: '' }]
    })
    setEditingEnv(null)
    setShowForm(true)
  }

  const handleEditEnvironment = (env: Environment) => {
    setFormData({
      name: env.name,
      baseUrl: env.baseUrl,
      headers: Object.entries(env.headers).map(([key, value]) => ({ key, value }))
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
      isDefault: !editingEnv && state.environments.length === 0
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Environment</h3>
        <button
          onClick={handleNewEnvironment}
          className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </div>

      {!showForm ? (
        <div>
          {state.environments.length === 0 ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              <div className="text-2xl mb-1">🌍</div>
              <p className="text-xs">No environments</p>
            </div>
          ) : (
            <div className="relative">
              {/* プルダウンボタン */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-left hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <div className="flex-1 min-w-0">
                  {state.selectedEnvironment ? (
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {state.selectedEnvironment.name}
                        </span>
                        {state.selectedEnvironment.isDefault && (
                          <span className="px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {state.selectedEnvironment.baseUrl}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400 text-sm">Select environment</span>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* ドロップダウンメニュー */}
              {showDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {state.environments.map((env) => (
                    <div
                      key={env.id}
                      onClick={() => handleEnvironmentSelect(env)}
                      className="group flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer first:rounded-t-md last:rounded-b-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {env.name}
                          </div>
                          {env.isDefault && (
                            <span className="px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded">
                              Default
                            </span>
                          )}
                          {state.selectedEnvironment?.id === env.id && (
                            <span className="text-blue-600 dark:text-blue-400">✓</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {env.baseUrl}
                        </div>
                      </div>
                      <div className="flex space-x-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditEnvironment(env)
                            setShowDropdown(false)
                          }}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 rounded"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(env, e)
                          }}
                          className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded"
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
        <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Environment name"
            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="url"
            value={formData.baseUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, baseUrl: e.target.value }))}
            placeholder="https://api.example.com"
            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {/* ヘッダー（簡略版） */}
          <div className="space-y-1">
            {formData.headers.map((header, index) => (
              <div key={index} className="flex gap-1">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => {
                    const newHeaders = [...formData.headers]
                    newHeaders[index] = { ...header, key: e.target.value }
                    setFormData(prev => ({ ...prev, headers: newHeaders }))
                  }}
                  placeholder="Header"
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {formData.headers.length > 1 && (
                  <button
                    onClick={() => {
                      const newHeaders = formData.headers.filter((_, i) => i !== index)
                      setFormData(prev => ({ ...prev, headers: newHeaders }))
                    }}
                    className="px-1 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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

          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={!formData.name.trim() || !formData.baseUrl.trim()}
              className="flex-1 px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-600 bg-white dark:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}