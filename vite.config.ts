import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.PORT) || 3000
  return {
    plugins: [react()],
    server: {
      port,
      host: true,
    },
    preview: {
      port,
      host: true,
    },
    define: {
      __DEPLOYMENT_MODE__: JSON.stringify(env.DEPLOYMENT_MODE || mode),
    },
  }
})
