import { useState, useEffect, useCallback } from 'react'

export interface JqResult {
  data: any
  error: string | null
  processing: boolean
}

export function useJq() {
  const [jqInstance, setJqInstance] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const initializeJq = () => {
      try {
        console.log('Initializing jq in frontend using script injection...')
        
        // Create script element to load jq.asm.js
        const script = document.createElement('script')
        script.src = chrome.runtime.getURL('assets/jq.asm.js')
        script.async = false // Load synchronously to ensure proper initialization
        
        script.onload = () => {
          console.log('jq asm.js script loaded')
          
          // jq should now be available in global scope
          if (typeof (window as any).jq !== 'undefined') {
            setJqInstance((window as any).jq)
            setIsReady(true)
            console.log('jq initialized successfully in frontend')
          } else {
            console.error('jq not found in global scope after script load')
            setIsReady(false)
          }
        }
        
        script.onerror = (error) => {
          console.error('Failed to load jq script:', error)
          setIsReady(false)
        }
        
        // Add script to document head
        document.head.appendChild(script)
        
        // Cleanup function
        return () => {
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
        }
      } catch (error) {
        console.error('Failed to initialize jq:', error)
        setIsReady(false)
      }
    }

    const cleanup = initializeJq()
    return cleanup
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
      console.log('Processing jq query in frontend:', query)
      
      // Use jq directly in frontend
      const result = jqInstance.json(data, query)
      console.log('jq result:', result)
      
      return {
        data: result,
        error: null,
        processing: false
      }
    } catch (error) {
      console.error('jq processing error:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'jq processing failed',
        processing: false
      }
    }
  }, [jqInstance, isReady])

  return {
    processQuery,
    isReady
  }
}