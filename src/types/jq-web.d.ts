declare module 'jq-web' {
  interface JqInstance {
    json(data: any, filter: string): any
    raw(data: string, filter: string, flags?: string): string
  }
  
  const jq: Promise<JqInstance>
  export default jq
}

declare module 'jq-web/jq.wasm.js' {
  interface JqInstance {
    json?: (data: any, query: string) => any
    raw?: (jsonString: string, query: string) => string
    promised?: {
      json?: (data: any, query: string) => Promise<any>
      raw?: (jsonString: string, query: string) => Promise<string>
    }
    onInitialized?: {
      addListener?: (callback: () => void) => void
    }
    locateFile?: (path: string) => string
    Module?: any
  }
  
  const jq: JqInstance
  export default jq
  export function json(data: any, filter: string): any
  export function raw(data: string, filter: string, flags?: string): string
}