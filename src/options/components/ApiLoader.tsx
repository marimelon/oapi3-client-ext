import { useState, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStorage } from '../../hooks/useStorage'
import { useOpenApi } from '../../hooks/useOpenApi'

export default function ApiLoader() {
  const { dispatch } = useAppContext()
  const { saveOpenApiSpec } = useStorage()
  const { loadSpecFromFile, loadSpecFromUrl } = useOpenApi()
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [recentUrls] = useState([
    'https://petstore.swagger.io/v2/swagger.json',
    'https://api.github.com/openapi.json'
  ])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      const spec = await loadSpecFromFile(file)
      if (spec) {
        await saveOpenApiSpec(spec)
        dispatch({ type: 'SET_SELECTED_SPEC', payload: spec })
        dispatch({ type: 'SET_SELECTED_ENDPOINT', payload: null })
      }
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  const handleUrlLoad = async (url?: string) => {
    const targetUrl = url || urlInput.trim()
    if (!targetUrl) return

    setIsLoading(true)
    try {
      const spec = await loadSpecFromUrl(targetUrl)
      if (spec) {
        await saveOpenApiSpec(spec)
        dispatch({ type: 'SET_SELECTED_SPEC', payload: spec })
        dispatch({ type: 'SET_SELECTED_ENDPOINT', payload: null })
        setUrlInput('')
        setShowUrlInput(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUrlLoad()
    } else if (e.key === 'Escape') {
      setShowUrlInput(false)
      setUrlInput('')
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Load API</span>
        {isLoading && (
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
        )}
      </div>
      
      {/* 統合インターフェース */}
      <div className="space-y-1">
        {/* レスポンシブボタンレイアウト - 300px以上で横並び */}
        <div className={`flex gap-1 ${!showUrlInput ? 'flex-row' : 'flex-col'}`}>
          {/* ファイル選択ボタン */}
          <button
            onClick={handleFileButtonClick}
            disabled={isLoading}
            className={`${!showUrlInput ? 'flex-1' : 'w-full'} flex items-center justify-center px-2 py-1.5 bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm rounded hover:bg-blue-100 dark:hover:bg-blue-800 disabled:opacity-50 border border-blue-200 dark:border-blue-700`}
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="truncate">
              {!showUrlInput ? 'File' : 'Choose File'}
            </span>
          </button>
          
          {/* URL入力ボタン */}
          {!showUrlInput && (
            <button
              onClick={() => setShowUrlInput(true)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center px-2 py-1.5 text-sm text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="truncate">URL</span>
            </button>
          )}
        </div>
        
        {/* 隠しファイル入力 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.yaml,.yml"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* URL入力フォーム */}
        {showUrlInput && (
          <div className="space-y-1">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://api.example.com/openapi.json"
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              autoFocus
            />
            
            {/* 最近のURL */}
            {recentUrls.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-xs text-gray-500 dark:text-gray-400 px-1">Recent:</div>
                {recentUrls.map((url) => (
                  <button
                    key={url}
                    onClick={() => handleUrlLoad(url)}
                    className="w-full text-left px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded truncate"
                    title={url}
                  >
                    {url}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex space-x-1">
              <button
                onClick={() => handleUrlLoad()}
                disabled={!urlInput.trim() || isLoading}
                className="flex-1 px-2 py-1 bg-blue-600 dark:bg-blue-700 text-white text-xs rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
              >
                Load
              </button>
              <button
                onClick={() => {
                  setShowUrlInput(false)
                  setUrlInput('')
                }}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded hover:bg-gray-50 dark:hover:bg-gray-700"
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