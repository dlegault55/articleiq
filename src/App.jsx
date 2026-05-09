import { Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Layout from '@/components/Layout'
import LoginPage from '@/pages/LoginPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import DashboardPage from '@/pages/DashboardPage'
import ScanResultsPage from '@/pages/ScanResultsPage'
import ConnectorPage from '@/pages/ConnectorPage'
import SettingsPage from '@/pages/SettingsPage'
import LandingPage from '@/pages/LandingPage'
import HelpPage from '@/pages/HelpPage'
import ReleaseNotesPage from '@/pages/ReleaseNotesPage'
import SharePage from '@/pages/SharePage'
import UpgradePage from '@/pages/UpgradePage'
import ContactPage from '@/pages/ContactPage'

// Error boundary
class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 13, fontFamily: 'DM Mono', color: 'var(--text-muted)', marginBottom: 12 }}>Something went wrong</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    )
  }
}

const HomeRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <LandingPage />
}

const Guard = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/home" element={<LandingPage />} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/share/:id" element={<SharePage />} />
        <Route path="/" element={<Guard><Layout /></Guard>}>
          <Route path="dashboard"           element={<DashboardPage />} />
          <Route path="scanner/results/:id" element={<ScanResultsPage />} />
          <Route path="connector"           element={<ConnectorPage />} />
          <Route path="settings"            element={<SettingsPage />} />
          <Route path="help"               element={<HelpPage />} />
          <Route path="release-notes"      element={<ReleaseNotesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
