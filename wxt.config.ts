import { defineConfig } from 'wxt';
import { resolve } from 'path';

export default defineConfig({
  manifest: {
    name: 'OpenAPI 3 Client Extension',
    version: '1.1.0',
    description: 'Chrome extension for testing OpenAPI 3 endpoints with browser authentication',
    permissions: [
      'storage',
      'declarativeNetRequest'
    ],
    host_permissions: [
      'http://*/*',
      'https://*/*'
    ],
    action: {
      default_title: 'OpenAPI 3 Client'
    },
    options_page: 'options.html',
    background: {
      type: 'module'
    },
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
    },
    web_accessible_resources: [
      {
        resources: ['assets/jq.js', 'assets/jq.wasm'],
        matches: ['<all_urls>']
      }
    ],
  },
  
  modules: ['@wxt-dev/module-react'],
  
  webExt: {
    startUrls: ['chrome://extensions/'],
  },
  
  vite: () => ({
    resolve: {
      alias: {
        'jq-web': resolve('./node_modules/jq-web'),
        '@': resolve('./src')
      }
    },
    define: {
      global: 'globalThis'
    },
    optimizeDeps: {
      exclude: ['jq-web']
    },
    server: {
      fs: {
        allow: ['..']
      }
    },
    assetsInclude: ['**/*.wasm']
  }),
  
  // Copy jq assets to public directory
  hooks: {
    'build:before': async () => {
      const fs = await import('fs');
      const path = await import('path');
      
      const publicAssetsDir = path.join(process.cwd(), 'public', 'assets');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(publicAssetsDir)) {
        fs.mkdirSync(publicAssetsDir, { recursive: true });
      }
      
      // Copy jq.js and jq.wasm
      const jqJsSource = path.join(process.cwd(), 'node_modules', 'jq-web', 'jq.js');
      const jqWasmSource = path.join(process.cwd(), 'node_modules', 'jq-web', 'jq.wasm');
      
      fs.copyFileSync(jqJsSource, path.join(publicAssetsDir, 'jq.js'));
      fs.copyFileSync(jqWasmSource, path.join(publicAssetsDir, 'jq.wasm'));
    }
  }
});