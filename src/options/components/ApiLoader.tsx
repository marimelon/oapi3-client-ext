import { useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStorage } from '../../hooks/useStorage'
import { useOpenApi } from '../../hooks/useOpenApi'

export default function ApiLoader() {
  const { dispatch } = useAppContext()
  const { saveOpenApiSpec } = useStorage()
  const { loadSpecFromFile, loadSpecFromUrl } = useOpenApi()
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const spec = await loadSpecFromFile(file)
    if (spec) {
      await saveOpenApiSpec(spec)
      dispatch({ type: 'SET_SELECTED_SPEC', payload: spec })
      dispatch({ type: 'SET_SELECTED_ENDPOINT', payload: null })
    }
    
    event.target.value = ''
  }

  const handleUrlLoad = async () => {
    if (!urlInput.trim()) return

    const spec = await loadSpecFromUrl(urlInput.trim())
    if (spec) {
      await saveOpenApiSpec(spec)
      dispatch({ type: 'SET_SELECTED_SPEC', payload: spec })
      dispatch({ type: 'SET_SELECTED_ENDPOINT', payload: null })
      setUrlInput('')
      setShowUrlInput(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">Load API</h3>
      
      {/* ファイル読み込み */}
      <div>
        <label className="block">
          <span className="sr-only">Choose API file</span>
          <input
            type="file"
            accept=".json,.yaml,.yml"
            onChange={handleFileUpload}
            className="block w-full text-xs text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300 dark:hover:file:bg-blue-800"
          />
        </label>
      </div>

      {/* URL読み込み */}
      <div>
        {!showUrlInput ? (
          <button
            onClick={() => setShowUrlInput(true)}
            className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Load from URL...
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://api.example.com/openapi.json"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleUrlLoad}
                disabled={!urlInput.trim()}
                className="flex-1 px-3 py-1 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                Load
              </button>
              <button
                onClick={() => {
                  setShowUrlInput(false)
                  setUrlInput('')
                }}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}