import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Scan, Loader, Mail, Eye, EyeOff, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const { user } = useAuth()
  const [loading,  setLoading]  = useState(null)
  const [error,    setError]    = useState(null)
  const [mode,     setMode]     = useState(null)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [done,     setDone]     = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

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

  return (
    <div style={{ minHeight:'100vh', display:'grid', gridTemplateColumns:'1fr 1fr' }}>

      {/* ── Left — marketing panel ── */}
      <div style={{ background:'var(--navy)', display:'flex', flexDirection:'column', padding:'clamp(32px,5vw,56px)', position:'relative', overflow:'hidden' }}>
        {/* Background decoration */}
        <div style={{ position:'absolute', top:-80, right:-80, width:300, height:300, borderRadius:'50%', background:'rgba(255,255,255,0.03)' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.03)' }} />

        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:48 }}>
          <div style={{ width:32, height:32, background:'rgba(255,255,255,0.15)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={16} color="white" />
          </div>
          <span style={{ fontWeight:800, fontSize:18, color:'white', letterSpacing:-0.5 }}>
            Article<span style={{ color:'#4ade80' }}>IQ</span>
          </span>
        </div>

        {/* Hero */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.4)', marginBottom:12 }}>
            Knowledge Base Scanner
          </p>
          <h1 style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:800, color:'white', lineHeight:1.2, letterSpacing:-0.8, marginBottom:16 }}>
            Your KB is full of issues.<br />
            <span style={{ color:'#4ade80' }}>ArticleIQ finds and fixes them.</span>
          </h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.8, marginBottom:36, maxWidth:400 }}>
            Scan every article for broken links, outdated content, readability issues, and duplicates. Then use AI to fix them — in one click.
          </p>

          {/* Features */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { emoji:'🔗', title:'Broken link detection', desc:'Find every dead link before customers do' },
              { emoji:'🤖', title:'AI-powered rewrites', desc:'Quality & SEO analysis with targeted improvements' },
              { emoji:'📊', title:'Health score tracking', desc:'See your KB improve scan over scan' },
              { emoji:'🚀', title:'Publish direct to your KB', desc:'One click back to Zendesk® or HelpScout — no copy-pasting' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:34, height:34, borderRadius:8, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:16 }}>
                  {emoji}
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:700, color:'white', margin:'0 0 1px' }}>{title}</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', margin:0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', lineHeight:1.6, marginTop:32 }}>
          Zendesk® is a registered trademark of Zendesk, Inc. ArticleIQ is not affiliated with or endorsed by Zendesk, Inc.
        </p>
      </div>

      {/* ── Right — auth form ── */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'clamp(24px,4vw,48px)', background:'var(--bg)' }}>
        <div style={{ width:'100%', maxWidth:360 }}>

          <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:-0.4, marginBottom:6, textAlign:'center' }}>
            {mode === 'signup' ? 'Create your account' : mode === 'signin' ? 'Welcome back' : 'Get started free'}
          </h2>
          <p style={{ fontSize:13, color:'var(--text-3)', textAlign:'center', marginBottom:24 }}>
            {mode === 'signup' ? 'Free forever — no credit card required' : mode === 'signin' ? 'Sign in to your ArticleIQ account' : 'Scan up to 300 articles free, no credit card required'}
          </p>

          {error && (
            <div style={{ padding:'10px 14px', background:'var(--red-light)', border:'1px solid var(--red-border)', borderRadius:8, marginBottom:16 }}>
              <p style={{ fontSize:13, color:'var(--red)', margin:0 }}>{error}</p>
            </div>
          )}

          {done ? (
            <div style={{ padding:'20px', background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:10, textAlign:'center' }}>
              <CheckCircle size={28} style={{ color:'var(--green)', marginBottom:8 }} />
              <p style={{ fontSize:14, fontWeight:700, color:'var(--green)', marginBottom:4 }}>Check your email</p>
              <p style={{ fontSize:13, color:'var(--text-2)', margin:0 }}>We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
            </div>
          ) : !mode ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button onClick={() => setMode('signup')} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14 }}>
                Create free account
              </button>
              <button onClick={() => setMode('signin')} className="btn btn-secondary" style={{ width:'100%', justifyContent:'center', padding:'12px', fontSize:14 }}>
                <Mail size={14} /> Sign in with email
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0' }}>
                {[
                  { emoji:'🔗', text:'Find broken links instantly' },
                  { emoji:'🤖', text:'AI rewrites in seconds' },
                  { emoji:'📊', text:'Full KB health score' },
                ].map(({ emoji, text }) => (
                  <div key={text} style={{ display:'flex', alignItems:'center', gap:4, flex:1 }}>
                    <span style={{ fontSize:12 }}>{emoji}</span>
                    <span style={{ fontSize:10, color:'var(--text-3)', fontWeight:500, lineHeight:1.3 }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmail}>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Email address" className="input" style={{ marginBottom:8 }} />
              <div style={{ position:'relative', marginBottom:8 }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Password" className="input" style={{ paddingRight:40 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex' }}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {mode === 'signup' && (
                <p style={{ fontSize:11, color:'var(--text-3)', margin:'0 0 12px', lineHeight:1.5 }}>
                  Min. 8 characters with at least one uppercase letter and one number.
                </p>
              )}
              <button type="submit" disabled={!!loading} className="btn btn-primary" style={{ width:'100%', justifyContent:'center', marginBottom:10, padding:'12px', fontSize:14 }}>
                {loading === 'email' ? <Loader size={14} style={{ animation:'spin 0.7s linear infinite' }} /> : <Mail size={14} />}
                {loading === 'email' ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
              <button type="button" onClick={() => { setMode(null); setError(null) }}
                style={{ width:'100%', background:'none', border:'none', cursor:'pointer', fontSize:12, color:'var(--text-3)', fontFamily:'inherit' }}>
                ← Back
              </button>
            </form>
          )}

          <div style={{ marginTop:24, paddingTop:16, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'center', gap:16 }}>
            <Link to="/terms"   style={{ fontSize:11, color:'var(--text-3)', textDecoration:'none' }}>Terms</Link>
            <Link to="/privacy" style={{ fontSize:11, color:'var(--text-3)', textDecoration:'none' }}>Privacy</Link>
            <Link to="/contact" style={{ fontSize:11, color:'var(--text-3)', textDecoration:'none' }}>Contact</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
