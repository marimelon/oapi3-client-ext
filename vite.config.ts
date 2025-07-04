import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    rollupOptions: {
      input: {
        options: 'src/options/index.html'
      }
    }
  },
  resolve: {
    alias: {
      'jq-web': resolve('./node_modules/jq-web')
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
})