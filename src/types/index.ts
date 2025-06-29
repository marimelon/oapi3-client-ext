export interface OpenAPISpec {
  id: string
  name: string
  spec: any
  createdAt: Date
  updatedAt: Date
}

export interface Environment {
  id: string
  name: string
  baseUrl: string
  headers: Record<string, string>
  isDefault: boolean
}

export interface RequestHistory {
  id: string
  specId: string
  environmentId: string
  method: string
  endpoint: string
  parameters: Record<string, any>
  headers: Record<string, string>
  body: any
  response: {
    status: number
    headers: Record<string, string>
    body: any
    timestamp: Date
  }
  timestamp: Date
}

export interface EndpointInfo {
  path: string
  method: string
  summary?: string
  description?: string
  parameters?: any[]
  requestBody?: any
  responses?: any
}