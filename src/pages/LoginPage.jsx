import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Scan, Loader, Mail, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { user } = useAuth()
  const [loading,  setLoading]  = useState(null)
  const [error,    setError]    = useState(null)
  const [mode,     setMode]     = useState(null) // null | 'signin' | 'signup'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [done,     setDone]     = useState(false) // email confirmation sent

  if (user) return <Navigate to="/dashboard" replace />

  const oAuth = async (provider) => {
    setLoading(provider); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { setError(error.message); setLoading(null) }
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading('email'); setError(null)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
        })
        if (error) throw error
        setDone(true)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  const OAuthBtn = ({ provider, label, logo }) => (
    <button onClick={() => oAuth(provider)} disabled={!!loading}
      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'10px', borderRadius:9, border:'1px solid var(--border-md)', background:'white', cursor:'pointer', fontSize:14, fontWeight:600, color:'var(--text)', fontFamily:'inherit', transition:'background 0.15s', marginBottom:10 }}
      onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background='white'}>
      {loading === provider
        ? <Loader size={16} style={{ animation:'spin 0.7s linear infinite', color:'var(--text-3)' }} />
        : logo}
      {loading === provider ? 'Signing in...' : label}
    </button>
  )

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

        <div className="card" style={{ padding:'28px' }}>
          <h1 style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:6, textAlign:'center', letterSpacing:-0.3 }}>
            Sign in to ArticleIQ
          </h1>
          <p style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', marginBottom:22 }}>
            Scan your Zendesk® knowledge base for quality issues
          </p>

          {error && (
            <div style={{ padding:'10px 14px', background:'var(--red-light)', border:'1px solid var(--red-border)', borderRadius:8, marginBottom:16 }}>
              <p style={{ fontSize:13, color:'var(--red)', margin:0 }}>{error}</p>
            </div>
          )}

          {done ? (
            <div style={{ padding:'16px', background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:9, textAlign:'center' }}>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--green)', marginBottom:4 }}>Check your email</p>
              <p style={{ fontSize:13, color:'var(--text-2)', margin:0 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
            </div>
          ) : (
            <>
              {/* Email/password */}
              {!mode ? (
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setMode('signin')} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>
                    <Mail size={14} /> Sign in with email
                  </button>
                  <button onClick={() => setMode('signup')} className="btn btn-secondary" style={{ flex:1, justifyContent:'center' }}>
                    Create account
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmail}>
                  <div style={{ marginBottom:10 }}>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="Email address" className="input" style={{ marginBottom:8 }} />
                    <div style={{ position:'relative' }}>
                      <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="Password" className="input" style={{ paddingRight:40 }} />
                      <button type="button" onClick={() => setShowPw(v => !v)}
                        style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex' }}>
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={!!loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:10 }}>
                    {loading === 'email' ? <Loader size={14} style={{ animation:'spin 0.7s linear infinite' }} /> : <Mail size={14} />}
                    {loading === 'email' ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
                  </button>
                  <button type="button" onClick={() => { setMode(null); setError(null) }}
                    style={{ width:'100%', background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--text-3)', fontFamily:'inherit' }}>
                    ← Back
                  </button>
                </form>
              )}

              {/* Feature pills */}
              <div style={{ display:'flex', gap:6, marginTop:18, padding:'12px 14px', background:'var(--navy-light)', border:'1px solid var(--navy-border)', borderRadius:9, flexWrap:'wrap' }}>
                {['📅 Outdated content', '📖 Readability scores', '🔍 Duplicates'].map(t => (
                  <div key={t} style={{ flex:1, fontSize:11, fontWeight:500, color:'var(--navy)', textAlign:'center', lineHeight:1.4, minWidth:100 }}>{t}</div>
                ))}
              </div>
            </>
          )}
        </div>

        <p style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', marginTop:20, lineHeight:1.6 }}>
          Zendesk® is a registered trademark of Zendesk, Inc.<br/>
          ArticleIQ is not affiliated with or endorsed by Zendesk, Inc.
        </p>
      </div>
    </div>
  )
}
