import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{launchOptions:{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}}:{channel:'chromium'}), baseURL: 'http://127.0.0.1:5175', reducedMotion: 'reduce' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5175', reuseExistingServer: false, env: {NODE_ENV:'test',DATABASE_URL:'',SUPABASE_URL:'',MAIL_MAILER:'json',API_PORT:'3002',VITE_PORT:'5175',APP_ORIGIN:'http://127.0.0.1:5175',DATA_DIR:new URL('./data/e2e',import.meta.url).pathname} },
});
