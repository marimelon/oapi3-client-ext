export interface OpenAPI3Spec {
  openapi: string
  info: {
    title: string
    version: string
    description?: string
  }
  servers?: Array<{
    url: string
    description?: string
  }>
  paths: Record<string, PathItem>
  components?: {
    schemas?: Record<string, Schema>
    parameters?: Record<string, Parameter>
    requestBodies?: Record<string, RequestBody>
    responses?: Record<string, Response>
    headers?: Record<string, Header>
    securitySchemes?: Record<string, SecurityScheme>
  }
  security?: SecurityRequirement[]
  tags?: Array<{
    name: string
    description?: string
  }>
}

export interface PathItem {
  get?: Operation
  post?: Operation
  put?: Operation
  delete?: Operation
  patch?: Operation
  head?: Operation
  options?: Operation
  trace?: Operation
  parameters?: Parameter[]
}

export interface Operation {
  summary?: string
  description?: string
  operationId?: string
  parameters?: Parameter[]
  requestBody?: RequestBody | Reference
  responses: Record<string, Response | Reference>
  tags?: string[]
  security?: SecurityRequirement[]
}

export interface Parameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  schema?: Schema | Reference
  example?: any
}

export interface RequestBody {
  description?: string
  content: Record<string, MediaType>
  required?: boolean
}

export interface Response {
  description: string
  headers?: Record<string, Header | Reference>
  content?: Record<string, MediaType>
}

export interface MediaType {
  schema?: Schema | Reference
  example?: any
  examples?: Record<string, Example | Reference>
}

export interface Schema {
  type?: string
  format?: string
  title?: string
  description?: string
  enum?: any[]
  properties?: Record<string, Schema | Reference>
  required?: string[]
  items?: Schema | Reference
  example?: any
  $ref?: string
}

export interface Reference {
  $ref: string
}

export interface Header {
  description?: string
  schema?: Schema | Reference
  example?: any
}

export interface Example {
  summary?: string
  description?: string
  value?: any
}

export interface SecurityScheme {
  type: string
  description?: string
  name?: string
  in?: string
  scheme?: string
  bearerFormat?: string
  flows?: any
  openIdConnectUrl?: string
}

export interface SecurityRequirement {
  [key: string]: string[]
}

export interface AuthConfig {
  type: 'none' | 'bearer' | 'apiKey' | 'basic'
  bearer?: { token: string }
  apiKey?: { name: string; value: string; in: 'header' | 'query' }
  basic?: { username: string; password: string }
}

export interface OpenAPISpec {
  id: string
  name: string
  spec: OpenAPI3Spec
  createdAt: Date
  updatedAt: Date
}

export interface Environment {
  id: string
  name: string
  baseUrl: string
  headers: Record<string, string>
  isDefault: boolean
  auth?: AuthConfig
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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE'

export interface EndpointInfo {
  path: string
  method: HttpMethod
  summary?: string
  description?: string
  parameters?: Parameter[]
  requestBody?: RequestBody | Reference
  responses?: Record<string, Response | Reference>
  security?: SecurityRequirement[]
}

export interface SavedRequest {
  id: string
  specId: string
  endpointKey: string // '{method}:{path}' format
  name?: string
  pathParams: Record<string, string>
  queryParams: Record<string, string>
  headers: Record<string, string>
  body?: any
  createdAt: Date
  updatedAt: Date
}