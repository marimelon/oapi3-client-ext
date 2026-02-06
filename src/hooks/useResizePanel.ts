import { useState, useCallback, useRef, useEffect } from 'react'

interface UseResizePanelOptions {
  initialHeight?: number
  minHeight?: number
  maxHeight?: number
}

interface UseResizePanelReturn {
  bodyHeight: number
  isResizing: boolean
  handleMouseDown: (e: React.MouseEvent) => void
  resizeRef: React.RefObject<HTMLDivElement | null>
}

export function useResizePanel({
  initialHeight = 400,
  minHeight = 200,
  maxHeight = 800,
}: UseResizePanelOptions = {}): UseResizePanelReturn {
  const [bodyHeight, setBodyHeight] = useState(initialHeight)
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return

    const rect = resizeRef.current?.getBoundingClientRect()
    if (!rect) return

    const newHeight = e.clientY - rect.top
    setBodyHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)))
  }, [isResizing, minHeight, maxHeight])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return { bodyHeight, isResizing, handleMouseDown, resizeRef }
}
