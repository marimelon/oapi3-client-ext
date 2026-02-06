import { useState, useCallback } from 'react'
import { useStorage } from './useStorage'
import { OpenAPISpec, EndpointInfo, SavedRequest } from '../types'

export interface SavedRequestData {
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  headers: Record<string, string>
  body?: string
}

interface UseSavedRequestOptions {
  selectedSpec: OpenAPISpec | null
  selectedEndpoint: EndpointInfo | null
}

interface UseSavedRequestReturn {
  hasSavedRequest: boolean
  setHasSavedRequest: (value: boolean) => void
  loadSavedRequest: () => Promise<SavedRequestData | null>
  autoSaveRequest: (params: {
    pathParams: Record<string, string>
    queryParams: Record<string, string>
    headers: Record<string, string>
    requestBody: string
  }) => Promise<void>
}

function getEndpointKey(method: string, path: string): string {
  return `${method.toUpperCase()}:${path}`
}

export function useSavedRequest({ selectedSpec, selectedEndpoint }: UseSavedRequestOptions): UseSavedRequestReturn {
  const [hasSavedRequest, setHasSavedRequest] = useState(false)
  const { saveSavedRequest, getSavedRequestByEndpoint } = useStorage()

  const loadSavedRequest = useCallback(async (): Promise<SavedRequestData | null> => {
    if (!selectedSpec || !selectedEndpoint) return null

    try {
      const endpointKey = getEndpointKey(selectedEndpoint.method, selectedEndpoint.path)
      const savedRequest = await getSavedRequestByEndpoint(selectedSpec.id, endpointKey)

      if (savedRequest) {
        setHasSavedRequest(true)
        return {
          pathParams: savedRequest.pathParams,
          queryParams: savedRequest.queryParams,
          headers: savedRequest.headers,
          body: savedRequest.body
            ? (typeof savedRequest.body === 'string' ? savedRequest.body : JSON.stringify(savedRequest.body, null, 2))
            : undefined,
        }
      } else {
        setHasSavedRequest(false)
        return null
      }
    } catch (error) {
      console.error('Failed to load saved request:', error)
      return null
    }
  }, [selectedSpec, selectedEndpoint, getSavedRequestByEndpoint])

  const autoSaveRequest = useCallback(async (params: {
    pathParams: Record<string, string>
    queryParams: Record<string, string>
    headers: Record<string, string>
    requestBody: string
  }) => {
    if (!selectedSpec || !selectedEndpoint) return

    try {
      const endpointKey = getEndpointKey(selectedEndpoint.method, selectedEndpoint.path)
      const savedRequest: SavedRequest = {
        id: `${selectedSpec.id}_${endpointKey}`,
        specId: selectedSpec.id,
        endpointKey,
        name: `${selectedEndpoint.method} ${selectedEndpoint.path}`,
        pathParams: params.pathParams,
        queryParams: params.queryParams,
        headers: params.headers,
        body: params.requestBody ? JSON.parse(params.requestBody) : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await saveSavedRequest(savedRequest)
      setHasSavedRequest(true)
    } catch (error) {
      console.error('Failed to auto-save request:', error)
    }
  }, [selectedSpec, selectedEndpoint, saveSavedRequest])

  return { hasSavedRequest, setHasSavedRequest, loadSavedRequest, autoSaveRequest }
}
