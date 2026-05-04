import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './hooks/useTheme'
import { ConnectorProvider } from './hooks/useConnector'
import { ScanProvider } from './hooks/useScan'
import { ToastProvider } from './hooks/useToast'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ConnectorProvider>
            <ScanProvider>
              <ToastProvider>
                <App />
              </ToastProvider>
            </ScanProvider>
          </ConnectorProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
