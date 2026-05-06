import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { signOut } from '@/lib/supabase'
import { Scan, Loader } from 'lucide-react'

export default function Layout() {
  const { profile, user } = useAuth()
  const { activeScan } = useScan()
  const navigate = useNavigate()

  const name = profile?.full_name || user?.email?.split('@')[0] || 'Account'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(240,245,240,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 28px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: 'var(--green)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scan size={16} color="white" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text)', letterSpacing: -0.3 }}>
            Article<span style={{ color: 'var(--green)' }}>IQ</span>
          </span>
        </div>

        {/* Nav pills */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.7)', borderRadius: 100, padding: 4, border: '1px solid var(--border-md)' }}>
          {[
            { to: '/dashboard',  label: 'Dashboard' },
            { to: '/connector',  label: 'Connectors' },
            { to: '/settings',   label: 'Settings' },
          ].map(({ to, label }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({
                padding: '5px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                color: isActive ? 'white' : 'var(--text-2)',
                background: isActive ? 'var(--green)' : 'transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              })}>
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right side: active scan + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {activeScan && (
            <button onClick={() => navigate(`/scanner/results/${activeScan.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 100, background: 'var(--green-light)', border: '1px solid var(--green-border)', cursor: 'pointer' }}>
              <Loader size={12} style={{ color: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
                {activeScan.scanned_articles || 0}/{activeScan.total_articles || '?'}
              </span>
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>
              {initials}
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main>
        <Outlet />
      </main>
    </div>
  )
}
