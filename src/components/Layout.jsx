import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { signOut } from '@/lib/supabase'
import { Scan, Loader, ChevronDown, Plug, LogOut, User, HelpCircle, Zap } from 'lucide-react'

const menuBtn = {
  display:'flex', alignItems:'center', gap:9, width:'100%',
  padding:'8px 10px', borderRadius:7, border:'none', background:'none',
  cursor:'pointer', fontSize:13, fontWeight:500, color:'var(--text-2)',
  textAlign:'left', transition:'background 0.1s', fontFamily:'inherit',
}

function AvatarMenu({ name, email, plan, initials }) {
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)
  const nav  = useNavigate()

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const go = (path) => { setOpen(false); nav(path) }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 8px 4px 4px', borderRadius:100, border:'1px solid var(--border-md)', background: open ? 'var(--bg)' : 'white', cursor:'pointer', transition:'all 0.15s' }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
          {initials}
        </div>
        <ChevronDown size={12} style={{ color:'var(--text-3)', transition:'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 8px)', right:0, background:'white', borderRadius:12, border:'1px solid var(--border-md)', boxShadow:'0 8px 32px rgba(0,0,0,0.1)', minWidth:220, zIndex:200, overflow:'hidden' }}>
          {/* Account info */}
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{name}</p>
            <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:8 }}>{email}</p>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 9px', borderRadius:100,
              background: ['paid','pack','annual'].includes(plan) ? 'var(--navy-light)' : 'var(--bg)',
              color: ['paid','pack','annual'].includes(plan) ? 'var(--navy)' : 'var(--text-3)',
              border: `1px solid ${['paid','pack','annual'].includes(plan) ? 'var(--navy-border)' : 'var(--border-md)'}`,
            }}>
              {plan === 'annual' ? '★ Annual Pro' : plan === 'pack' ? '★ Scan Pack' : ['paid'].includes(plan) ? '★ Pro' : 'Free plan'}
            </span>
          </div>

          <div style={{ padding:'5px' }}>
            {[
              { icon: Plug,        label:'Manage connectors', path:'/connector' },
              { icon: HelpCircle,  label:'Help & docs',       path:'/help' },
              { icon: User,        label:'Account settings',  path:'/settings' },
              ...(plan === 'pack' ? [{ icon: Zap, label:'Upgrade to Annual Pro', path:'/upgrade' }] : []),
              ...(plan === 'free' ? [{ icon: Zap, label:'Upgrade to Scan Pack', path:'/upgrade' }] : []),
            ].map(({ icon: Icon, label, path }) => (
              <button key={path} onClick={() => go(path)} style={menuBtn}
                onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background='none'}>
                <Icon size={14} style={{ color:'var(--text-3)' }} /> {label}
              </button>
            ))}
          </div>

          <div style={{ borderTop:'1px solid var(--border)', padding:'8px 16px 6px', display:'flex', gap:14 }}>
            {[['Terms', '/terms'], ['Privacy', '/privacy'], ['Contact', '/contact']].map(([label, path]) => (
              <button key={path} onClick={() => go(path)}
                style={{ fontSize:11, color:'var(--text-3)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'inherit' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ borderTop:'1px solid var(--border)', padding:'5px' }}>
            <button onClick={() => signOut()} style={{ ...menuBtn, color:'var(--red)' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--red-light)'}
              onMouseLeave={e => e.currentTarget.style.background='none'}>
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const { profile, user } = useAuth()
  const { activeScan }    = useScan()
  const navigate          = useNavigate()

  const name     = profile?.full_name || user?.email?.split('@')[0] || 'Account'
  const email    = user?.email || ''
  const plan     = profile?.plan || 'free'
  const initials = name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(247,247,245,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--border-md)', padding:'0 clamp(12px,4vw,24px)', height:52, display:'flex', alignItems:'center', justifyContent:'space-between' }}>

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:26, height:26, background:'var(--navy)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={13} color="white" />
          </div>
          <span style={{ fontWeight:800, fontSize:15, color:'var(--text)', letterSpacing:-0.3 }}>
            Article<span style={{ color:'var(--green)' }}>IQ</span>
          </span>
        </div>

        {/* Center — empty spacer */}
        <div />

        {/* Right */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <NavLink to="/dashboard"
            style={({ isActive }) => ({
              padding:'5px 14px', borderRadius:100, fontSize:12, fontWeight:600,
              color: isActive ? 'white' : 'var(--text-2)',
              background: isActive ? 'var(--navy)' : 'transparent',
              textDecoration:'none', transition:'all 0.15s',
              border: isActive ? 'none' : '1px solid transparent',
            })}>
            Dashboard
          </NavLink>
          {activeScan && (
            <button onClick={() => navigate(`/scanner/results/${activeScan.id}`)}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:100, background:'var(--navy-light)', border:'1px solid var(--navy-border)', cursor:'pointer' }}>
              <Loader size={11} style={{ color:'var(--navy)', animation:'spin 0.8s linear infinite' }} />
              <span style={{ fontSize:11, fontWeight:600, color:'var(--navy)' }}>
                {activeScan.scanned_articles||0}/{activeScan.total_articles||'?'}
              </span>
            </button>
          )}
          <AvatarMenu name={name} email={email} plan={plan} initials={initials} />
        </div>
      </nav>
      <main><Outlet /></main>
      <footer style={{ borderTop:'1px solid var(--border-md)', padding:'14px clamp(12px,4vw,24px)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'white' }}>
        <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>© 2026 ArticleIQ</p>
        <div style={{ display:'flex', gap:16 }}>
          {[['Terms', '/terms'], ['Privacy', '/privacy'], ['Contact', '/contact']].map(([label, path]) => (
            <Link key={path} to={path} style={{ fontSize:11, color:'var(--text-3)', textDecoration:'none' }}>{label}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
