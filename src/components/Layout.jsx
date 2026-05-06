import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { signOut } from '@/lib/supabase'
import { LayoutDashboard, Plug, Settings, LogOut, Scan, Loader } from 'lucide-react'

export default function Layout() {
  const { profile, user } = useAuth()
  const { activeScan } = useScan()
  const navigate = useNavigate()

  const name = profile?.full_name || user?.email?.split('@')[0] || 'Account'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const nav = [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/connector',  icon: Plug,             label: 'Connectors' },
    { to: '/settings',   icon: Settings,         label: 'Settings'   },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: 'var(--green)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scan size={15} color="white" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.3 }}>ArticleIQ</span>
          </div>
        </div>

        {/* Active scan indicator */}
        {activeScan && (
          <button
            onClick={() => navigate(`/scanner/results/${activeScan.id}`)}
            style={{ margin: '12px 12px 0', padding: '10px 12px', background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Loader size={13} style={{ color: 'var(--green)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>Scan running</div>
              <div style={{ fontSize: 11, color: 'var(--green)', opacity: 0.8 }}>
                {activeScan.scanned_articles || 0} / {activeScan.total_articles || '?'} articles
              </div>
            </div>
          </button>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 12px 0' }}>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '9px 10px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 2,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--green)' : 'var(--text-secondary)',
                background: isActive ? 'var(--green-light)' : 'transparent',
                textDecoration: 'none',
                transition: 'all 0.1s',
              })}
              onMouseEnter={e => { if (!e.currentTarget.style.background.includes('green-light')) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!e.currentTarget.className?.includes('active')) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + sign out */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)', marginBottom: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{initials}</span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{profile?.plan || 'free'}</div>
            </div>
          </div>
          <button onClick={() => signOut()} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: 13, color: 'var(--text-muted)' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <Outlet />
      </main>
    </div>
  )
}
