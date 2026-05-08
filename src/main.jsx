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
