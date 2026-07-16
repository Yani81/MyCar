import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

let commit = 'dev'
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim()
} catch {
  /* извън git репо */
}

export default defineConfig({
  plugins: [react()],
  base: '/MyCar/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_COMMIT__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
})
