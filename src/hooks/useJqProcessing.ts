import { useState, useCallback, useEffect } from 'react'
import { useJq } from './useJq'

type JsonDisplayMode = 'tree' | 'raw' | 'jq'

interface UseJqProcessingOptions {
  data: any
  jsonDisplayMode: JsonDisplayMode
}

interface UseJqProcessingReturn {
  jqQuery: string
  setJqQuery: (query: string) => void
  jqResult: { data: any; error: string | null }
  jqProcessing: boolean
  handlePaste: (e: React.ClipboardEvent<HTMLInputElement>) => void
  isReady: boolean
}

export function useJqProcessing({ data, jsonDisplayMode }: UseJqProcessingOptions): UseJqProcessingReturn {
  const [jqQuery, setJqQuery] = useState('')
  const [jqResult, setJqResult] = useState<{ data: any; error: string | null }>({ data: null, error: null })
  const [jqProcessing, setJqProcessing] = useState(false)
  const { processQuery, isReady } = useJq()

  const processJqQuery = useCallback(async (query: string) => {
    if (!data || !isReady) return

    setJqProcessing(true)
    try {
      const result = await processQuery(data, query)
      setJqResult({ data: result.data, error: result.error })
    } catch (error) {
      setJqResult({ data: null, error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setJqProcessing(false)
    }
  }, [data, processQuery, isReady])

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const input = e.currentTarget
    const pastedText = e.clipboardData.getData('text')

    // Normalize whitespace in pasted text
    const normalizedText = pastedText.replace(/\s+/g, ' ').trim()

    // Get current cursor position with safe fallbacks
    const start = input.selectionStart ?? 0
    const end = input.selectionEnd ?? 0
    const currentValue = input.value

    // Insert normalized text at cursor position
    const newValue = currentValue.substring(0, start) + normalizedText + currentValue.substring(end)
    setJqQuery(newValue)

    // Restore cursor position after the pasted text
    setTimeout(() => {
      const newCursorPos = start + normalizedText.length
      input.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }, [])

  useEffect(() => {
    if (jsonDisplayMode === 'jq' && jqQuery.trim()) {
      const timeoutId = setTimeout(() => {
        processJqQuery(jqQuery)
      }, 300) // debounce
      return () => clearTimeout(timeoutId)
    }
  }, [jqQuery, jsonDisplayMode, processJqQuery])

  return { jqQuery, setJqQuery, jqResult, jqProcessing, handlePaste, isReady }
}
