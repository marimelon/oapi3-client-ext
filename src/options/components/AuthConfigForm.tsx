import { useState, useMemo } from 'react'
import { AuthConfig, SecurityScheme } from '../../types'
import { getSecuritySchemeLabel } from '../../lib/auth'

interface AuthConfigFormProps {
  auth: AuthConfig
  onChange: (auth: AuthConfig) => void
  availableSchemes?: Record<string, SecurityScheme>
}

export default function AuthConfigForm({ auth, onChange, availableSchemes }: AuthConfigFormProps) {
  const [showToken, setShowToken] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const detectedSchemes = useMemo(() => {
    if (!availableSchemes) return []
    return Object.entries(availableSchemes).map(([name, scheme]) => ({
      name,
      scheme,
      label: getSecuritySchemeLabel(scheme)
    }))
  }, [availableSchemes])

  const suggestedApiKeyName = useMemo(() => {
    if (!availableSchemes) return undefined
    const apiKeyScheme = Object.values(availableSchemes).find(s => s.type === 'apiKey')
    return apiKeyScheme?.name
  }, [availableSchemes])

  const suggestedApiKeyIn = useMemo(() => {
    if (!availableSchemes) return undefined
    const apiKeyScheme = Object.values(availableSchemes).find(s => s.type === 'apiKey')
    return apiKeyScheme?.in as 'header' | 'query' | undefined
  }, [availableSchemes])

  const handleTypeChange = (type: AuthConfig['type']) => {
    const newAuth: AuthConfig = { type }
    if (type === 'apiKey' && suggestedApiKeyName) {
      newAuth.apiKey = { name: suggestedApiKeyName, value: '', in: suggestedApiKeyIn || 'header' }
    }
    onChange(newAuth)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Authentication
        {detectedSchemes.length > 0 && (
          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
            Detected: {detectedSchemes.map(s => s.label).join(', ')}
          </span>
        )}
      </label>

      <select
        value={auth.type}
        onChange={(e) => handleTypeChange(e.target.value as AuthConfig['type'])}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="none">None</option>
        <option value="bearer">Bearer Token</option>
        <option value="apiKey">API Key</option>
        <option value="basic">Basic Auth</option>
      </select>

      {auth.type === 'bearer' && (
        <div className="space-y-2 pl-3 border-l-2 border-blue-500">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Token <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={auth.bearer?.token || ''}
              onChange={(e) => onChange({ ...auth, bearer: { token: e.target.value } })}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="w-full px-2 py-1 pr-14 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded"
            >
              {showToken ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Header: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Authorization: Bearer [token]</code>
          </p>
        </div>
      )}

      {auth.type === 'apiKey' && (
        <div className="space-y-2 pl-3 border-l-2 border-green-500">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Key Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={auth.apiKey?.name || ''}
              onChange={(e) => onChange({ ...auth, apiKey: { ...auth.apiKey!, name: e.target.value, value: auth.apiKey?.value || '', in: auth.apiKey?.in || 'header' } })}
              placeholder={suggestedApiKeyName || 'X-API-Key'}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {suggestedApiKeyName && auth.apiKey?.name !== suggestedApiKeyName && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Suggested: <strong>{suggestedApiKeyName}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <select
              value={auth.apiKey?.in || 'header'}
              onChange={(e) => onChange({ ...auth, apiKey: { ...auth.apiKey!, name: auth.apiKey?.name || '', value: auth.apiKey?.value || '', in: e.target.value as 'header' | 'query' } })}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="header">Header</option>
              <option value="query">Query Parameter</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={auth.apiKey?.value || ''}
                onChange={(e) => onChange({ ...auth, apiKey: { ...auth.apiKey!, name: auth.apiKey?.name || '', in: auth.apiKey?.in || 'header', value: e.target.value } })}
                placeholder="sk_live_..."
                className="w-full px-2 py-1 pr-14 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {auth.apiKey?.in === 'query' ? 'Query param' : 'Header'}:{' '}
            <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
              {auth.apiKey?.name || 'key'}: [value]
            </code>
          </p>
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="space-y-2 pl-3 border-l-2 border-purple-500">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={auth.basic?.username || ''}
              onChange={(e) => onChange({ ...auth, basic: { username: e.target.value, password: auth.basic?.password || '' } })}
              placeholder="username"
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={auth.basic?.password || ''}
                onChange={(e) => onChange({ ...auth, basic: { username: auth.basic?.username || '', password: e.target.value } })}
                placeholder="password"
                className="w-full px-2 py-1 pr-14 border border-gray-300 dark:border-gray-600 rounded text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Header: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">Authorization: Basic [base64]</code>
          </p>
        </div>
      )}

      {auth.type === 'none' && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          No authentication will be added to requests.
        </p>
      )}
    </div>
  )
}
