import { Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ScanResultsPage from './pages/ScanResultsPage'
import ConnectorPage from './pages/ConnectorPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import BillingPage from './pages/BillingPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import SharedReportPage from './pages/SharedReportPage'
import LoadingScreen from './components/ui/LoadingScreen'

// ─── Error Boundary ────────────────────────────────────────────
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)', padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', background: 'var(--xbox)', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            Reload page
          </button>
        </div>
      </div>
    )
  }
}

// ─── Route guards ──────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return children
}

const AdminRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (profile && !profile.is_admin) return <Navigate to="/dashboard" replace />
  return children
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/share/:scanId" element={<SharedReportPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="scanner" element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="scanner/results/:scanId" element={<ScanResultsPage />} />
          <Route path="connector" element={<ConnectorPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
