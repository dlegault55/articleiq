import { Link } from 'react-router-dom'
import { Scan, CheckCircle, AlertOctagon, AlertTriangle, ArrowRight, Zap, TrendingUp, Shield } from 'lucide-react'

const DEMO_ARTICLES = [
  { title: 'How to reset your password', score: 42, issues: [{ sev: 'critical', label: 'Very low readability (42/100)' }], words: 89, updated: '14 months ago' },
  { title: 'Getting started with the API', score: 71, issues: [{ sev: 'warning', label: 'Not updated in 220 days' }, { sev: 'warning', label: 'Missing labels' }], words: 312, updated: '7 months ago' },
  { title: 'Billing FAQ', score: 28, issues: [{ sev: 'critical', label: 'Very low readability (28/100)' }, { sev: 'critical', label: 'Only 67 words — too short' }], words: 67, updated: '2 years ago' },
  { title: 'Connecting your Slack workspace', score: 88, issues: [], words: 445, updated: '3 weeks ago' },
  { title: 'Troubleshooting login issues', score: 55, issues: [{ sev: 'warning', label: '87% title similarity with "How to reset your password"' }], words: 201, updated: '5 months ago' },
]

const healthColor = (s) => s >= 80 ? '#107C10' : s >= 60 ? '#D97706' : '#DC2626'
const healthBg    = (s) => s >= 80 ? '#EBF5EB' : s >= 60 ? '#FFFBEB' : '#FEF2F2'

function DemoScreenshot() {
  return (
    <div style={{ background: '#F0F5F0', borderRadius: 16, padding: 20, border: '1px solid #D4E8D4', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
      {/* Fake browser bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
        <div style={{ flex: 1, height: 22, background: 'white', borderRadius: 5, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>articleiq.vercel.app/scanner/results</span>
        </div>
      </div>

      {/* Health score hero */}
      <div style={{ background: '#107C10', borderRadius: 14, padding: '18px 20px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          Knowledge Base Health · Last scan 2 hours ago
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 10 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 56, fontWeight: 800, color: 'white', lineHeight: 1, letterSpacing: -2 }}>61</div>
          <div style={{ paddingBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Needs attention</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>↑ +8 vs previous scan</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ padding: '4px 10px', borderRadius: 100, background: '#FF4444', color: 'white', fontSize: 11, fontWeight: 700 }}>12 Critical</div>
          <div style={{ padding: '4px 10px', borderRadius: 100, background: '#FFD93D', color: '#1A1A00', fontSize: 11, fontWeight: 700 }}>49 Warnings</div>
          <div style={{ padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 11, fontWeight: 600 }}>1,169 Clean</div>
        </div>
      </div>

      {/* Article list */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        {/* Filter row */}
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 6 }}>
          {['All (5)', 'Has issues (4)', 'Critical (2)', 'Clean (1)'].map((f, i) => (
            <div key={f} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: i === 0 ? '#107C10' : '#F9FAFB', color: i === 0 ? 'white' : '#6B7280', border: i === 0 ? 'none' : '1px solid #E5E7EB' }}>
              {f}
            </div>
          ))}
        </div>
        {DEMO_ARTICLES.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: i < DEMO_ARTICLES.length - 1 ? '1px solid #F9FAFB' : 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: healthBg(a.score), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: healthColor(a.score), flexShrink: 0, fontFamily: 'monospace' }}>
              {a.score}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {a.issues.map((iss, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                    background: iss.sev === 'critical' ? '#FEF2F2' : '#FFFBEB',
                    color: iss.sev === 'critical' ? '#DC2626' : '#D97706' }}>
                    {iss.sev === 'critical' ? '●' : '●'} {iss.label}
                  </div>
                ))}
                {a.issues.length === 0 && <div style={{ fontSize: 9, color: '#107C10', fontWeight: 700 }}>✓ No issues</div>}
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#9CA3AF', flexShrink: 0, textAlign: 'right' }}>
              <div>{a.words}w</div>
              <div>{a.updated}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif", background: 'white', color: '#0F1F0F', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .land-btn-primary { display:inline-flex; align-items:center; gap:8px; padding:14px 28px; background:#107C10; color:white; border:none; border-radius:10px; font-family:'Instrument Sans',sans-serif; font-size:15px; font-weight:700; cursor:pointer; text-decoration:none; transition:background 0.15s; }
        .land-btn-primary:hover { background:#0A5A0A; color:white; }
        .land-btn-secondary { display:inline-flex; align-items:center; gap:8px; padding:14px 28px; background:white; color:#107C10; border:2px solid #107C10; border-radius:10px; font-family:'Instrument Sans',sans-serif; font-size:15px; font-weight:700; cursor:pointer; text-decoration:none; transition:all 0.15s; }
        .land-btn-secondary:hover { background:#EBF5EB; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB', padding: '0 40px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: '#107C10', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scan size={15} color="white" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>
            Article<span style={{ color: '#107C10' }}>IQ</span>
          </span>
        </div>
        <Link to="/login" className="land-btn-primary" style={{ padding: '8px 20px', fontSize: 14 }}>
          Get started free
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 40px 60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: '#EBF5EB', border: '1px solid #B8D8B8', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#107C10', marginBottom: 20 }}>
            <Zap size={12} /> Free to get started · No credit card required
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 44, lineHeight: 1.1, letterSpacing: -1.5, color: '#0F1F0F', marginBottom: 20 }}>
            Your knowledge base<br />
            <span style={{ color: '#107C10' }}>has problems you<br />don't know about.</span>
          </h1>
          <p style={{ fontSize: 17, color: '#4A5E4A', lineHeight: 1.7, marginBottom: 32, maxWidth: 440 }}>
            ArticleIQ scans every article in your Zendesk knowledge base and flags outdated content, poor readability, duplicates, and broken links — so your customers always get accurate help.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="land-btn-primary">
              Scan my knowledge base <ArrowRight size={16} />
            </Link>
            <span style={{ fontSize: 13, color: '#8A9E8A' }}>Takes 2 minutes to set up</span>
          </div>
        </div>
        <div>
          <DemoScreenshot />
        </div>
      </section>

      {/* Social proof bar */}
      <div style={{ background: '#F0F5F0', borderTop: '1px solid #D4E8D4', borderBottom: '1px solid #D4E8D4', padding: '16px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Scans completed every day', 'Articles analyzed', 'Issues caught automatically'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22, color: '#107C10' }}>
                {['500+', '50k+', '12k+'][i]}
              </span>
              <span style={{ fontSize: 13, color: '#4A5E4A', fontWeight: 500 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Problem → Solution */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 34, letterSpacing: -1, marginBottom: 14 }}>
            Most knowledge bases are a mess.<br />Yours probably is too.
          </h2>
          <p style={{ fontSize: 16, color: '#4A5E4A', maxWidth: 560, margin: '0 auto', lineHeight: 1.7 }}>
            Support teams add articles, forget about them, and customers end up reading content that's years out of date. You wouldn't know — until a customer complains.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {[
            { icon: <AlertOctagon size={22} style={{ color: '#DC2626' }} />, bg: '#FEF2F2', border: '#FECACA', title: 'Outdated articles', desc: 'The average knowledge base has 30% of articles that haven\'t been updated in over a year. Customers are reading stale information.' },
            { icon: <AlertTriangle size={22} style={{ color: '#D97706' }} />, bg: '#FFFBEB', border: '#FDE68A', title: 'Poor readability', desc: 'Technical jargon and long sentences make articles hard to understand. Customers give up and call support instead.' },
            { icon: <Scan size={22} style={{ color: '#2563EB' }} />, bg: '#EFF6FF', border: '#BFDBFE', title: 'Hidden duplicates', desc: 'Multiple articles covering the same topic confuse customers and dilute your search results. You probably have more than you think.' },
          ].map(({ icon, bg, border, title, desc }) => (
            <div key={title} style={{ padding: '24px', background: bg, border: `1px solid ${border}`, borderRadius: 16 }}>
              <div style={{ marginBottom: 14 }}>{icon}</div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#0F1F0F' }}>{title}</p>
              <p style={{ fontSize: 13, color: '#4A5E4A', lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#F0F5F0', borderTop: '1px solid #D4E8D4', borderBottom: '1px solid #D4E8D4', padding: '80px 40px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 34, letterSpacing: -1, marginBottom: 12 }}>Up and running in minutes</h2>
            <p style={{ fontSize: 15, color: '#4A5E4A' }}>No agents to install. No code to write. Just connect and scan.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
            {[
              { step: '01', icon: <Scan size={24} style={{ color: '#107C10' }} />, title: 'Connect Zendesk', desc: 'Add your subdomain and API token. Read-only access — we never touch your articles.' },
              { step: '02', icon: <Zap size={24} style={{ color: '#107C10' }} />, title: 'Run a scan', desc: 'Choose your depth — Fast, Standard, or Full. We analyze every article automatically.' },
              { step: '03', icon: <CheckCircle size={24} style={{ color: '#107C10' }} />, title: 'Fix what matters', desc: 'See your health score, prioritize critical issues, and use AI to fix problems in one click.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{ background: 'white', borderRadius: 16, padding: '28px 24px', border: '1px solid #D4E8D4', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 20, right: 20, fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, color: '#D4E8D4', lineHeight: 1 }}>{step}</div>
                <div style={{ width: 44, height: 44, background: '#EBF5EB', border: '1px solid #B8D8B8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  {icon}
                </div>
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</p>
                <p style={{ fontSize: 13, color: '#4A5E4A', lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '80px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, letterSpacing: -1, marginBottom: 24, lineHeight: 1.2 }}>
              Know the health of every article. Track improvement over time.
            </h2>
            {[
              { icon: <TrendingUp size={18} style={{ color: '#107C10' }} />, title: 'Health score trends', desc: 'See if your knowledge base is improving or declining after each scan.' },
              { icon: <Shield size={18} style={{ color: '#107C10' }} />, title: 'AI-powered fixes', desc: 'Grammar, rewrites, and quality scores powered by Claude — applied in one click.' },
              { icon: <CheckCircle size={18} style={{ color: '#107C10' }} />, title: 'Mark issues resolved', desc: 'Track your progress as your team works through issues scan by scan.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, background: '#EBF5EB', border: '1px solid #B8D8B8', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0F1F0F', marginBottom: 4 }}>{title}</p>
                  <p style={{ fontSize: 13, color: '#4A5E4A', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: '#F0F5F0', borderRadius: 16, padding: 24, border: '1px solid #D4E8D4' }}>
            {/* Mini health score demo */}
            <div style={{ background: '#107C10', borderRadius: 12, padding: '20px 20px 16px', marginBottom: 12 }}>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Health Score · May 2026</p>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 64, fontWeight: 800, color: 'white', lineHeight: 1, letterSpacing: -2, marginBottom: 4 }}>74</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Needs attention · ↑ +6 vs last scan</div>
            </div>
            {[
              { month: 'March', score: 58, color: '#DC2626', bg: '#FEF2F2' },
              { month: 'April', score: 68, color: '#D97706', bg: '#FFFBEB' },
              { month: 'May',   score: 74, color: '#D97706', bg: '#FFFBEB' },
            ].map(({ month, score, color, bg }) => (
              <div key={month} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'white', borderRadius: 8, marginBottom: 6, border: '1px solid #E5E7EB' }}>
                <div style={{ width: 32, height: 32, borderRadius: 7, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color, flexShrink: 0 }}>{score}</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F1F0F' }}>{month} scan</span>
                <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 3, transition: 'width 0.8s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#107C10', padding: '72px 40px', textAlign: 'center' }}>
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 36, color: 'white', letterSpacing: -1, marginBottom: 16, lineHeight: 1.2 }}>
            Find out what's wrong with your knowledge base — free
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginBottom: 32, lineHeight: 1.7 }}>
            Connect your Zendesk account and get your first health score in under 10 minutes.
          </p>
          <Link to="/login" className="land-btn-secondary">
            Start scanning for free <ArrowRight size={16} />
          </Link>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
            No credit card required · Takes 2 minutes to set up
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0A1A0A', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, background: '#107C10', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scan size={12} color="white" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 14, color: 'white', letterSpacing: -0.3 }}>
            Article<span style={{ color: '#4ade80' }}>IQ</span>
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#4A5E4A' }}>© 2026 ArticleIQ. All rights reserved.</p>
        <Link to="/login" style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
      </footer>
    </div>
  )
}
