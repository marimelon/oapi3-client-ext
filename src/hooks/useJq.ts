import { useState, useEffect, useCallback } from 'react'
import jq from 'jq-web'

export interface JqResult {
  data: any
  error: string | null
  processing: boolean
}

export function useJq() {
  const [jqInstance, setJqInstance] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initializeJq = async () => {
      try {
        const instance = await jq()
        setJqInstance(instance)
        setIsReady(true)
      } catch (error) {
        console.error('Failed to initialize jq:', error)
      }
    }

    initializeJq()
  }, [])

  const processQuery = useCallback(async (data: any, query: string): Promise<JqResult> => {
    if (!jqInstance || !isReady) {
      return {
        data: null,
        error: 'jq is not ready',
        processing: false
      }
    }

    if (!query.trim()) {
      return {
        data: data,
        error: null,
        processing: false
      }
    }

    try {
      const result = jqInstance.json(data, query)
      return {
        data: result,
        error: null,
        processing: false
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown jq error',
        processing: false
      }
    }
  }, [jqInstance, isReady])

  return {
    processQuery,
    isReady
  }
}