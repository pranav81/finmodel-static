import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace YOUR_REPO_NAME with your GitHub repository name
// e.g. if your repo is github.com/username/finmodel-static
// set base: '/finmodel-static/'
export default defineConfig({
  plugins: [react()],
  base: '/finmodel-static/',   // ← change this to match your repo name
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  optimizeDeps: {
    exclude: ['pyodide'],       // Pyodide loads itself dynamically
  },
  server: {
    headers: {
      // Required for Pyodide SharedArrayBuffer support
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
