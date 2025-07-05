import { useCallback } from 'react'
import { StorageManager } from '../lib/storage'
import { OpenAPISpec, Environment, RequestHistory, SavedRequest } from '../types'
import { useAppContext } from '../context/AppContext'

export function useStorage() {
  const { dispatch } = useAppContext()
  const storage = StorageManager.getInstance()

  // OpenAPI仕様の操作
  const loadOpenApiSpecs = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const specs = await storage.getOpenApiSpecs()
      dispatch({ type: 'SET_OPENAPI_SPECS', payload: specs })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load specifications' })
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [dispatch, storage])

  const saveOpenApiSpec = useCallback(async (spec: OpenAPISpec) => {
    try {
      await storage.saveOpenApiSpec(spec)
      dispatch({ type: 'ADD_OPENAPI_SPEC', payload: spec })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save specification' })
    }
  }, [dispatch, storage])

  const deleteOpenApiSpec = useCallback(async (id: string) => {
    try {
      await storage.deleteOpenApiSpec(id)
      dispatch({ type: 'DELETE_OPENAPI_SPEC', payload: id })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete specification' })
    }
  }, [dispatch, storage])

  // 環境の操作
  const loadEnvironments = useCallback(async () => {
    try {
      const environments = await storage.getEnvironments()
      dispatch({ type: 'SET_ENVIRONMENTS', payload: environments })
      
      // 最後に選択した環境を復元、なければデフォルト環境を選択
      const selectedEnvId = await storage.getSelectedEnvironmentId()
      let selectedEnv = null
      
      if (selectedEnvId) {
        selectedEnv = environments.find(env => env.id === selectedEnvId)
      }
      
      if (!selectedEnv) {
        selectedEnv = environments.find(env => env.isDefault)
      }
      
      if (selectedEnv) {
        dispatch({ type: 'SET_SELECTED_ENVIRONMENT', payload: selectedEnv })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load environments' })
    }
  }, [dispatch, storage])

  const saveEnvironment = useCallback(async (environment: Environment, isUpdate = false) => {
    try {
      await storage.saveEnvironment(environment)
      
      if (isUpdate) {
        dispatch({ type: 'UPDATE_ENVIRONMENT', payload: environment })
      } else {
        dispatch({ type: 'ADD_ENVIRONMENT', payload: environment })
      }
      
      // デフォルト環境の場合は選択状態にする
      if (environment.isDefault) {
        dispatch({ type: 'SET_SELECTED_ENVIRONMENT', payload: environment })
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save environment' })
    }
  }, [dispatch, storage])

  const deleteEnvironment = useCallback(async (id: string) => {
    try {
      await storage.deleteEnvironment(id)
      dispatch({ type: 'DELETE_ENVIRONMENT', payload: id })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete environment' })
    }
  }, [dispatch, storage])

  // リクエスト履歴の操作
  const loadRequestHistory = useCallback(async (limit?: number) => {
    try {
      const history = await storage.getRequestHistory(limit)
      dispatch({ type: 'SET_REQUEST_HISTORY', payload: history })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to load request history' })
    }
  }, [dispatch, storage])

  const saveRequestHistory = useCallback(async (history: RequestHistory) => {
    try {
      await storage.saveRequestHistory(history)
      dispatch({ type: 'ADD_REQUEST_HISTORY', payload: history })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save request history' })
    }
  }, [dispatch, storage])

  const clearRequestHistory = useCallback(async () => {
    try {
      await storage.clearHistory()
      dispatch({ type: 'SET_REQUEST_HISTORY', payload: [] })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to clear request history' })
    }
  }, [dispatch, storage])

  // 初期化
  const initializeStorage = useCallback(async () => {
    await Promise.all([
      loadOpenApiSpecs(),
      loadEnvironments(),
      loadRequestHistory()
    ])
  }, [loadOpenApiSpecs, loadEnvironments, loadRequestHistory])

  // 選択環境の保存
  const saveSelectedEnvironment = useCallback(async (environmentId: string) => {
    try {
      await storage.saveSelectedEnvironment(environmentId)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save selected environment' })
    }
  }, [dispatch, storage])

  // 保存されたリクエストの操作
  const saveSavedRequest = useCallback(async (savedRequest: SavedRequest) => {
    try {
      await storage.saveSavedRequest(savedRequest)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to save request' })
    }
  }, [dispatch, storage])

  const getSavedRequests = useCallback(async () => {
    try {
      return await storage.getSavedRequests()
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to get saved requests' })
      return []
    }
  }, [dispatch, storage])

  const getSavedRequestsBySpec = useCallback(async (specId: string) => {
    try {
      return await storage.getSavedRequestsBySpec(specId)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to get saved requests by spec' })
      return []
    }
  }, [dispatch, storage])

  const getSavedRequestByEndpoint = useCallback(async (specId: string, endpointKey: string) => {
    try {
      return await storage.getSavedRequestByEndpoint(specId, endpointKey)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to get saved request by endpoint' })
      return null
    }
  }, [dispatch, storage])

  const deleteSavedRequest = useCallback(async (id: string) => {
    try {
      await storage.deleteSavedRequest(id)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to delete saved request' })
    }
  }, [dispatch, storage])

  return {
    // OpenAPI仕様
    loadOpenApiSpecs,
    saveOpenApiSpec,
    deleteOpenApiSpec,
    
    // 環境
    loadEnvironments,
    saveEnvironment,
    deleteEnvironment,
    saveSelectedEnvironment,
    
    // リクエスト履歴
    loadRequestHistory,
    saveRequestHistory,
    clearRequestHistory,
    
    // 保存されたリクエスト
    saveSavedRequest,
    getSavedRequests,
    getSavedRequestsBySpec,
    getSavedRequestByEndpoint,
    deleteSavedRequest,
    
    // 初期化
    initializeStorage
  }
}