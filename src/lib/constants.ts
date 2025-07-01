export const OPENAPI_CONSTANTS = {
  MAX_RESOLUTION_DEPTH: 50,
  DEFAULT_MAX_DEPTH: 100,
  MAX_RETRY_ATTEMPTS: 3,
} as const;

export const STORAGE_CONSTANTS = {
  MAX_HISTORY_ITEMS: 49,
  STORAGE_KEYS: {
    API_SPECS: 'apiSpecs',
    ENVIRONMENTS: 'environments',
    REQUEST_HISTORY: 'requestHistory',
  },
} as const;

export const UI_CONSTANTS = {
  COPY_FEEDBACK_DURATION: 2000,
  DEFAULT_PANEL_WIDTH: 600,
  MIN_PANEL_WIDTH: 300,
  MAX_PANEL_WIDTH: 1200,
} as const;

export const HTTP_CONSTANTS = {
  DEFAULT_TIMEOUT: 30000,
  SUPPORTED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const,
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
} as const;