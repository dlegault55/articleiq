import { signInWithGoogle } from '@/lib/supabase'
import { Scan, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* Left panel — branding */}
      <div style={{ width: '52%', background: '#107C10', padding: '48px 56px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        {/* Background circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -60, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', top: '40%', right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'auto' }}>
          <div style={{ width: 34, height: 34, background: 'rgba(255,255,255,0.2)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scan size={18} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'white', letterSpacing: -0.3 }}>ArticleIQ</span>
        </div>

        {/* Main copy */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: 'auto', paddingTop: 64 }}>
          <h1 style={{ fontWeight: 800, fontSize: 36, color: 'white', lineHeight: 1.15, letterSpacing: -1, marginBottom: 20 }}>
            Your knowledge base health score is waiting.
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: 40, maxWidth: 380 }}>
            Scan every article in your Zendesk® knowledge base for quality issues — in minutes, not months.
          </p>

          {/* Benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              'Readability scores for every article',
              'Duplicate and outdated content detection',
              'AI-powered grammar and rewrite suggestions',
              'Track improvement over time',
            ].map(benefit => (
              <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={13} color="white" />
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mini score demo */}
        <div style={{ position: 'relative', zIndex: 1, marginTop: 48 }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Example health score</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 52, color: 'white', lineHeight: 1, letterSpacing: -2 }}>74</span>
              <div style={{ paddingBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Needs attention</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>↑ +6 vs last scan</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['12 Critical', '#FF4444', 'white'], ['49 Warnings', '#FFD93D', '#1A1A00'], ['1,169 Clean', 'rgba(255,255,255,0.2)', 'white']].map(([label, bg, color]) => (
                <div key={label} style={{ padding: '3px 10px', borderRadius: 100, background: bg, color, fontSize: 11, fontWeight: 700 }}>{label}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — sign in */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 56px', background: '#F0F5F0' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0F1F0F', marginBottom: 6, letterSpacing: -0.5 }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 14, color: '#4A5E4A', marginBottom: 36 }}>
            Sign in to access your dashboard and scan results.
          </p>

          {/* Google button */}
          <button onClick={signInWithGoogle}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '13px 20px', background: 'white', border: '1.5px solid #D4E8D4', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#0F1F0F', fontFamily: 'Plus Jakarta Sans, sans-serif', transition: 'all 0.15s', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#107C10'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,124,16,0.12)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#D4E8D4'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)' }}>
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z"/>
              <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
              <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ margin: '24px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: '#D4E8D4' }} />
            <span style={{ fontSize: 12, color: '#8A9E8A', fontWeight: 500 }}>Free to get started</span>
            <div style={{ flex: 1, height: 1, background: '#D4E8D4' }} />
          </div>

          {/* Trust signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'No credit card required',
              'Read-only access to your Zendesk®',
              'Your data is never shared',
            ].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={14} style={{ color: '#107C10', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#4A5E4A' }}>{t}</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: '#8A9E8A', marginTop: 32, lineHeight: 1.6 }}>
            By signing in you agree to our terms of service and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
