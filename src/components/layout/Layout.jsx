import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useConnector } from '@/hooks/useConnector'
import { signOut } from '@/lib/supabase'
import {
  LayoutDashboard, Scan, Plug, CreditCard, Settings,
  ShieldCheck, LogOut, Zap, Sun, Moon
} from 'lucide-react'
import clsx from 'clsx'

export default function Layout() {
  const { profile } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { hasConnector } = useConnector()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',  locked: false },
    { to: '/scanner',   icon: Scan,            label: 'Scanner',    locked: !hasConnector },
    { to: '/connector', icon: Plug,            label: 'Connector',  locked: false },
    { to: '/billing',   icon: CreditCard,      label: 'Billing',    locked: false },
    { to: '/settings',  icon: Settings,        label: 'Settings',   locked: false },
  ]

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #107C10, #0A5A0A)', boxShadow: '0 0 10px rgba(16,124,16,0.3)' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#fff', fontSize: 12 }}>A</span>
            </div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: 2, color: 'var(--text-primary)' }}>
              ARTICLE<span style={{ color: 'var(--xbox)' }}>IQ</span>
            </span>
          </div>
        </div>

        {/* Plan badge */}
        <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs"
            style={{
              background: profile?.plan === 'paid' ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
              border: `1px solid ${profile?.plan === 'paid' ? 'var(--xbox-border)' : 'var(--border)'}`,
              color: profile?.plan === 'paid' ? 'var(--xbox)' : 'var(--text-muted)',
              fontFamily: 'Fira Code, monospace',
            }}>
            <div className="flex items-center gap-1.5">
              <Zap size={10} />
              <span>{profile?.plan === 'paid' ? 'PRO PLAN' : 'FREE PLAN'}</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="section-header px-2 mb-2" style={{ fontSize: 9 }}>Navigation</p>
          {navItems.map(({ to, icon: Icon, label, locked }) => (
            locked
              ? <div key={to} className="nav-item" style={{ opacity: 0.4, cursor: 'not-allowed' }} title="Connect Zendesk first">
                  <Icon size={15} className="flex-shrink-0" />
                  {label}
                  <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: 'Fira Code, monospace', background: 'var(--bg-overlay)', color: 'var(--text-muted)', padding: '1px 5px', borderRadius: 3 }}>SETUP</span>
                </div>
              : <NavLink key={to} to={to} className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
                  <Icon size={15} className="nav-icon flex-shrink-0" />
                  {label}
                </NavLink>
          ))}

          {profile?.is_admin && (
            <>
              <p className="section-header px-2 mt-4 mb-2" style={{ fontSize: 9 }}>Admin</p>
              <NavLink to="/admin" className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
                <ShieldCheck size={15} className="nav-icon flex-shrink-0" />
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* Theme toggle + user */}
        <div className="px-2 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-md mb-2 text-xs transition-all"
            style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 10 }}>{isDark ? 'DARK MODE' : 'LIGHT MODE'}</span>
            <div className="flex items-center gap-1">
              <Sun size={11} style={{ color: isDark ? 'var(--text-muted)' : 'var(--xbox)', transition: 'color 0.2s' }} />
              <div className="relative w-7 h-4 rounded-full transition-all"
                style={{ background: isDark ? 'var(--xbox)' : 'var(--border-bright)' }}>
                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all"
                  style={{ left: isDark ? '14px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
              </div>
              <Moon size={11} style={{ color: isDark ? 'var(--xbox)' : 'var(--text-muted)', transition: 'color 0.2s' }} />
            </div>
          </button>

          {/* User */}
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0" style={{ border: '1px solid var(--border)' }} />
              : <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: 'var(--xbox-subtle)', color: 'var(--xbox)', fontSize: 10 }}>
                  {profile?.full_name?.[0] || profile?.email?.[0] || '?'}
                </div>}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{profile?.full_name || 'User'}</div>
              <div className="truncate" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{profile?.email}</div>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn-ghost w-full justify-start" style={{ fontSize: 12, padding: '5px 10px', color: 'var(--text-muted)' }}>
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
        <Outlet />
      </main>
    </div>
  )
}
