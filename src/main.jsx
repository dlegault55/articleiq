import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD, // only in production, not local dev
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: 0.2,   // 20% of transactions
  replaysOnErrorSampleRate: 1.0, // 100% of errors get a replay
})

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ScanProvider } from '@/hooks/useScan'
import { ToastProvider } from '@/hooks/useToast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ScanProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </ScanProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
