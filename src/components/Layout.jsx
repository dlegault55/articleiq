import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { signOut } from '@/lib/supabase'
import { Scan, Loader, ChevronDown, Plug, LogOut, User, HelpCircle, Sparkles } from 'lucide-react'

function AvatarMenu({ name, email, plan, initials }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const go = (path) => { setOpen(false); navigate(path) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', borderRadius: 100, background: open ? 'rgba(16,124,16,0.1)' : 'transparent', border: '1px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,124,16,0.08)'}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
          {initials}
        </div>
        <ChevronDown size={13} style={{ color: 'var(--text-2)', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'white', borderRadius: 12, border: '1px solid var(--border-md)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', minWidth: 220, zIndex: 200, overflow: 'hidden' }}>
          {/* Account info */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>{email}</p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: plan === 'paid' ? 'var(--green-light)' : 'var(--bg)', color: plan === 'paid' ? 'var(--green)' : 'var(--text-3)', border: `1px solid ${plan === 'paid' ? 'var(--green-border)' : 'var(--border-md)'}` }}>
              {plan === 'paid' ? '★ Pro' : 'Free plan'}
            </span>
          </div>

          {/* Menu items */}
          <div style={{ padding: '6px' }}>
            <button onClick={() => go('/connector')}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <Plug size={15} style={{ color: 'var(--text-3)' }} /> Manage connectors
            </button>
            <button onClick={() => go('/release-notes')}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <Sparkles size={15} style={{ color: 'var(--text-3)' }} /> What's new
            </button>
            <button onClick={() => go('/help')}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <HelpCircle size={15} style={{ color: 'var(--text-3)' }} /> Help & docs
            </button>
            <button onClick={() => go('/settings')}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-2)', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <User size={15} style={{ color: 'var(--text-3)' }} /> Account settings
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', padding: '6px' }}>
            <button onClick={() => signOut()}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#DC2626', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { profile, user } = useAuth()
  const { activeScan } = useScan()
  const navigate = useNavigate()

  const name     = profile?.full_name || user?.email?.split('@')[0] || 'Account'
  const email    = user?.email || ''
  const plan     = profile?.plan || 'free'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(240,245,240,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '0 28px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: 'var(--green)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scan size={15} color="white" />
          </div>
          <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: -0.3 }}>
            Article<span style={{ color: 'var(--green)' }}>IQ</span>
          </span>
        </div>

        {/* Single nav pill — just Dashboard */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.7)', borderRadius: 100, padding: 4, border: '1px solid var(--border-md)' }}>
          <NavLink to="/dashboard"
            style={({ isActive }) => ({
              padding: '5px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600,
              color: isActive ? 'white' : 'var(--text-2)',
              background: isActive ? 'var(--green)' : 'transparent',
              textDecoration: 'none', transition: 'all 0.15s',
            })}>
            Dashboard
          </NavLink>
        </div>

        {/* Right: active scan + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {activeScan && (
            <button onClick={() => navigate(`/scanner/results/${activeScan.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 100, background: 'var(--green-light)', border: '1px solid var(--green-border)', cursor: 'pointer' }}>
              <Loader size={12} style={{ color: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)' }}>
                {activeScan.scanned_articles || 0}/{activeScan.total_articles || '?'} articles
              </span>
            </button>
          )}
          <AvatarMenu name={name} email={email} plan={plan} initials={initials} />
        </div>
      </nav>

      <main><Outlet /></main>
    </div>
  )
}
