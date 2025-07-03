declare module 'jq-web' {
  interface JqInstance {
    json(data: any, filter: string): any
    raw(data: string, filter: string): string
  }
  
  function jq(): Promise<JqInstance>
  export default jq
}