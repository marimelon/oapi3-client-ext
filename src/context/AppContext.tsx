import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { OpenAPISpec, Environment, RequestHistory } from '../types'
import { RequestResult } from '../lib/request'

interface AppState {
  openApiSpecs: OpenAPISpec[]
  environments: Environment[]
  requestHistory: RequestHistory[]
  selectedSpec: OpenAPISpec | null
  selectedEnvironment: Environment | null
  selectedEndpoint: any | null
  loading: boolean
  error: string | null
  requestState: {
    loading: boolean
    result: RequestResult | null
    error: string | null
  }
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_OPENAPI_SPECS'; payload: OpenAPISpec[] }
  | { type: 'ADD_OPENAPI_SPEC'; payload: OpenAPISpec }
  | { type: 'DELETE_OPENAPI_SPEC'; payload: string }
  | { type: 'SET_SELECTED_SPEC'; payload: OpenAPISpec | null }
  | { type: 'SET_ENVIRONMENTS'; payload: Environment[] }
  | { type: 'ADD_ENVIRONMENT'; payload: Environment }
  | { type: 'UPDATE_ENVIRONMENT'; payload: Environment }
  | { type: 'DELETE_ENVIRONMENT'; payload: string }
  | { type: 'SET_SELECTED_ENVIRONMENT'; payload: Environment | null }
  | { type: 'SET_SELECTED_ENDPOINT'; payload: any | null }
  | { type: 'SET_REQUEST_HISTORY'; payload: RequestHistory[] }
  | { type: 'ADD_REQUEST_HISTORY'; payload: RequestHistory }
  | { type: 'SET_REQUEST_LOADING'; payload: boolean }
  | { type: 'SET_REQUEST_RESULT'; payload: RequestResult | null }
  | { type: 'SET_REQUEST_ERROR'; payload: string | null }

const initialState: AppState = {
  openApiSpecs: [],
  environments: [],
  requestHistory: [],
  selectedSpec: null,
  selectedEnvironment: null,
  selectedEndpoint: null,
  loading: false,
  error: null,
  requestState: {
    loading: false,
    result: null,
    error: null
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'SET_OPENAPI_SPECS':
      return { ...state, openApiSpecs: action.payload }
    case 'ADD_OPENAPI_SPEC':
      return { ...state, openApiSpecs: [...state.openApiSpecs, action.payload] }
    case 'DELETE_OPENAPI_SPEC':
      return {
        ...state,
        openApiSpecs: state.openApiSpecs.filter(spec => spec.id !== action.payload),
        selectedSpec: state.selectedSpec?.id === action.payload ? null : state.selectedSpec
      }
    case 'SET_SELECTED_SPEC':
      return { ...state, selectedSpec: action.payload }
    case 'SET_ENVIRONMENTS':
      return { ...state, environments: action.payload }
    case 'ADD_ENVIRONMENT':
      return { ...state, environments: [...state.environments, action.payload] }
    case 'UPDATE_ENVIRONMENT':
      return {
        ...state,
        environments: state.environments.map(env => 
          env.id === action.payload.id ? action.payload : env
        ),
        selectedEnvironment: state.selectedEnvironment?.id === action.payload.id ? action.payload : state.selectedEnvironment
      }
    case 'DELETE_ENVIRONMENT':
      return {
        ...state,
        environments: state.environments.filter(env => env.id !== action.payload),
        selectedEnvironment: state.selectedEnvironment?.id === action.payload ? null : state.selectedEnvironment
      }
    case 'SET_SELECTED_ENVIRONMENT':
      return { ...state, selectedEnvironment: action.payload }
    case 'SET_SELECTED_ENDPOINT':
      return { ...state, selectedEndpoint: action.payload }
    case 'SET_REQUEST_HISTORY':
      return { ...state, requestHistory: action.payload }
    case 'ADD_REQUEST_HISTORY':
      return { ...state, requestHistory: [action.payload, ...state.requestHistory] }
    case 'SET_REQUEST_LOADING':
      return { ...state, requestState: { ...state.requestState, loading: action.payload } }
    case 'SET_REQUEST_RESULT':
      return { ...state, requestState: { ...state.requestState, result: action.payload, error: null } }
    case 'SET_REQUEST_ERROR':
      return { ...state, requestState: { ...state.requestState, error: action.payload, result: null, loading: false } }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider')
  }
  return context
}