// デバッグログ制御
const DEBUG = import.meta.env.DEV

export function debugLog(message: string, ...args: any[]) {
  if (DEBUG) {
    console.log(`🔍 ${message}`, ...args)
  }
}

export function debugWarn(message: string, ...args: any[]) {
  if (DEBUG) {
    console.warn(`⚠️ ${message}`, ...args)
  }
}

export function debugError(message: string, ...args: any[]) {
  if (DEBUG) {
    console.error(`❌ ${message}`, ...args)
  }
}
