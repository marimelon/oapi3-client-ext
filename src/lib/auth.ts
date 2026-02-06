import { AuthConfig, SecurityRequirement, SecurityScheme } from '../types'

export function generateAuthHeaders(auth: AuthConfig | undefined): Record<string, string> {
  if (!auth || auth.type === 'none') return {}

  switch (auth.type) {
    case 'bearer':
      if (auth.bearer?.token) {
        return { 'Authorization': `Bearer ${auth.bearer.token}` }
      }
      return {}

    case 'apiKey':
      if (auth.apiKey?.in === 'header' && auth.apiKey.name && auth.apiKey.value) {
        return { [auth.apiKey.name]: auth.apiKey.value }
      }
      return {}

    case 'basic':
      if (auth.basic?.username) {
        const credentials = btoa(`${auth.basic.username}:${auth.basic.password || ''}`)
        return { 'Authorization': `Basic ${credentials}` }
      }
      return {}

    default:
      return {}
  }
}

export function generateAuthQueryParams(auth: AuthConfig | undefined): Record<string, string> {
  if (!auth || auth.type !== 'apiKey') return {}
  if (auth.apiKey?.in === 'query' && auth.apiKey.name && auth.apiKey.value) {
    return { [auth.apiKey.name]: auth.apiKey.value }
  }
  return {}
}

export function getEndpointSecurityRequirements(
  operationSecurity: SecurityRequirement[] | undefined,
  globalSecurity: SecurityRequirement[] | undefined
): SecurityRequirement[] {
  if (operationSecurity !== undefined) return operationSecurity
  return globalSecurity || []
}

export function getSecuritySchemeNames(requirements: SecurityRequirement[]): string[] {
  const names = new Set<string>()
  for (const req of requirements) {
    for (const name of Object.keys(req)) {
      names.add(name)
    }
  }
  return Array.from(names)
}

export function getSecuritySchemes(spec: any): Record<string, SecurityScheme> {
  return spec?.components?.securitySchemes || {}
}

export function getSecuritySchemeLabel(scheme: SecurityScheme): string {
  switch (scheme.type) {
    case 'http':
      if (scheme.scheme === 'bearer') {
        return scheme.bearerFormat ? `Bearer Token (${scheme.bearerFormat})` : 'Bearer Token'
      }
      if (scheme.scheme === 'basic') return 'Basic Auth'
      return `HTTP ${scheme.scheme}`
    case 'apiKey':
      return `API Key${scheme.name ? ` (${scheme.name})` : ''}`
    case 'oauth2':
      return 'OAuth 2.0'
    case 'openIdConnect':
      return 'OpenID Connect'
    default:
      return 'Authentication'
  }
}

export function endpointRequiresAuth(security: SecurityRequirement[] | undefined): boolean {
  if (!security || security.length === 0) return false
  return security.some(req => Object.keys(req).length > 0)
}

export function isAuthConfigured(
  auth: AuthConfig | undefined,
  _schemeName: string,
  scheme: SecurityScheme
): boolean {
  if (!auth || auth.type === 'none') return false

  switch (scheme.type) {
    case 'http':
      if (scheme.scheme === 'bearer') {
        return auth.type === 'bearer' && !!auth.bearer?.token
      }
      if (scheme.scheme === 'basic') {
        return auth.type === 'basic' && !!auth.basic?.username
      }
      return false
    case 'apiKey':
      return auth.type === 'apiKey' && !!auth.apiKey?.name && !!auth.apiKey?.value
    default:
      return false
  }
}
