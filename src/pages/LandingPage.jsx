import { Link } from 'react-router-dom'
import { Scan, CheckCircle, AlertOctagon, AlertTriangle, ArrowRight, Zap, TrendingUp, Shield, Clock, Users, BarChart3, Star, ChevronRight, Plug } from 'lucide-react'

const FONT = "@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');"

// ─── Demo components ───────────────────────────────────────────
function HealthScoreDemo() {
  return (
    <div style={{ background: '#F0F5F0', borderRadius: 20, padding: 20, border: '1px solid #D4E8D4', boxShadow: '0 32px 80px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
        <div style={{ flex: 1, height: 20, background: 'white', borderRadius: 5, marginLeft: 6, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
          <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'monospace' }}>articleiq.vercel.app/dashboard</span>
        </div>
      </div>
      <div style={{ background: '#107C10', borderRadius: 14, padding: '20px 22px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Knowledge Base Health · Last scan 2 hours ago</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 52, color: 'white', lineHeight: 1, letterSpacing: -2 }}>74</div>
          <div style={{ paddingBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Needs attention</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>↑ +8 pts vs previous scan</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ padding: '4px 10px', borderRadius: 100, background: '#FF4444', color: 'white', fontSize: 10, fontWeight: 700 }}>12 Critical</div>
          <div style={{ padding: '4px 10px', borderRadius: 100, background: '#FFD93D', color: '#1A1A00', fontSize: 10, fontWeight: 700 }}>49 Warnings</div>
          <div style={{ padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 10, fontWeight: 600 }}>1,169 Clean</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[['1,230', 'Articles'], ['6', 'Scans'], ['24', 'Resolved']].map(([v, l]) => (
          <div key={l} style={{ background: 'white', borderRadius: 10, padding: '10px 12px', border: '1px solid #E5E7EB' }}>
            <div style={{ fontWeight: 800, fontSize: 20, color: '#0F1F0F', lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 5 }}>
          {['All (5)', 'Issues (4)', 'Critical (2)', 'Clean (1)'].map((f, i) => (
            <div key={f} style={{ padding: '2px 8px', borderRadius: 100, fontSize: 9, fontWeight: 700, background: i === 0 ? '#107C10' : '#F9FAFB', color: i === 0 ? 'white' : '#6B7280' }}>{f}</div>
          ))}
        </div>
        {[
          { title: 'How to reset your password', score: 42, issues: ['critical'], words: 89, age: '14 mo' },
          { title: 'Getting started with the API', score: 71, issues: ['warning', 'warning'], words: 312, age: '7 mo' },
          { title: 'Billing FAQ', score: 28, issues: ['critical', 'critical'], words: 67, age: '2 yr' },
          { title: 'Connecting your Slack workspace', score: 88, issues: [], words: 445, age: '3 wk' },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderBottom: i < 3 ? '1px solid #F9FAFB' : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
              background: a.score >= 80 ? '#EBF5EB' : a.score >= 60 ? '#FFFBEB' : '#FEF2F2',
              color: a.score >= 80 ? '#107C10' : a.score >= 60 ? '#D97706' : '#DC2626' }}>
              {a.score}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{a.title}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {a.issues.map((sev, j) => (
                  <div key={j} style={{ fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: sev === 'critical' ? '#FEF2F2' : '#FFFBEB', color: sev === 'critical' ? '#DC2626' : '#D97706' }}>
                    {sev}
                  </div>
                ))}
                {a.issues.length === 0 && <div style={{ fontSize: 8, color: '#107C10', fontWeight: 700 }}>✓ clean</div>}
              </div>
            </div>
            <div style={{ fontSize: 9, color: '#9CA3AF', textAlign: 'right', flexShrink: 0 }}>
              <div>{a.words}w</div><div>{a.age}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IssueDetailDemo() {
  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.1)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: 6 }}>
        {['All', 'Has issues (4)', 'Critical (2)', 'Clean (1)', 'Resolved'].map((f, i) => (
          <div key={f} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, background: i === 1 ? '#107C10' : '#F9FAFB', color: i === 1 ? 'white' : '#6B7280', border: i !== 1 ? '1px solid #E5E7EB' : 'none' }}>{f}</div>
        ))}
      </div>
      {[
        { title: 'How to reset your password', score: 42, open: true,
          issues: [
            { sev: 'critical', type: 'low_readability', desc: 'Readability very low (42/100). Most readers will struggle with this article.' },
            { sev: 'warning', type: 'low_word_count', desc: 'Short article (89 words). Consider adding more detail to be genuinely helpful.' },
          ]
        },
        { title: 'Billing FAQ', score: 28, open: false,
          issues: [{ sev: 'critical', type: 'outdated', desc: '' }, { sev: 'critical', type: 'low_readability', desc: '' }]
        },
        { title: 'Getting started with the API', score: 71, open: false,
          issues: [{ sev: 'warning', type: 'missing_labels', desc: '' }]
        },
      ].map((a, i) => (
        <div key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px' }}>
            <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: a.score < 50 ? '#DC2626' : a.score < 70 ? '#D97706' : '#107C10', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>Score: <b style={{ color: a.score < 50 ? '#DC2626' : '#D97706' }}>{a.score}</b></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {a.issues.filter(x => x.sev === 'critical').length > 0 && <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#FEF2F2', color: '#DC2626' }}>{a.issues.filter(x => x.sev === 'critical').length} critical</div>}
              {a.issues.filter(x => x.sev === 'warning').length > 0 && <div style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#FFFBEB', color: '#D97706' }}>{a.issues.filter(x => x.sev === 'warning').length} warning</div>}
            </div>
          </div>
          {a.open && (
            <div style={{ padding: '0 16px 14px 32px', background: '#FAFAFA' }}>
              {a.issues.map((iss, j) => (
                <div key={j} style={{ padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: iss.sev === 'critical' ? '#FEF2F2' : '#FFFBEB', border: `1px solid ${iss.sev === 'critical' ? '#FECACA' : '#FDE68A'}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: iss.sev === 'critical' ? '#DC2626' : '#D97706', marginBottom: 3 }}>{iss.type.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 11, color: '#4A5E4A' }}>{iss.desc}</div>
                </div>
              ))}
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>AI Actions</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['✦ Fix Grammar', '↺ Rewrite', '★ Quality Score'].map(a => (
                    <div key={a} style={{ padding: '4px 10px', borderRadius: 6, background: 'white', border: '1px solid #D4E8D4', fontSize: 10, fontWeight: 600, color: '#107C10', cursor: 'pointer' }}>{a}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function TrendDemo() {
  const months = [
    { m: 'Feb', score: 51, critical: 28, warning: 67 },
    { m: 'Mar', score: 58, critical: 22, warning: 59 },
    { m: 'Apr', score: 68, critical: 14, warning: 44 },
    { m: 'May', score: 74, critical: 12, warning: 49 },
  ]
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '20px', border: '1px solid #E5E7EB', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Health Score Trend</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 32, color: '#D97706' }}>74</span>
          <span style={{ fontSize: 13, color: '#107C10', fontWeight: 700 }}>↑ +23 pts in 3 months</span>
        </div>
      </div>
      {months.map(({ m, score, critical, warning }) => (
        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
            background: score >= 80 ? '#EBF5EB' : score >= 60 ? '#FFFBEB' : '#FEF2F2',
            color: score >= 80 ? '#107C10' : score >= 60 ? '#D97706' : '#DC2626' }}>
            {score}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0F1F0F' }}>{m} 2026</span>
              <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 700 }}>{critical} critical</span>
            </div>
            <div style={{ height: 5, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${score}%`, borderRadius: 3, transition: 'width 0.8s',
                background: score >= 80 ? '#107C10' : score >= 60 ? '#D97706' : '#DC2626' }} />
            </div>
          </div>
        </div>
      ))}
      <div style={{ marginTop: 14, padding: '10px 12px', background: '#EBF5EB', borderRadius: 8, border: '1px solid #B8D8B8' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#107C10', marginBottom: 2 }}>At this rate</div>
        <div style={{ fontSize: 11, color: '#4A5E4A' }}>Your knowledge base will reach <b>80+ (Healthy)</b> by next month if you resolve the 12 critical issues.</div>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", background: 'white', color: '#0F1F0F', minHeight: '100vh' }}>
      <style>{`
        ${FONT}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .land-btn { display:inline-flex; align-items:center; gap:8px; padding:13px 26px; border-radius:10px; font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; font-weight:700; cursor:pointer; border:none; text-decoration:none; transition:all 0.15s; }
        .land-btn-green { background:#107C10; color:white; box-shadow:0 1px 3px rgba(16,124,16,0.3); }
        .land-btn-green:hover { background:#0A5A0A; color:white; box-shadow:0 4px 12px rgba(16,124,16,0.35); }
        .land-btn-outline { background:white; color:#107C10; border:2px solid #107C10; }
        .land-btn-outline:hover { background:#EBF5EB; }
        .land-btn-white { background:white; color:#107C10; box-shadow:0 2px 8px rgba(0,0,0,0.15); }
        .land-btn-white:hover { box-shadow:0 4px 16px rgba(0,0,0,0.2); color:#107C10; }
        .feature-card { background:white; border-radius:16px; padding:28px 24px; border:1px solid #E5E7EB; transition:all 0.2s; }
        .feature-card:hover { border-color:#B8D8B8; box-shadow:0 8px 32px rgba(16,124,16,0.08); transform:translateY(-2px); }
        .stat-num { font-weight:800; font-size:36px; color:#107C10; line-height:1; }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #E5E7EB', padding: '0 48px', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, background: '#107C10', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scan size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>Article<span style={{ color: '#107C10' }}>IQ</span></span>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          {['Features', 'How it works', 'Pricing'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(' ','-')}`} style={{ fontSize: 14, fontWeight: 500, color: '#4A5E4A', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/login" style={{ fontSize: 14, fontWeight: 600, color: '#4A5E4A', textDecoration: 'none' }}>Sign in</Link>
          <Link to="/login" className="land-btn land-btn-green" style={{ padding: '8px 18px', fontSize: 13 }}>Start free →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 1160, margin: '0 auto', padding: '80px 48px 64px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: '#EBF5EB', border: '1px solid #B8D8B8', borderRadius: 100, fontSize: 12, fontWeight: 700, color: '#107C10', marginBottom: 24 }}>
            <Zap size={12} /> Free to start · No credit card required
          </div>
          <h1 style={{ fontWeight: 800, fontSize: 46, lineHeight: 1.1, letterSpacing: -1.5, marginBottom: 20 }}>
            Your knowledge base<br />
            <span style={{ color: '#107C10' }}>has problems you<br />don't know about.</span>
          </h1>
          <p style={{ fontSize: 18, color: '#4A5E4A', lineHeight: 1.7, marginBottom: 16, maxWidth: 460 }}>
            The average Zendesk knowledge base has <strong>30% outdated articles</strong>, poor readability scores, and hidden duplicates confusing customers every day.
          </p>
          <p style={{ fontSize: 16, color: '#4A5E4A', lineHeight: 1.7, marginBottom: 36, maxWidth: 460 }}>
            ArticleIQ scans every article automatically and gives you a health score, prioritized issues, and AI-powered fixes — so your team spends time on the right things.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            <Link to="/login" className="land-btn land-btn-green">
              Scan my knowledge base <ArrowRight size={16} />
            </Link>
            <span style={{ fontSize: 13, color: '#8A9E8A' }}>Takes 2 minutes to set up</span>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {['No credit card required', 'Read-only Zendesk access', 'Results in minutes'].map(t => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4A5E4A' }}>
                <CheckCircle size={14} style={{ color: '#107C10' }} /> {t}
              </div>
            ))}
          </div>
        </div>
        <div><HealthScoreDemo /></div>
      </section>

      {/* ── Stats bar ── */}
      <div style={{ background: '#107C10', padding: '28px 48px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32, textAlign: 'center' }}>
          {[
            ['30%', 'of KB articles are outdated on average'],
            ['47%', 'of customers give up on self-service when articles are unclear'],
            ['6hrs', 'saved per week by teams using ArticleIQ'],
            ['3 min', 'to get your first health score'],
          ].map(([num, label]) => (
            <div key={num}>
              <div style={{ fontWeight: 800, fontSize: 32, color: 'white', marginBottom: 4 }}>{num}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Problem section ── */}
      <section id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 48px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#107C10', background: '#EBF5EB', padding: '4px 14px', borderRadius: 100, border: '1px solid #B8D8B8', marginBottom: 16 }}>The problem</div>
          <h2 style={{ fontWeight: 800, fontSize: 38, letterSpacing: -1, marginBottom: 16, lineHeight: 1.15 }}>
            Your support team is working hard.<br />Your KB is working against them.
          </h2>
          <p style={{ fontSize: 17, color: '#4A5E4A', maxWidth: 600, margin: '0 auto', lineHeight: 1.7 }}>
            Knowledge bases grow fast and decay faster. Without visibility into quality, you're flying blind — and your customers feel it.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
          {[
            { icon: <Clock size={24} style={{ color: '#DC2626' }} />, bg: '#FEF2F2', border: '#FECACA', title: 'Outdated content erodes trust', stat: '180+ days', statLabel: 'since last update on 30% of articles', desc: 'Customers read your article, follow the steps, and nothing works. They call support. Your team spends 20 minutes on a ticket that a fresh article would have solved in 2. Multiply that by thousands of users.' },
            { icon: <BarChart3 size={24} style={{ color: '#D97706' }} />, bg: '#FFFBEB', border: '#FDE68A', title: 'Poor readability drives up ticket volume', stat: '47%', statLabel: 'of users abandon unclear self-service', desc: 'A Flesch-Kincaid score below 50 means most readers will struggle. Technical jargon, passive voice, and long sentences all contribute. Your articles might be accurate — but impossible to act on.' },
            { icon: <Users size={24} style={{ color: '#2563EB' }} />, bg: '#EFF6FF', border: '#BFDBFE', title: 'Duplicates create confusion and noise', desc: 'Three articles about the same topic with slightly different information. Which one is right? Customers don\'t know. Your team doesn\'t know. Duplicates dilute search results and create inconsistent answers.', stat: '2.4x', statLabel: 'more support tickets from teams with duplicates' },
          ].map(({ icon, bg, border, title, stat, statLabel, desc }) => (
            <div key={title} style={{ padding: '28px', background: bg, border: `1px solid ${border}`, borderRadius: 18 }}>
              <div style={{ marginBottom: 16 }}>{icon}</div>
              <div style={{ fontWeight: 800, fontSize: 28, color: '#0F1F0F', marginBottom: 2 }}>{stat}</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14 }}>{statLabel}</div>
              <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 10, color: '#0F1F0F' }}>{title}</p>
              <p style={{ fontSize: 13, color: '#4A5E4A', lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature: Issue detail ── */}
      <section style={{ background: '#F0F5F0', borderTop: '1px solid #D4E8D4', borderBottom: '1px solid #D4E8D4', padding: '96px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#107C10', background: '#EBF5EB', padding: '4px 14px', borderRadius: 100, border: '1px solid #B8D8B8', marginBottom: 20 }}>Issue detection</div>
            <h2 style={{ fontWeight: 800, fontSize: 34, letterSpacing: -1, marginBottom: 16, lineHeight: 1.2 }}>
              Every issue, explained clearly. Prioritized by impact.
            </h2>
            <p style={{ fontSize: 16, color: '#4A5E4A', lineHeight: 1.7, marginBottom: 24 }}>
              ArticleIQ doesn't just flag problems — it tells you exactly what's wrong and why it matters. Critical issues that are costing you support tickets rise to the top.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
              {[
                { color: '#DC2626', bg: '#FEF2F2', label: 'Critical', desc: 'Needs immediate attention — directly impacting customers right now' },
                { color: '#D97706', bg: '#FFFBEB', label: 'Warning', desc: 'Should be reviewed — degrading the customer experience' },
                { color: '#2563EB', bg: '#EFF6FF', label: 'Info', desc: 'Nice to fix — small improvements that add up over time' },
              ].map(({ color, bg, label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: bg, color, flexShrink: 0, marginTop: 2 }}>{label}</div>
                  <p style={{ fontSize: 13, color: '#4A5E4A', lineHeight: 1.6 }}>{desc}</p>
                </div>
              ))}
            </div>
            <Link to="/login" className="land-btn land-btn-green">See your issues <ArrowRight size={15} /></Link>
          </div>
          <div><IssueDetailDemo /></div>
        </div>
      </section>

      {/* ── Feature: AI fixes ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div style={{ background: 'white', borderRadius: 18, border: '1px solid #E5E7EB', padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
            <div style={{ padding: '14px 16px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>low_readability · Critical</div>
              <div style={{ fontSize: 13, color: '#4A5E4A' }}>Readability very low (28/100). Most readers will struggle with this article.</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <div style={{ padding: '6px 12px', borderRadius: 7, background: '#EBF5EB', border: '1px solid #B8D8B8', fontSize: 12, fontWeight: 700, color: '#107C10', cursor: 'pointer' }}>✦ Fix Grammar</div>
              <div style={{ padding: '6px 12px', borderRadius: 7, background: '#107C10', border: 'none', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer' }}>↺ Rewrite</div>
              <div style={{ padding: '6px 12px', borderRadius: 7, background: '#EBF5EB', border: '1px solid #B8D8B8', fontSize: 12, fontWeight: 700, color: '#107C10', cursor: 'pointer' }}>★ Quality Score</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: 6 }}>Before</div>
                <div style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6, padding: '10px 12px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                  In order to facilitate the process of password resetting, users must navigate to the authentication module and initiate the credential recovery workflow...
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#107C10', marginBottom: 6 }}>After (AI rewrite)</div>
                <div style={{ fontSize: 12, color: '#0F1F0F', lineHeight: 1.6, padding: '10px 12px', background: '#EBF5EB', borderRadius: 8, border: '1px solid #B8D8B8' }}>
                  To reset your password: click "Forgot password" on the login page, enter your email, and follow the link we send you. Takes about 2 minutes.
                </div>
              </div>
            </div>
          </div>
          <div>
            <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#107C10', background: '#EBF5EB', padding: '4px 14px', borderRadius: 100, border: '1px solid #B8D8B8', marginBottom: 20 }}>AI-powered fixes</div>
            <h2 style={{ fontWeight: 800, fontSize: 34, letterSpacing: -1, marginBottom: 16, lineHeight: 1.2 }}>
              Don't just find problems. Fix them — in one click.
            </h2>
            <p style={{ fontSize: 16, color: '#4A5E4A', lineHeight: 1.7, marginBottom: 24 }}>
              ArticleIQ Pro uses Claude AI to rewrite unclear articles, fix grammar and spelling, and score content quality — right inside the results page. No context switching, no copy-pasting.
            </p>
            {[
              { title: 'Grammar & spelling fix', desc: 'Catch errors your team missed. See exactly what changed before you copy it.' },
              { title: 'Full article rewrite', desc: 'Transform technical jargon into clear, helpful language customers can actually follow.' },
              { title: 'Quality score breakdown', desc: 'Get scored on clarity, completeness, structure, and tone with specific suggestions.' },
            ].map(({ title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#EBF5EB', border: '1px solid #B8D8B8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <CheckCircle size={12} style={{ color: '#107C10' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{title}</p>
                  <p style={{ fontSize: 13, color: '#4A5E4A', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature: Trends ── */}
      <section style={{ background: '#F0F5F0', borderTop: '1px solid #D4E8D4', borderBottom: '1px solid #D4E8D4', padding: '96px 48px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#107C10', background: '#EBF5EB', padding: '4px 14px', borderRadius: 100, border: '1px solid #B8D8B8', marginBottom: 20 }}>Progress tracking</div>
            <h2 style={{ fontWeight: 800, fontSize: 34, letterSpacing: -1, marginBottom: 16, lineHeight: 1.2 }}>
              Prove the work your team is doing.
            </h2>
            <p style={{ fontSize: 16, color: '#4A5E4A', lineHeight: 1.7, marginBottom: 24 }}>
              Every scan adds a data point. Watch your health score climb as your team resolves issues. Share progress with stakeholders who care about customer experience.
            </p>
            {[
              { icon: <TrendingUp size={18} style={{ color: '#107C10' }} />, title: 'Health score over time', desc: 'See at a glance whether your knowledge base is improving or declining after each scan.' },
              { icon: <CheckCircle size={18} style={{ color: '#107C10' }} />, title: 'Resolve and track', desc: 'Mark individual issues as resolved. They move to a Resolved tab so nothing falls through the cracks.' },
              { icon: <Star size={18} style={{ color: '#107C10' }} />, title: 'Shareable reports', desc: 'One click generates a public report link. Share with your manager or team without making them log in.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, background: '#EBF5EB', border: '1px solid #B8D8B8', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{title}</p>
                  <p style={{ fontSize: 13, color: '#4A5E4A', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div><TrendDemo /></div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ maxWidth: 1000, margin: '0 auto', padding: '96px 48px' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontWeight: 800, fontSize: 36, letterSpacing: -1, marginBottom: 14 }}>Up and running in under 10 minutes</h2>
          <p style={{ fontSize: 16, color: '#4A5E4A' }}>No agents. No code. No IT ticket required.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
          {[
            { step: '01', icon: <Plug size={22} style={{ color: '#107C10' }} />, title: 'Connect Zendesk', time: '2 minutes', desc: 'Add your Zendesk subdomain and API token. Read-only access — we never modify a single article without your say-so.' },
            { step: '02', icon: <Scan size={22} style={{ color: '#107C10' }} />, title: 'Choose and run a scan', time: '10–30 minutes', desc: 'Pick Fast, Standard, or Full depth. We analyze every article and score it for readability, freshness, duplicates, and more.' },
            { step: '03', icon: <CheckCircle size={22} style={{ color: '#107C10' }} />, title: 'Fix what matters', time: 'Ongoing', desc: 'Your health score tells you where to start. Filter by severity, use AI to fix issues, and track progress scan over scan.' },
          ].map(({ step, icon, title, time, desc }) => (
            <div key={step} className="feature-card" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 20, right: 20, fontWeight: 800, fontSize: 36, color: '#F0F5F0', lineHeight: 1 }}>{step}</div>
              <div style={{ width: 46, height: 46, background: '#EBF5EB', border: '1px solid #B8D8B8', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                {icon}
              </div>
              <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '2px 10px', background: '#EBF5EB', color: '#107C10', borderRadius: 100, border: '1px solid #B8D8B8', marginBottom: 10 }}>{time}</div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</p>
              <p style={{ fontSize: 13, color: '#4A5E4A', lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing teaser ── */}
      <section id="pricing" style={{ background: '#F0F5F0', borderTop: '1px solid #D4E8D4', padding: '80px 48px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {[
            { name: 'Free', price: '$0', desc: 'Perfect for getting started and understanding your knowledge base health.', features: ['Unlimited scans', 'All quality checks', 'Duplicate detection', 'Readability scores', 'Excel export', 'Shareable reports'], cta: 'Get started free', style: 'outline' },
            { name: 'Pro', price: '$49', period: '/mo', desc: 'For teams serious about knowledge base quality and continuous improvement.', features: ['Everything in Free', 'AI grammar fix', 'AI article rewrite', 'AI quality scoring', 'Priority support', 'Coming soon: push to Zendesk'], cta: 'Start Pro trial', style: 'green', badge: 'Most popular' },
          ].map(({ name, price, period, desc, features, cta, style, badge }) => (
            <div key={name} style={{ background: 'white', borderRadius: 18, padding: '28px 28px', border: style === 'green' ? '2px solid #107C10' : '1px solid #E5E7EB', position: 'relative', boxShadow: style === 'green' ? '0 8px 32px rgba(16,124,16,0.1)' : 'none' }}>
              {badge && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#107C10', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 100 }}>{badge}</div>}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4A5E4A', marginBottom: 4 }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 36, color: '#0F1F0F' }}>{price}</span>
                  {period && <span style={{ fontSize: 14, color: '#9CA3AF' }}>{period}</span>}
                </div>
                <p style={{ fontSize: 13, color: '#4A5E4A', marginTop: 8, lineHeight: 1.6 }}>{desc}</p>
              </div>
              <div style={{ marginBottom: 24 }}>
                {features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CheckCircle size={14} style={{ color: '#107C10', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: '#0F1F0F' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/login" className={`land-btn ${style === 'green' ? 'land-btn-green' : 'land-btn-outline'}`} style={{ width: '100%', justifyContent: 'center' }}>
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ background: '#107C10', padding: '80px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, left: '20%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -100, right: '15%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontWeight: 800, fontSize: 38, color: 'white', letterSpacing: -1, marginBottom: 16, lineHeight: 1.2 }}>
            Find out what's wrong with your knowledge base — free, today.
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 36, lineHeight: 1.7 }}>
            Join teams who've already scanned over 50,000 articles and found issues they never knew existed. Your first health score in under 10 minutes.
          </p>
          <Link to="/login" className="land-btn land-btn-white">
            Start scanning for free <ArrowRight size={16} />
          </Link>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
            No credit card · Read-only Zendesk access · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#0A1A0A', padding: '28px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: '#107C10', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scan size={13} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color: 'white' }}>Article<span style={{ color: '#4ade80' }}>IQ</span></span>
        </div>
        <p style={{ fontSize: 12, color: '#4A5E4A' }}>© 2026 ArticleIQ. Built for knowledge base teams.</p>
        <Link to="/login" style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, textDecoration: 'none' }}>Sign in →</Link>
      </footer>
    </div>
  )
}
