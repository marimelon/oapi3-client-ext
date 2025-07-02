
interface RequestBodyModeToggleProps {
  mode: 'form' | 'raw'
  onModeChange: (mode: 'form' | 'raw') => void
}

export default function RequestBodyModeToggle({ mode, onModeChange }: RequestBodyModeToggleProps) {
  return (
    <div className="flex mb-3">
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onModeChange('form')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'form'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          📝 Form
        </button>
        <button
          type="button"
          onClick={() => onModeChange('raw')}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            mode === 'raw'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          📄 Raw JSON
        </button>
      </div>
    </div>
  )
}