import { useState } from 'react'
import { signInWithGoogle } from '@/lib/supabase'
import { Zap, Shield, TrendingUp, Search } from 'lucide-react'

const features = [
  { icon: Search, text: 'Scan 100+ quality signals across your entire knowledge base' },
  { icon: TrendingUp, text: 'AI-powered rewrites and grammar fixes (Pro)' },
  { icon: Shield, text: 'Push fixes directly back to Zendesk (Pro)' },
  { icon: Zap, text: 'Real-time severity dashboard with actionable insights' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await signInWithGoogle()
    if (err) {
      setError(err.message)
      setLoading(false)
    }
    // On success, Supabase redirects to /dashboard
  }

  return (
    <div className="min-h-screen flex grid-overlay" style={{ background: 'var(--surface-0)' }}>
      {/* Left: Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-border relative overflow-hidden">
        {/* BG glow */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10 pointer-events-none"
          style={{ background: 'var(--xbox)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #107C10, #0A5A0A)', boxShadow: '0 0 20px rgba(16,124,16,0.5)' }}>
            <span className="font-display font-bold text-white text-lg">A</span>
          </div>
          <span className="font-display font-bold text-xl tracking-widest" style={{ color: 'var(--text-primary)' }}>
            ARTICLE<span style={{ color: 'var(--xbox)' }}>IQ</span>
          </span>
        </div>

        {/* Hero */}
        <div>
          <p className="section-header mb-4">Knowledge Base Intelligence</p>
          <h1 className="font-display font-bold text-5xl leading-tight mb-6" style={{ color: 'var(--text-primary)' }}>
            Your Zendesk<br />articles,<br />
            <span className="text-glow" style={{ color: 'var(--xbox-light)' }}>perfected.</span>
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
            Scan, analyze, and optimize every article in your knowledge base — broken links, outdated content, readability, and AI-powered quality scores.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(16,124,16,0.15)', border: '1px solid rgba(16,124,16,0.3)' }}>
                  <Icon size={13} style={{ color: 'var(--xbox-light)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat bar */}
        <div className="flex items-center gap-8">
          {[['100+', 'Checks run'], ['Free', 'To start'], ['AI', 'Powered']].map(([val, label]) => (
            <div key={label}>
              <div className="font-display font-bold text-2xl" style={{ color: 'var(--xbox-light)' }}>{val}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #107C10, #0A5A0A)', boxShadow: '0 0 12px rgba(16,124,16,0.4)' }}>
              <span className="font-display font-bold text-white text-sm">A</span>
            </div>
            <span className="font-display font-bold text-lg tracking-widest" style={{ color: 'var(--text-primary)' }}>
              ARTICLE<span style={{ color: 'var(--xbox)' }}>IQ</span>
            </span>
          </div>

          <div className="card-glow p-8">
            <p className="section-header mb-1">Access Portal</p>
            <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>Sign in</h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
              Use your Google account to continue to ArticleIQ.
            </p>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-md text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FC8181' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-all duration-200"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-bright)',
                color: 'var(--text-primary)',
              }}
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-xbox border-t-transparent animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
                  <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
                  <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18z"/>
                  <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
                </svg>
              )}
              {loading ? 'Connecting...' : 'Continue with Google'}
            </button>

            <p className="text-center text-xs mt-6" style={{ color: 'var(--text-muted)' }}>
              By signing in, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Free plan · No credit card required
          </p>
        </div>
      </div>
    </div>
  )
}
