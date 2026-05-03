import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ScannerPage from './pages/ScannerPage'
import ScanResultsPage from './pages/ScanResultsPage'
import ConnectorPage from './pages/ConnectorPage'
import SettingsPage from './pages/SettingsPage'
import AdminPage from './pages/AdminPage'
import BillingPage from './pages/BillingPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import LoadingScreen from './components/ui/LoadingScreen'

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
  if (!profile?.is_admin) return <Navigate to="/dashboard" replace />
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
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="scanner" element={<ScannerPage />} />
        <Route path="scanner/results/:scanId" element={<ScanResultsPage />} />
        <Route path="connector" element={<ConnectorPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
