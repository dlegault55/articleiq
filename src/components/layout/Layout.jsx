import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useConnector } from '@/hooks/useConnector'
import { useScan } from '@/hooks/useScan'
import { signOut } from '@/lib/supabase'
import { LayoutDashboard, Plug, CreditCard, Settings, ShieldCheck, LogOut, Zap, Loader } from 'lucide-react'
import clsx from 'clsx'

export default function Layout() {
  const { profile } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { hasConnector } = useConnector()
  const { activeScan } = useScan()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
    { to: '/connector', icon: Plug,            label: 'Connectors' },
    { to: '/billing',   icon: CreditCard,      label: 'Billing'    },
    { to: '/settings',  icon: Settings,        label: 'Settings'   },
  ]

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
        {/* Active scan banner */}
        {activeScan && (
          <NavLink to={`/scanner/results/${activeScan.id}`}
            className="mx-2 mb-2 flex items-center gap-2 px-3 py-2 rounded-md text-left transition-all"
            style={{ background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)', textDecoration: 'none' }}>
            <Loader size={11} className="animate-spin flex-shrink-0" style={{ color: 'var(--xbox)' }} />
            <div className="min-w-0">
              <div className="text-xs font-semibold" style={{ color: 'var(--xbox)' }}>Scan running</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {activeScan.scanned_articles || 0}/{activeScan.total_articles || '?'} articles
              </div>
            </div>
          </NavLink>
        )}

        <p className="section-header px-2 mb-2" style={{ fontSize: 9 }}>Navigation</p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => clsx('nav-item', isActive && 'active')}>
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
