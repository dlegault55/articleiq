import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCheckout } from '@/hooks/useUpgrade'
import { usePageTitle } from '@/hooks/usePageTitle'
import { CheckCircle, Zap, ArrowLeft, Loader, Wand2, Star, Tag, Globe, BarChart2, TrendingUp, Clock, Shield } from 'lucide-react'

const SCAN_PACK_FEATURES = [
  { icon: Wand2,    text: 'AI Improve Article — context-aware rewrite by article type' },
  { icon: Star,     text: 'AI Quality Score — 5 dimensions with specific suggestions' },
  { icon: BarChart2,text: 'SEO Score — grade A–F with high/medium/low impact fixes' },
  { icon: Globe,    text: 'Publish improved articles directly to Zendesk®' },
  { icon: Tag,      text: 'Label suggestions — publish labels with one click' },
  { icon: Zap,      text: 'Unlimited articles per scan (free tier limited to 300)' },
]

const ANNUAL_EXTRAS = [
  { icon: TrendingUp, text: 'KB health trend — full history across all scans' },
  { icon: Clock,      text: 'Scheduled monthly scans — coming soon' },
  { icon: Shield,     text: 'Priority support' },
]

const COMPARE = [
  { feature: 'Articles per scan',           free: '300',        pack: 'Unlimited', annual: 'Unlimited' },
  { feature: 'Scans',                        free: 'Unlimited',  pack: '5 (no expiry)', annual: 'Unlimited' },
  { feature: 'All quality checks',           free: true,         pack: true,        annual: true },
  { feature: 'Broken links & images',        free: true,         pack: true,        annual: true },
  { feature: 'SEO Score',                    free: true,         pack: true,        annual: true },
  { feature: 'Shareable reports',            free: false,        pack: true,        annual: true },
  { feature: 'AI Improve Article',           free: false,        pack: true,        annual: true },
  { feature: 'AI Quality Score',             free: false,        pack: true,        annual: true },
  { feature: 'Publish to Zendesk®',          free: false,        pack: true,        annual: true },
  { feature: 'Label suggestions + publish',  free: false,        pack: true,        annual: true },
  { feature: 'Email notifications',          free: false,        pack: true,        annual: true },
  { feature: 'KB health trend (full)',       free: false,        pack: false,       annual: true },
  { feature: 'Scheduled scans',             free: false,        pack: false,       annual: '🔜 Soon' },
  { feature: 'Priority support',            free: false,        pack: false,       annual: true },
]

function ROICalculator() {
  const [articles,  setArticles]  = useState(500)
  const [tickets,   setTickets]   = useState(200)
  const [kbPct,     setKbPct]     = useState(30)
  const [costPer,   setCostPer]   = useState(15)

  const kbTickets   = Math.round(tickets * (kbPct / 100))
  const deflectable = Math.round(kbTickets * 0.25)
  const savings     = deflectable * costPer
  const cost        = 79
  const net         = savings - cost
  const roi         = cost > 0 ? Math.round((net / cost) * 100) : 0

  const Slider = ({ label, value, min, max, step = 1, onChange, format = v => v }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy)' }}>{format(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--navy)', cursor: 'pointer' }} />
    </div>
  )

  return (
    <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }} className="roi-grid">
        <div style={{ padding: '20px', borderRight: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 16 }}>Your numbers</p>
          <Slider label="Articles in your KB" value={articles} min={50} max={5000} step={50} onChange={setArticles} format={v => v.toLocaleString()} />
          <Slider label="Support tickets per month" value={tickets} min={50} max={5000} step={50} onChange={setTickets} format={v => v.toLocaleString()} />
          <Slider label="Tickets preventable by better KB" value={kbPct} min={5} max={60} step={5} onChange={setKbPct} format={v => `${v}%`} />
          <Slider label="Cost per support ticket" value={costPer} min={5} max={50} step={1} onChange={setCostPer} format={v => `$${v}`} />
          <p style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>Industry avg: 30% preventable · $15 per ticket · 25% deflection with healthy KB</p>
        </div>
        <div style={{ padding: '20px', background: net > 0 ? 'var(--navy)' : 'var(--bg)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: net > 0 ? 'rgba(255,255,255,0.5)' : 'var(--text-3)', marginBottom: 16 }}>Estimated monthly impact</p>
          {[
            { label: 'KB-preventable tickets/mo', value: kbTickets.toLocaleString(), sub: `${kbPct}% of ${tickets.toLocaleString()}` },
            { label: 'Deflectable with good KB', value: deflectable.toLocaleString(), sub: '25% conservative' },
            { label: 'Cost of those tickets', value: `$${(kbTickets * costPer).toLocaleString()}`, sub: `at $${costPer}/ticket` },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: net > 0 ? 'rgba(255,255,255,0.5)' : 'var(--text-3)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: net > 0 ? 'white' : 'var(--text)', letterSpacing: -0.5 }}>{value}</div>
              <div style={{ fontSize: 10, color: net > 0 ? 'rgba(255,255,255,0.35)' : 'var(--text-3)' }}>{sub}</div>
            </div>
          ))}
          <div style={{ height: 1, background: net > 0 ? 'rgba(255,255,255,0.15)' : 'var(--border)', margin: '14px 0' }} />
          <div style={{ fontSize: 11, color: net > 0 ? 'rgba(255,255,255,0.5)' : 'var(--text-3)', marginBottom: 4 }}>
            Savings − Scan Pack ($79 one-time)
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: net > 0 ? '#4ade80' : 'var(--text-3)' }}>
            {net >= 0 ? '+' : ''}${net.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 500 }}>/mo</span>
          </div>
          {net > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.12)', marginTop: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{roi}% ROI on your $79</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UpgradePage() {
  usePageTitle('Upgrade')
  const navigate  = useNavigate()
  const checkout  = useCheckout()
  const [loading, setLoading] = useState(null)

  const buy = async (plan) => {
    setLoading(plan)
    await checkout(plan)
    setLoading(null)
  }

  const Cell = ({ val, highlight }) => (
    <span style={{ display: 'flex', justifyContent: 'center' }}>
      {typeof val === 'boolean'
        ? val
          ? <CheckCircle size={14} style={{ color: highlight ? 'var(--navy)' : 'var(--green)' }} />
          : <span style={{ color: 'var(--border-strong)', fontSize: 16 }}>—</span>
        : <span style={{ fontSize: 11, fontWeight: 600, color: highlight ? 'var(--navy)' : 'var(--text-3)' }}>{val}</span>
      }
    </span>
  )

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 'clamp(16px,4vw,32px)' }}>
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Hero */}
      <div style={{ background: 'var(--navy)', borderRadius: 'var(--radius-xl)', padding: 'clamp(24px,4vw,36px)', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>Upgrade ArticleIQ</p>
        <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, color: 'white', letterSpacing: -1, lineHeight: 1.15, marginBottom: 10 }}>
          Find what's broken. Fix it with AI. Publish directly.
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, maxWidth: 500 }}>
          Free gives you the full picture. A Scan Pack gives you everything you need to act on it.
        </p>
      </div>

      {/* Two plan cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }} className="roi-grid">

        {/* Scan Pack */}
        <div className="card" style={{ padding: 24, border: '2px solid var(--navy)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -12, left: 20, background: 'var(--navy)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 100 }}>Most popular</div>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 6 }}>Scan Pack</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)', letterSpacing: -1.5, lineHeight: 1 }}>$79</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
            5 full scans, never expire. Use them whenever you need — quarterly audit, post-launch review, or before a big support push.
          </p>
          <div style={{ marginBottom: 18 }}>
            {SCAN_PACK_FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icon size={11} style={{ color: 'var(--navy)' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <button onClick={() => buy('pack')} disabled={loading === 'pack'} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8 }}>
            {loading === 'pack' ? <Loader size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Zap size={14} />}
            {loading === 'pack' ? 'Redirecting...' : 'Buy Scan Pack — $79'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>One-time payment · No subscription · Never expires</p>
        </div>

        {/* Annual Pro */}
        <div className="card" style={{ padding: 24, background: 'var(--bg)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-3)', marginBottom: 6 }}>Annual Pro</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)', letterSpacing: -1.5, lineHeight: 1 }}>$490</span>
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>/year</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.6 }}>
            Everything in Scan Pack, unlimited scans, and ongoing KB health monitoring. For teams who want ArticleIQ running in the background.
          </p>
          <div style={{ marginBottom: 18 }}>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', margin: '0 0 2px' }}>Everything in Scan Pack, plus:</p>
            </div>
            {ANNUAL_EXTRAS.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, opacity: text.includes('coming') ? 0.6 : 1 }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icon size={11} style={{ color: 'var(--text-3)' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
          <button onClick={() => buy('annual')} disabled={loading === 'annual'} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginBottom: 8, background: 'var(--green)' }}>
            {loading === 'annual' ? <Loader size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <TrendingUp size={14} />}
            {loading === 'annual' ? 'Redirecting...' : 'Go Annual — $490/year'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>~$41/month · Cancel anytime</p>
        </div>
      </div>

      {/* ROI Calculator */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>What's your knowledge base costing you?</p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>Every broken article, dead link, or outdated guide is a support ticket that didn't need to happen.</p>
        <ROICalculator />
      </div>

      {/* Comparison table */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Feature</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textAlign: 'center' }}>Free</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textAlign: 'center' }}>Pack</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textAlign: 'center' }}>Annual</span>
        </div>
        {COMPARE.map(({ feature, free, pack, annual }, i) => (
          <div key={feature} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 80px', padding: '9px 16px', borderBottom: i < COMPARE.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{feature}</span>
            <Cell val={free} />
            <Cell val={pack} highlight />
            <Cell val={annual} />
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', paddingBottom: 24 }}>
        <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Questions? <a href="/contact" style={{ color: 'var(--navy)' }}>Contact us</a></p>
      </div>
    </div>
  )
}
