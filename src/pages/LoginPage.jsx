import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Scan, Loader } from 'lucide-react'

export default function LoginPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  if (user) return <Navigate to="/dashboard" replace />

  const signIn = async () => {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:32 }}>
          <div style={{ width:36, height:36, background:'var(--navy)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={18} color="white" />
          </div>
          <span style={{ fontWeight:800, fontSize:20, color:'var(--text)', letterSpacing:-0.5 }}>
            Article<span style={{ color:'var(--green)' }}>IQ</span>
          </span>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:'32px' }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:6, textAlign:'center', letterSpacing:-0.3 }}>
            Sign in to ArticleIQ
          </h1>
          <p style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', marginBottom:24 }}>
            Scan your Zendesk® knowledge base for quality issues
          </p>

          {error && (
            <div style={{ padding:'10px 14px', background:'var(--red-light)', border:'1px solid var(--red-border)', borderRadius:8, marginBottom:16 }}>
              <p style={{ fontSize:13, color:'var(--red)', margin:0 }}>{error}</p>
            </div>
          )}

          <button onClick={signIn} disabled={loading}
            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'11px', borderRadius:9, border:'1px solid var(--border-md)', background:'white', cursor:'pointer', fontSize:14, fontWeight:600, color:'var(--text)', fontFamily:'inherit', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
            onMouseLeave={e => e.currentTarget.style.background='white'}>
            {loading ? <Loader size={16} style={{ animation:'spin 0.7s linear infinite', color:'var(--text-3)' }} /> : (
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
                <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18l2.67-2.07z"/>
                <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
              </svg>
            )}
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div style={{ display:'flex', gap:8, marginTop:20, padding:'12px 14px', background:'var(--navy-light)', border:'1px solid var(--navy-border)', borderRadius:9 }}>
            {['📅 Outdated content', '📖 Readability scores', '🔍 Duplicates'].map(t => (
              <div key={t} style={{ flex:1, fontSize:11, fontWeight:500, color:'var(--navy)', textAlign:'center', lineHeight:1.4 }}>{t}</div>
            ))}
          </div>
        </div>

        <p style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', marginTop:20, lineHeight:1.6 }}>
          Zendesk® is a registered trademark of Zendesk, Inc.<br/>
          ArticleIQ is not affiliated with or endorsed by Zendesk, Inc.
        </p>
      </div>
    </div>
  )
}
