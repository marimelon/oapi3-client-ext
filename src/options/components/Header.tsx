import { useState } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStorage } from '../../hooks/useStorage'
import { LLMDebugPanel } from './LLMDebugPanel'

export default function Header() {
  const { state } = useAppContext()
  const { clearRequestHistory } = useStorage()
  const [showSettings, setShowSettings] = useState(false)
  const [showLLMDebug, setShowLLMDebug] = useState(false)

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear all request history?')) {
      try {
        await clearRequestHistory()
      } catch (error) {
        console.error('Failed to clear history:', error)
      }
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 py-1.5">
      <div className="flex justify-between items-center">
        {/* ロゴ・タイトル */}
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xs">API</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">OpenAPI Client</h1>
          </div>
        </div>

        {/* 状態表示・設定 */}
        <div className="flex items-center space-x-2">
          {/* API状態 */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
              {state.openApiSpecs.length} APIs
            </span>
            <span className="px-1 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs font-medium">
              {state.selectedEnvironment?.name || 'No Env'}
            </span>
            <span className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">
              {state.requestHistory.length} History
            </span>
          </div>

          {/* 設定メニュー */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                <button
                  onClick={handleClearHistory}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Clear Request History
                </button>
                <button
                  onClick={() => {
                    chrome.tabs.create({ url: 'chrome://extensions/' })
                    setShowSettings(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Manage Extensions
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                <button
                  onClick={() => {
                    setShowLLMDebug(true)
                    setShowSettings(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  🐛 LLM Debug Panel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LLM Debug Panel */}
      <LLMDebugPanel 
        isOpen={showLLMDebug} 
        onClose={() => setShowLLMDebug(false)} 
      />
    </header>
  )
}