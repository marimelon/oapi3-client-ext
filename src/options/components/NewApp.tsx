import { useEffect, useState, useRef } from 'react'
import { useAppContext } from '../../context/AppContext'
import { useStorage } from '../../hooks/useStorage'
import Sidebar from './Sidebar'
import MainContent from './MainContent'
import Header from './Header'

export default function NewApp() {
  const { state, dispatch } = useAppContext()
  const { initializeStorage } = useStorage()
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('oapi-sidebar-width')
    return saved ? parseInt(saved, 10) : 320
  })
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // 初期化
  useEffect(() => {
    initializeStorage().catch((error) => {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    })
  }, [initializeStorage, dispatch])

  const dismissError = () => {
    dispatch({ type: 'SET_ERROR', payload: null })
  }

  // リサイズ処理
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = e.clientX
      const minWidth = 200
      const maxWidth = 600
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth)
        localStorage.setItem('oapi-sidebar-width', newWidth.toString())
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'ew-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* ヘッダー */}
      <Header />
      
      {/* エラー表示 */}
      {state.error && (
        <div className="bg-red-100 dark:bg-red-900/20 border-b border-red-400 dark:border-red-800 px-4 py-3">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <div className="flex items-center">
              <span className="text-red-600 mr-2">⚠️</span>
              <span className="text-red-700 dark:text-red-400">{state.error}</span>
            </div>
            <button
              onClick={dismissError}
              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold text-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ローディング表示 */}
      {state.loading && (
        <div className="bg-blue-100 dark:bg-blue-900/20 border-b border-blue-400 dark:border-blue-800 px-4 py-2">
          <div className="flex items-center justify-center max-w-7xl mx-auto">
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-blue-700 dark:text-blue-400 text-sm">Loading...</span>
          </div>
        </div>
      )}

      {/* メインレイアウト */}
      <div className="flex-1 flex overflow-hidden">
        {/* サイドバー */}
        <div 
          ref={sidebarRef}
          style={{ width: `${sidebarWidth}px` }}
          className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col relative"
        >
          <Sidebar />
          
          {/* リサイズハンドル */}
          <div
            className={`absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-blue-500 transition-colors ${
              isResizing ? 'bg-blue-500' : 'bg-transparent'
            }`}
            onMouseDown={handleMouseDown}
          />
        </div>
        
        {/* メインコンテンツ */}
        <MainContent />
      </div>
    </div>
  )
}