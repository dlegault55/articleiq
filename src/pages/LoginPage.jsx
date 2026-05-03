import { useState } from 'react'
import { signInWithGoogle } from '@/lib/supabase'
import {
  AlertOctagon, AlertTriangle, CheckCircle,
  ExternalLink, Zap, TrendingUp, ArrowRight,
  Scan, FileText, Link2, Clock, BarChart3, Wand2, ChevronRight
} from 'lucide-react'

// ─── Mock dashboard data ───────────────────────────────────────
const MOCK_ARTICLES = [
  { title: 'Getting Started with the API', words: 312, updated: '14d ago', score: 82, issues: [{ s: 'warning', t: 'Outdated' }] },
  { title: 'How to Reset Your Password', words: 89, updated: '247d ago', score: 31, issues: [{ s: 'critical', t: 'Too short' }, { s: 'critical', t: 'Outdated' }] },
  { title: 'Billing & Subscription FAQ', words: 654, updated: '3d ago', score: 91, issues: [] },
  { title: 'Troubleshooting Login Issues', words: 201, updated: '180d ago', score: 58, issues: [{ s: 'warning', t: 'Low readability' }, { s: 'info', t: 'No labels' }] },
  { title: 'Webhook Configuration Guide', words: 445, updated: '92d ago', score: 74, issues: [{ s: 'warning', t: 'Outdated' }] },
]

const MOCK_STATS = [
  { label: 'Articles Scanned', value: '247', color: '#107C10' },
  { label: 'Critical Issues', value: '18', color: '#FC8181' },
  { label: 'Warnings', value: '43', color: '#FCD34D' },
  { label: 'Avg. Readability', value: '61', color: '#93C5FD' },
]

const issueMeta = {
  critical: { bg: 'rgba(239,68,68,0.12)', color: '#FC8181', border: 'rgba(239,68,68,0.25)' },
  warning:  { bg: 'rgba(245,158,11,0.12)', color: '#FCD34D', border: 'rgba(245,158,11,0.25)' },
  info:     { bg: 'rgba(59,130,246,0.12)',  color: '#93C5FD', border: 'rgba(59,130,246,0.25)' },
}

const ScoreBar = ({ score }) => {
  const color = score >= 75 ? '#107C10' : score >= 50 ? '#FCD34D' : '#FC8181'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: '#1E2B1E', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color, minWidth: 22, textAlign: 'right' }}>{score}</span>
    </div>
  )
}

const DashboardMockup = () => (
  <div style={{ background: '#0D110D', borderRadius: 12, border: '1px solid #1E2B1E', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(16,124,16,0.2), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(16,124,16,0.07)', maxWidth: 860, width: '100%', margin: '0 auto', fontFamily: 'DM Sans, sans-serif' }}>
    {/* Browser chrome */}
    <div style={{ background: '#080A08', padding: '10px 14px', borderBottom: '1px solid #1E2B1E', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 5 }}>
        {['#FC8181','#FCD34D','#107C10'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.6 }} />)}
      </div>
      <div style={{ flex: 1, background: '#121812', borderRadius: 4, padding: '3px 10px', fontSize: 10, color: '#4D6B4D', fontFamily: 'JetBrains Mono, monospace', marginLeft: 8 }}>
        app.articleiq.io/scanner/results/A8F2C1
      </div>
    </div>
    <div style={{ display: 'flex' }}>
      {/* Sidebar */}
      <div style={{ width: 46, background: '#080A08', borderRight: '1px solid #1E2B1E', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 26, height: 26, background: '#107C10', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <span style={{ color: '#fff', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 12 }}>A</span>
        </div>
        {[BarChart3, Scan, FileText, Zap].map((Icon, i) => (
          <div key={i} style={{ width: 30, height: 30, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 1 ? 'rgba(16,124,16,0.2)' : 'transparent' }}>
            <Icon size={13} color={i === 1 ? '#107C10' : '#4D6B4D'} />
          </div>
        ))}
      </div>
      {/* Content */}
      <div style={{ flex: 1, padding: '16px 18px', minWidth: 0 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', color: '#107C10', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Scan Report</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 17, color: '#E8F5E8' }}>247 articles scanned</span>
            <span style={{ fontSize: 9, padding: '2px 7px', background: 'rgba(16,124,16,0.15)', border: '1px solid rgba(16,124,16,0.3)', borderRadius: 4, color: '#7DC87D', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>COMPLETED</span>
          </div>
        </div>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, marginBottom: 12 }}>
          {MOCK_STATS.map(({ label, value, color }) => (
            <div key={label} style={{ background: '#121812', border: '1px solid #1E2B1E', borderRadius: 5, padding: '7px 8px' }}>
              <div style={{ fontSize: 8, color: '#4D6B4D', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 20, color }}>{value}</div>
            </div>
          ))}
        </div>
        {/* Table */}
        <div style={{ background: '#121812', border: '1px solid #1E2B1E', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '7px 10px', borderBottom: '1px solid #1E2B1E', display: 'flex', gap: 6 }}>
            {['all','critical','warning','info'].map((f,i) => (
              <span key={f} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace', background: i===0 ? 'rgba(16,124,16,0.15)' : 'transparent', color: i===0 ? '#7DC87D' : '#4D6B4D', border: i===0 ? '1px solid rgba(16,124,16,0.3)' : '1px solid transparent' }}>{f}</span>
            ))}
          </div>
          {MOCK_ARTICLES.map((a, i) => (
            <div key={i} style={{ padding: '8px 10px', borderBottom: i < MOCK_ARTICLES.length-1 ? '1px solid #1E2B1E' : 'none', display: 'grid', gridTemplateColumns: '1fr 72px 52px', gap: 8, alignItems: 'center' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#E8F5E8', marginBottom: 3, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 9, color: '#4D6B4D', fontFamily: 'JetBrains Mono, monospace' }}>{a.words}w · {a.updated}</span>
                  {a.issues.map((iss, j) => {
                    const m = issueMeta[iss.s]
                    return (
                      <span key={j} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace', background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>{iss.t}</span>
                    )
                  })}
                </div>
              </div>
              <ScoreBar score={a.score} />
              <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                {[Wand2, ExternalLink].map((Icon, k) => (
                  <div key={k} style={{ width: 20, height: 20, borderRadius: 4, background: '#181F18', border: '1px solid #1E2B1E', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={9} color="#4D6B4D" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)

const FEATURES = [
  { icon: Scan, title: 'Deep article scanning', desc: 'Every article checked against 8+ quality signals automatically, in under two minutes.', points: ['Broken link detection', 'Outdated content flags', 'Word count & readability'] },
  { icon: AlertOctagon, title: 'Severity dashboard', desc: 'Critical, warning, and info issues surfaced instantly so you know exactly what to fix first.', points: ['Prioritised by impact', 'Filter by severity or article', 'Full scan history'] },
  { icon: Wand2, title: 'AI-powered fixes', desc: 'One click to grammar-fix, rewrite, or score any article — then push it straight back to Zendesk.', points: ['Grammar & clarity fix', 'Full article rewrite', 'Quality score with suggestions'], badge: 'Pro' },
]

const CHECKS = [
  { icon: Link2, label: 'Broken links', tier: 'free' },
  { icon: Clock, label: 'Outdated articles', tier: 'free' },
  { icon: FileText, label: 'Word count', tier: 'free' },
  { icon: BarChart3, label: 'Readability score', tier: 'free' },
  { icon: AlertTriangle, label: 'Missing metadata', tier: 'free' },
  { icon: Wand2, label: 'Grammar fix (AI)', tier: 'paid' },
  { icon: Zap, label: 'Full rewrite (AI)', tier: 'paid' },
  { icon: TrendingUp, label: 'Quality score (AI)', tier: 'paid' },
  { icon: ExternalLink, label: 'Push to Zendesk', tier: 'paid' },
]

const PLANS = [
  { name: 'Free', price: '$0', period: 'forever', desc: 'Essential checks for any team getting started.', cta: 'Start for free', features: ['Up to 100 articles per scan', 'Broken link & outdated detection', 'Readability & word count', 'Severity dashboard', '30 days scan history'], highlight: false },
  { name: 'Pro', price: '$49', period: 'per month', desc: 'Unlimited scans + AI-powered fixes for serious teams.', cta: 'Start Pro trial', features: ['Unlimited articles', 'All Free features', 'AI grammar fix', 'AI full article rewrite', 'AI quality score (0–100)', 'Push fixes to Zendesk', 'Unlimited scan history'], highlight: true },
]

const GoogleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 18 18">
    <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
    <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 01-7.18-2.54H1.83v2.07A8 8 0 008.98 17z"/>
    <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 010-3.04V5.41H1.83a8 8 0 000 7.18z"/>
    <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.83 5.4L4.5 7.49a4.77 4.77 0 014.48-3.3z"/>
  </svg>
)

const Spinner = () => (
  <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }} />
)

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await signInWithGoogle()
    if (err) { setError(err.message); setLoading(false) }
  }

  const PrimaryBtn = ({ children, style = {} }) => (
    <button onClick={handleLogin} disabled={loading} style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, letterSpacing: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.15s', ...style }}>
      {loading ? <Spinner /> : <GoogleIcon />}
      {children}
    </button>
  )

  return (
    <div style={{ background: '#080A08', minHeight: '100vh', color: '#E8F5E8', fontFamily: 'DM Sans, sans-serif', overflowX: 'hidden' }}>
      {/* Grid bg */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'linear-gradient(rgba(16,124,16,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(16,124,16,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #1E2B1E', backdropFilter: 'blur(12px)', background: 'rgba(8,10,8,0.88)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 27, height: 27, background: 'linear-gradient(135deg,#107C10,#0A5A0A)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(16,124,16,0.35)' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, color: '#fff', fontSize: 12 }}>A</span>
            </div>
            <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 15, letterSpacing: 3 }}>ARTICLE<span style={{ color: '#107C10' }}>IQ</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <a href="#pricing" style={{ fontSize: 13, color: '#8BA88B', textDecoration: 'none', padding: '6px 12px' }}>Pricing</a>
            <PrimaryBtn style={{ fontSize: 13, padding: '7px 16px', background: '#107C10', color: '#fff', border: '1px solid #15A015', borderRadius: 6 }}>
              {loading ? 'Connecting...' : 'Sign in'}
            </PrimaryBtn>
          </div>
        </div>
      </nav>

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 56px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 700, height: 320, background: 'radial-gradient(ellipse, rgba(16,124,16,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 14px', background: 'rgba(16,124,16,0.1)', border: '1px solid rgba(16,124,16,0.28)', borderRadius: 20, fontSize: 11, color: '#7DC87D', fontFamily: 'JetBrains Mono, monospace', marginBottom: 30, letterSpacing: 0.5 }}>
            <span style={{ width: 6, height: 6, background: '#107C10', borderRadius: '50%', boxShadow: '0 0 5px #107C10', flexShrink: 0 }} />
            Built for Zendesk knowledge base teams
          </div>
          <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 'clamp(38px, 6.5vw, 70px)', lineHeight: 1.04, marginBottom: 22, letterSpacing: -1, maxWidth: 900, margin: '0 auto 22px' }}>
            Your knowledge base,<br />
            <span style={{ color: '#107C10', textShadow: '0 0 50px rgba(16,124,16,0.35)' }}>actually maintained.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#8BA88B', maxWidth: 520, margin: '0 auto 38px', lineHeight: 1.65 }}>
            ArticleIQ scans every article in your Zendesk help center for broken links, stale content, readability problems, and missing metadata — then fixes them with AI.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <PrimaryBtn style={{ fontSize: 16, padding: '13px 30px', background: '#107C10', color: '#fff', border: '1px solid #15A015', borderRadius: 8, boxShadow: '0 0 28px rgba(16,124,16,0.28)' }}>
              {loading ? 'Connecting...' : 'Start free — no card needed'}
            </PrimaryBtn>
            <a href="#pricing" style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 600, fontSize: 14, letterSpacing: 1, padding: '13px 20px', color: '#8BA88B', border: '1px solid #1E2B1E', borderRadius: 8, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              See pricing <ChevronRight size={13} />
            </a>
          </div>
          {error && <p style={{ color: '#FC8181', fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <p style={{ fontSize: 11, color: '#4D6B4D', fontFamily: 'JetBrains Mono, monospace' }}>Free plan · 100 articles · No credit card required</p>
        </section>

        {/* Mockup */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 96px' }}>
          <DashboardMockup />
        </section>

        {/* Stats bar */}
        <section style={{ borderTop: '1px solid #1E2B1E', borderBottom: '1px solid #1E2B1E', padding: '32px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 'clamp(32px, 7vw, 96px)', flexWrap: 'wrap' }}>
            {[['8+','Quality signals per article'],['< 2 min','To scan 100 articles'],['1 click','Fix & push to Zendesk'],['Free','To get started']].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 30, color: '#107C10' }}>{v}</div>
                <div style={{ fontSize: 12, color: '#4D6B4D', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#107C10', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 14 }}>How it works</p>
            <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 4vw, 42px)', lineHeight: 1.1 }}>Three steps to a healthier knowledge base</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { n: '01', title: 'Connect Zendesk', desc: 'Enter your subdomain and API key. ArticleIQ connects securely with read access only — no data ever leaves your Supabase instance.' },
              { n: '02', title: 'Run a scan', desc: 'We pull every article and run 8+ quality checks in parallel. A full knowledge base scans in under two minutes.' },
              { n: '03', title: 'Fix with one click', desc: 'Review issues by severity. On Pro, use AI to grammar-fix, rewrite, or score any article — then push it back to Zendesk instantly.' },
            ].map(({ n, title, desc }) => (
              <div key={n} style={{ background: '#0D110D', border: '1px solid #1E2B1E', borderRadius: 10, padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 14, right: 18, fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 52, color: 'rgba(16,124,16,0.07)', lineHeight: 1, userSelect: 'none' }}>{n}</div>
                <div style={{ width: 30, height: 30, background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.25)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7DC87D' }}>{n}</span>
                </div>
                <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 19, marginBottom: 10, color: '#E8F5E8' }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#8BA88B', lineHeight: 1.65, margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ borderTop: '1px solid #1E2B1E', padding: '96px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#107C10', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 14 }}>Features</p>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 4vw, 42px)', lineHeight: 1.1 }}>Everything your help center needs</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20, marginBottom: 20 }}>
              {FEATURES.map(({ icon: Icon, title, desc, points, badge }) => (
                <div key={title} style={{ background: '#0D110D', border: '1px solid #1E2B1E', borderRadius: 10, padding: '26px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, background: 'rgba(16,124,16,0.12)', border: '1px solid rgba(16,124,16,0.22)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color="#107C10" />
                    </div>
                    <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 17, color: '#E8F5E8', margin: 0 }}>{title}</h3>
                    {badge && <span style={{ fontSize: 8, padding: '2px 5px', background: 'rgba(16,124,16,0.15)', color: '#7DC87D', border: '1px solid rgba(16,124,16,0.28)', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 0.5, flexShrink: 0 }}>{badge}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: '#8BA88B', marginBottom: 16, lineHeight: 1.65 }}>{desc}</p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {points.map(p => (
                      <li key={p} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: '#8BA88B' }}>
                        <CheckCircle size={12} color="#107C10" style={{ flexShrink: 0 }} />{p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {/* Checks grid */}
            <div style={{ background: '#0D110D', border: '1px solid #1E2B1E', borderRadius: 10, padding: '24px' }}>
              <p style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#107C10', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 16 }}>All quality checks</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
                {CHECKS.map(({ icon: Icon, label, tier }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 11px', background: '#121812', borderRadius: 6, border: '1px solid #1E2B1E' }}>
                    <Icon size={12} color={tier === 'paid' ? '#107C10' : '#7DC87D'} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#8BA88B', flex: 1 }}>{label}</span>
                    {tier === 'paid'
                      ? <span style={{ fontSize: 8, padding: '1px 4px', background: 'rgba(16,124,16,0.14)', color: '#7DC87D', border: '1px solid rgba(16,124,16,0.22)', borderRadius: 3, fontFamily: 'JetBrains Mono, monospace' }}>PRO</span>
                      : <CheckCircle size={10} color="#107C10" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ borderTop: '1px solid #1E2B1E', padding: '96px 24px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <p style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#107C10', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 14 }}>Pricing</p>
              <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 4vw, 42px)', lineHeight: 1.1, marginBottom: 12 }}>Simple, honest pricing</h2>
              <p style={{ fontSize: 15, color: '#8BA88B' }}>Start free. Upgrade when you need AI features and unlimited scans.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
              {PLANS.map(({ name, price, period, desc, cta, features, highlight }) => (
                <div key={name} style={{ background: '#0D110D', border: `1px solid ${highlight ? 'rgba(16,124,16,0.45)' : '#1E2B1E'}`, borderRadius: 10, padding: '30px 26px', position: 'relative', boxShadow: highlight ? '0 0 40px rgba(16,124,16,0.1)' : 'none' }}>
                  {highlight && <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: 1, padding: '3px 14px', background: '#107C10', color: '#fff', borderRadius: '0 0 6px 6px', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
                  <div style={{ marginBottom: 22 }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, color: '#7DC87D', letterSpacing: 2, marginBottom: 8 }}>{name.toUpperCase()}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 46, color: '#E8F5E8', lineHeight: 1 }}>{price}</span>
                      <span style={{ fontSize: 13, color: '#4D6B4D' }}>/ {period}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#8BA88B', lineHeight: 1.55, margin: 0 }}>{desc}</p>
                  </div>
                  <PrimaryBtn style={{ width: '100%', padding: '11px', fontSize: 14, borderRadius: 7, marginBottom: 22,
                    background: highlight ? '#107C10' : 'transparent',
                    color: highlight ? '#fff' : '#8BA88B',
                    border: highlight ? '1px solid #15A015' : '1px solid #2A3D2A',
                    boxShadow: highlight ? '0 0 16px rgba(16,124,16,0.2)' : 'none',
                  }}>
                    {loading ? 'Connecting...' : <>{cta} <ArrowRight size={13} /></>}
                  </PrimaryBtn>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: '#8BA88B' }}>
                        <CheckCircle size={12} color="#107C10" style={{ flexShrink: 0, marginTop: 2 }} />{f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section style={{ borderTop: '1px solid #1E2B1E', padding: '96px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg,#107C10,#0A5A0A)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 32px rgba(16,124,16,0.4)' }}>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, color: '#fff', fontSize: 22 }}>A</span>
            </div>
            <h2 style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 'clamp(26px, 4vw, 42px)', lineHeight: 1.1, marginBottom: 16 }}>Your knowledge base deserves better</h2>
            <p style={{ fontSize: 16, color: '#8BA88B', marginBottom: 36, lineHeight: 1.65 }}>Start scanning in two minutes. No credit card, no setup headaches — connect Zendesk and go.</p>
            <PrimaryBtn style={{ fontSize: 16, padding: '14px 34px', background: '#107C10', color: '#fff', border: '1px solid #15A015', borderRadius: 8, boxShadow: '0 0 32px rgba(16,124,16,0.32)' }}>
              {loading ? 'Connecting...' : 'Get started free'}
            </PrimaryBtn>
            <p style={{ fontSize: 11, color: '#4D6B4D', fontFamily: 'JetBrains Mono, monospace', marginTop: 16 }}>Free plan · 100 articles · No credit card required</p>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid #1E2B1E', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: 3 }}>ARTICLE<span style={{ color: '#107C10' }}>IQ</span></span>
          <span style={{ fontSize: 11, color: '#4D6B4D', fontFamily: 'JetBrains Mono, monospace' }}>Built for teams who give a damn about documentation quality.</span>
        </footer>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
