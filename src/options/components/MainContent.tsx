import { useState, useEffect } from 'react'
import { useAppContext } from '../../context/AppContext'
import RequestPanel from './RequestPanel'
import ResponsePanel from './ResponsePanel'
import HistoryPanel from './HistoryPanel'

type ActivePanel = 'request' | 'response' | 'history'

export default function MainContent() {
  const { state } = useAppContext()
  const [activePanel, setActivePanel] = useState<ActivePanel>('request')
  const [requestPanelWidth, setRequestPanelWidth] = useState(() => {
    const saved = localStorage.getItem('oapi-request-panel-width')
    return saved ? parseFloat(saved) : 50 // デフォルト50%
  })
  const [isResizingPanels, setIsResizingPanels] = useState(false)

  // パネルリサイズ処理
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingPanels(true)
  }

  useEffect(() => {
    const handlePanelMouseMove = (e: MouseEvent) => {
      if (!isResizingPanels) return
      
      // メインコンテンツエリアの要素を取得
      const container = document.querySelector('.flex-1.flex.relative') as HTMLElement
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const containerWidth = rect.width
      const newWidthPercent = ((e.clientX - rect.left) / containerWidth) * 100
      
      const minWidth = 20
      const maxWidth = 80
      
      if (newWidthPercent >= minWidth && newWidthPercent <= maxWidth) {
        setRequestPanelWidth(newWidthPercent)
        localStorage.setItem('oapi-request-panel-width', newWidthPercent.toString())
      }
    }

    const handlePanelMouseUp = () => {
      setIsResizingPanels(false)
    }

    if (isResizingPanels) {
      document.addEventListener('mousemove', handlePanelMouseMove)
      document.addEventListener('mouseup', handlePanelMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handlePanelMouseMove)
      document.removeEventListener('mouseup', handlePanelMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingPanels])

  if (!state.selectedSpec) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Welcome to OpenAPI Client</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Load an API specification to get started</p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>1. Load an API specification from the sidebar</p>
            <p>2. Select an endpoint</p>
            <p>3. Configure and send requests</p>
          </div>
        </div>
      </div>
    )
  }

  if (!state.selectedEndpoint) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Select an Endpoint</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Choose an endpoint from "{state.selectedSpec.name}" to start testing</p>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>Expand the API in the sidebar and click on an endpoint</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 min-w-0">
      {/* タブナビゲーション */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActivePanel('request')}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              activePanel === 'request'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            🚀 Request
          </button>
          <button
            onClick={() => setActivePanel('response')}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              activePanel === 'response'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            📄 Response {state.requestState.result && <span className="ml-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 px-1 rounded">●</span>}
          </button>
          <button
            onClick={() => setActivePanel('history')}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              activePanel === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            📚 History ({state.requestHistory.length})
          </button>
        </div>
      </div>

      {/* メインコンテンツ - Podman風の統合ビュー */}
      <div className="flex-1 flex overflow-hidden">
        {activePanel === 'request' && (
          <div className="flex-1 flex relative overflow-hidden">
            {/* リクエストパネル */}
            <div 
              style={{ width: `${requestPanelWidth}%` }}
              className="border-r border-gray-200 dark:border-gray-700 overflow-auto min-w-0"
            >
              <RequestPanel />
            </div>
            
            {/* パネル間のリサイズハンドル */}
            <div
              className={`w-1 cursor-ew-resize hover:bg-blue-500 transition-colors flex-shrink-0 ${
                isResizingPanels ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              onMouseDown={handlePanelMouseDown}
            />
            
            {/* レスポンスパネル */}
            <div 
              style={{ width: `${100 - requestPanelWidth}%` }}
              className="overflow-auto min-w-0"
            >
              <ResponsePanel />
            </div>
          </div>
        )}
        
        {activePanel === 'response' && (
          <div className="flex-1 overflow-auto">
            <ResponsePanel />
          </div>
        )}
        
        {activePanel === 'history' && (
          <div className="flex-1 overflow-auto">
            <HistoryPanel />
          </div>
        )}
      </div>
    </div>
  )
}