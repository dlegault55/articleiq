import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/supabase'
import {
  LayoutDashboard, Scan, Plug, CreditCard, Settings,
  ShieldCheck, LogOut, Zap, ChevronRight
} from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/scanner', icon: Scan, label: 'Scanner' },
  { to: '/connector', icon: Plug, label: 'Connector' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden grid-overlay">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-border bg-surface-1 relative z-10">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #107C10, #0A5A0A)', boxShadow: '0 0 12px rgba(16,124,16,0.4)' }}>
              <span className="font-display font-bold text-white text-sm">A</span>
            </div>
            <div>
              <div className="font-display font-bold text-sm tracking-wider text-primary" style={{ color: 'var(--text-primary)' }}>
                ARTICLE<span style={{ color: 'var(--xbox)' }}>IQ</span>
              </div>
              <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>v0.1.0</div>
            </div>
          </div>
        </div>

        {/* Plan badge */}
        <div className="px-4 py-3 border-b border-border">
          <div className={clsx(
            'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono',
            profile?.plan === 'paid'
              ? 'bg-xbox/20 border border-xbox/30 text-xbox-light'
              : 'bg-surface-3 border border-border text-secondary'
          )}>
            <div className="flex items-center gap-1.5">
              <Zap size={11} />
              <span>{profile?.plan === 'paid' ? 'PRO PLAN' : 'FREE PLAN'}</span>
            </div>
            {profile?.plan === 'free' && (
              <NavLink to="/billing" className="hover:text-xbox transition-colors">
                <ChevronRight size={11} />
              </NavLink>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="section-header px-2 mb-3">Navigation</p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx('nav-item', isActive && 'active')}
            >
              <Icon size={16} className="nav-icon flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {profile?.is_admin && (
            <>
              <p className="section-header px-2 mt-5 mb-3">Admin</p>
              <NavLink
                to="/admin"
                className={({ isActive }) => clsx('nav-item', isActive && 'active')}
              >
                <ShieldCheck size={16} className="nav-icon flex-shrink-0" />
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2.5 mb-2">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-full border border-border" />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: 'var(--surface-4)', color: 'var(--xbox-light)' }}>
                {profile?.full_name?.[0] || profile?.email?.[0] || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {profile?.full_name || 'User'}
              </div>
              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {profile?.email}
              </div>
            </div>
          </div>
          <button onClick={handleSignOut} className="btn-ghost w-full justify-start text-xs py-1.5">
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-surface-0">
        <Outlet />
      </main>
    </div>
  )
}
