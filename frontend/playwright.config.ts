import { defineConfig, devices } from '@playwright/test'

const API_PORT = 8041
const APP_PORT = 5177
const API_URL = `http://127.0.0.1:${API_PORT}`
const APP_URL = `http://localhost:${APP_PORT}`

// The built app talks to the rehearsal server (synthetic routes and weather), never to a real provider.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: APP_URL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `FAKE_SERVER_PORT=${API_PORT} uv run python ../scripts/run_fake_server.py`,
      cwd: '../backend',
      url: `${API_URL}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      timeout: 60_000,
    },
    {
      command: `VITE_API_BASE_URL=${API_URL} npm run build && npm run preview -- --port ${APP_PORT} --strictPort`,
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      stdout: 'ignore',
      timeout: 180_000,
    },
  ],
})
