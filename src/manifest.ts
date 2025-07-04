import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'OpenAPI 3 Client Extension',
  version: '1.0.0',
  description: 'Chrome extension for testing OpenAPI 3 endpoints with browser authentication',
  
  permissions: [
    'storage',
    'activeTab',
    'declarativeNetRequest'
  ],
  
  host_permissions: [
    'http://*/*',
    'https://*/*'
  ],
  
  action: {
    default_title: 'OpenAPI 3 Client'
  },
  
  options_page: 'src/options/index.html',
  
  background: {
    service_worker: 'src/background/background.ts',
    type: 'module'
  },
  
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },
  
  web_accessible_resources: [
    {
      resources: ['assets/jq.wasm', 'assets/jq.wasm.wasm', 'assets/jq.asm.js', 'assets/jq.asm.js.mem', 'assets/*.wasm', 'assets/*.js', 'assets/*.mem'],
      matches: ['<all_urls>'],
      use_dynamic_url: false
    }
  ],
  
})