import { useMemo } from 'react'
import { EndpointInfo, OpenAPISpec, Environment } from '../../types'
import {
  getEndpointSecurityRequirements,
  getSecuritySchemeNames,
  getSecuritySchemes,
  endpointRequiresAuth,
  isAuthConfigured,
  getSecuritySchemeLabel
} from '../../lib/auth'

interface AuthSectionProps {
  endpoint: EndpointInfo | null
  selectedSpec: OpenAPISpec | null
  selectedEnvironment: Environment | null
}

export default function AuthSection({ endpoint, selectedSpec, selectedEnvironment }: AuthSectionProps) {
  const authStatus = useMemo(() => {
    if (!endpoint || !selectedSpec) return null

    const security = getEndpointSecurityRequirements(
      endpoint.security,
      selectedSpec.spec.security
    )

    if (!endpointRequiresAuth(security)) return null

    const schemeNames = getSecuritySchemeNames(security)
    if (schemeNames.length === 0) return null

    const availableSchemes = getSecuritySchemes(selectedSpec.spec)
    const primarySchemeName = schemeNames[0]
    const primaryScheme = availableSchemes[primarySchemeName]

    if (!primaryScheme) return null

    return {
      label: getSecuritySchemeLabel(primaryScheme),
      configured: isAuthConfigured(selectedEnvironment?.auth, primarySchemeName, primaryScheme),
      envName: selectedEnvironment?.name
    }
  }, [endpoint, selectedSpec, selectedEnvironment])

  if (!authStatus) return null

  return (
    <div className={`rounded-lg shadow-sm border p-3 ${
      authStatus.configured
        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
        : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
    }`}>
      <div className="flex items-center space-x-2">
        <span className="text-sm">
          {authStatus.configured ? '✅' : '⚠️'}
        </span>
        <div className="flex-1 min-w-0">
          {authStatus.configured ? (
            <p className="text-sm text-green-800 dark:text-green-300">
              <strong>{authStatus.label}</strong> configured
              {authStatus.envName && (
                <span className="text-green-600 dark:text-green-400"> (from &quot;{authStatus.envName}&quot;)</span>
              )}
            </p>
          ) : (
            <>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {authStatus.label} required
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Configure authentication in Environment settings
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
