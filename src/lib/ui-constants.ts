export const INPUT_CLASSES = {
  base: 'w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500',
  colors: {
    light: 'border-gray-300 bg-white text-gray-900 placeholder-gray-500',
    dark: 'dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'
  },
  get full() {
    return `${this.base} ${this.colors.light} ${this.colors.dark}`
  }
} as const

export const FORM_CONSTANTS = {
  INDENT_PX: 12,
  MAX_DEPTH: 50,
  TOOLTIP_DELAY: 2000
} as const

export const BORDER_CLASSES = {
  object: 'border-l-2 border-gray-200 dark:border-gray-600 pl-3',
  oneOf: 'border-l-2 border-blue-200 dark:border-blue-600 pl-3'
} as const