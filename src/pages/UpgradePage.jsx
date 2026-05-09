import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCheckout } from '@/hooks/useUpgrade'
import { usePageTitle } from '@/hooks/usePageTitle'
import { CheckCircle, Zap, ArrowLeft, Loader, Star, BookOpen, Tag, Wand2 } from 'lucide-react'

const FEATURES = [
  { icon: Wand2,     title: 'AI Improve Article',     desc: 'Fix grammar, spelling, and rewrite for clarity in one click. Review in the editor, then publish directly to Zendesk®.' },
  { icon: Star,      title: 'AI Quality Score',        desc: 'Rate every article on clarity, completeness, structure, and tone. Get specific improvement suggestions.' },
  { icon: Tag,       title: 'AI Label Suggestions',    desc: 'Suggest relevant tags based on article content. Publish labels directly to Zendesk® with one click.' },
  { icon: BookOpen,  title: 'Unlimited articles',      desc: 'Free tier is limited to 300 articles per scan. Pro removes the limit entirely — scan your full KB every time.' },
  { icon: Zap,       title: 'Email notifications',     desc: 'Get a detailed health report emailed to you when a scan completes — critical count, warnings, and a link to the results.' },
]

const COMPARE = [
  { feature: 'Articles per scan',          free: '300',       pro: 'Unlimited' },
  { feature: 'All quality checks',         free: true,        pro: true },
  { feature: 'Readability scoring',        free: true,        pro: true },
  { feature: 'Duplicate detection',        free: true,        pro: true },
  { feature: 'Excel export',              free: true,        pro: true },
  { feature: 'Shareable reports',         free: true,        pro: true },
  { feature: 'AI Improve Article',         free: false,       pro: true },
  { feature: 'AI Quality Score',           free: false,       pro: true },
  { feature: 'AI Label Suggestions',       free: false,       pro: true },
  { feature: 'Publish to Zendesk®',        free: false,       pro: true },
  { feature: 'Email notifications',        free: false,       pro: true },
]


function ROICalculator() {
  const [articles,  setArticles]  = useState(500)
  const [tickets,   setTickets]   = useState(200)
  const [kbPct,     setKbPct]     = useState(30)
  const [costPer,   setCostPer]   = useState(15)

  const kbTickets   = Math.round(tickets * (kbPct / 100))
  const deflectable = Math.round(kbTickets * 0.25) // conservative 25% deflectable with good KB
  const savings     = deflectable * costPer
  const cost        = 99
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
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{format(min)}</span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{format(max)}</span>
      </div>
    </div>
  )

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className='roi-grid' style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>

        {/* Inputs */}
        <div style={{ padding: '20px', borderRight: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 16 }}>Your numbers</p>
          <Slider label="Articles in your KB" value={articles} min={50} max={5000} step={50}
            onChange={setArticles} format={v => v.toLocaleString()} />
          <Slider label="Support tickets per month" value={tickets} min={50} max={5000} step={50}
            onChange={setTickets} format={v => v.toLocaleString()} />
          <Slider label="Tickets caused by bad KB content" value={kbPct} min={5} max={60} step={5}
            onChange={setKbPct} format={v => `${v}%`} />
          <Slider label="Cost per support ticket" value={costPer} min={5} max={50} step={1}
            onChange={setCostPer} format={v => `$${v}`} />
          <p style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>
            Industry average: 30% of tickets are KB-related · $15 avg ticket cost · 25% deflection rate with a healthy KB
          </p>
        </div>

        {/* Results */}
        <div style={{ padding: '20px', background: net > 0 ? 'var(--navy)' : 'var(--bg)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: net > 0 ? 'rgba(255,255,255,0.5)' : 'var(--text-3)', marginBottom: 16 }}>
            Estimated monthly impact
          </p>

          {/* Key metrics */}
          {[
            { label: 'KB-related tickets/mo', value: kbTickets.toLocaleString(), sub: `${kbPct}% of ${tickets.toLocaleString()} total` },
            { label: 'Deflectable with good KB', value: deflectable.toLocaleString(), sub: '25% conservative estimate' },
            { label: 'Cost of those tickets', value: `$${(kbTickets * costPer).toLocaleString()}`, sub: `at $${costPer} per ticket` },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: net > 0 ? 'rgba(255,255,255,0.5)' : 'var(--text-3)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: net > 0 ? 'white' : 'var(--text)', letterSpacing: -0.5 }}>{value}</div>
              <div style={{ fontSize: 10, color: net > 0 ? 'rgba(255,255,255,0.35)' : 'var(--text-3)' }}>{sub}</div>
            </div>
          ))}

          <div style={{ height: 1, background: net > 0 ? 'rgba(255,255,255,0.15)' : 'var(--border)', margin: '14px 0' }} />

          {/* Net savings */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: net > 0 ? 'rgba(255,255,255,0.5)' : 'var(--text-3)', marginBottom: 4 }}>
              Ticket savings − ArticleIQ Pro ($99/mo)
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1, color: net > 0 ? '#4ade80' : 'var(--text-3)' }}>
              {net >= 0 ? '+' : ''}${net.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 500 }}>/mo</span>
            </div>
          </div>

          {net > 0 && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 100, background: 'rgba(255,255,255,0.12)', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{roi}% ROI</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>on your $99 investment</span>
            </div>
          )}

          <p style={{ fontSize: 10, color: net > 0 ? 'rgba(255,255,255,0.3)' : 'var(--text-3)', lineHeight: 1.6, margin: 0 }}>
            Conservative estimate based on 25% deflection rate. Real impact varies by KB quality and customer self-service behaviour.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function UpgradePage() {
  usePageTitle('Upgrade to Pro')
  const navigate  = useNavigate()
  const checkout  = useCheckout()
  const [plan,    setPlan]    = useState('yearly')
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    setLoading(true)
    await checkout(plan)
    setLoading(false)
  }

  const monthly = 99
  const yearly  = 790
  const saving  = (monthly * 12) - yearly

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(16px,4vw,32px)' }}>

      {/* Back */}
      <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Hero */}
      <div style={{ background: 'var(--navy)', borderRadius: 'var(--radius-xl)', padding: 'clamp(24px,4vw,36px)', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>ArticleIQ Pro</p>
        <h1 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800, color: 'white', letterSpacing: -1, lineHeight: 1.15, marginBottom: 12 }}>
          Fix your knowledge base,<br/>not just find what's wrong
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, maxWidth: 520 }}>
          Free gives you the full picture. Pro gives you the tools to act on it — AI-powered fixes, unlimited scanning, and direct publishing to Zendesk®.
        </p>
      </div>

      {/* Plan toggle + CTA */}
      <div className="card" style={{ padding: 'clamp(20px,4vw,28px)', marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Choose your plan</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { key: 'monthly', label: 'Monthly', price: `$${monthly}`, period: '/month', sub: 'Billed monthly', badge: null },
            { key: 'yearly',  label: 'Annual',  price: `$${yearly}`, period: '/year', sub: `Save $${saving} — 2 months free`, badge: 'Best value' },
          ].map(({ key, label, price, period, sub, badge }) => (
            <button key={key} onClick={() => setPlan(key)}
              style={{ padding: '16px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', border: 'none', transition: 'all 0.15s', position: 'relative',
                background: plan === key ? 'var(--navy-light)' : 'white',
                outline: `2px solid ${plan === key ? 'var(--navy)' : 'var(--border-md)'}`,
              }}>
              {badge && (
                <span style={{ position: 'absolute', top: -10, right: 10, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#107C10', color: 'white' }}>
                  {badge}
                </span>
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color: plan === key ? 'var(--navy)' : 'var(--text-3)', marginBottom: 4 }}>{label}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 3 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: plan === key ? 'var(--navy)' : 'var(--text)', letterSpacing: -1 }}>{price}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{period}</span>
              </div>
              <div style={{ fontSize: 11, color: plan === key ? 'var(--navy)' : 'var(--text-3)', fontWeight: plan === key ? 600 : 400 }}>{sub}</div>
            </button>
          ))}
        </div>

        <button onClick={handleUpgrade} disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15 }}>
          {loading ? <Loader size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Zap size={16} />}
          {loading ? 'Redirecting to checkout...' : `Upgrade to Pro — ${plan === 'yearly' ? `$${yearly}/year` : `$${monthly}/month`}`}
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', marginTop: 10 }}>
          Cancel anytime · Billed immediately after trial
        </p>
      </div>

      {/* What you get */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>What's included in Pro</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card" style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} style={{ color: 'var(--navy)' }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* ROI Calculator */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>What's your knowledge base costing you?</p>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>
          Every broken article, dead link, or hard-to-read guide generates a support ticket that costs real money. Adjust the sliders to estimate your savings.
        </p>
        <ROICalculator />
      </div>

      {/* Comparison table */}
      <div className="card" style={{ overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Feature</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textAlign: 'center' }}>Free</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--navy)', textAlign: 'center' }}>Pro</span>
        </div>
        {COMPARE.map(({ feature, free, pro }, i) => (
          <div key={feature} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '10px 16px', borderBottom: i < COMPARE.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{feature}</span>
            <span style={{ textAlign: 'center' }}>
              {typeof free === 'boolean'
                ? free ? <CheckCircle size={14} style={{ color: 'var(--green)' }} /> : <span style={{ color: 'var(--border-strong)', fontSize: 16, lineHeight: 1 }}>—</span>
                : <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>{free}</span>
              }
            </span>
            <span style={{ textAlign: 'center' }}>
              {typeof pro === 'boolean'
                ? pro ? <CheckCircle size={14} style={{ color: 'var(--navy)' }} /> : <span style={{ color: 'var(--border-strong)', fontSize: 16 }}>—</span>
                : <span style={{ fontSize: 12, color: 'var(--navy)', fontWeight: 600 }}>{pro}</span>
              }
            </span>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
        <button onClick={handleUpgrade} disabled={loading} className="btn btn-primary" style={{ padding: '11px 32px', fontSize: 14 }}>
          {loading ? <Loader size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Zap size={14} />}
          {loading ? 'Redirecting...' : 'Get started with Pro'}
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 10 }}>Questions? <a href="/contact" style={{ color: 'var(--navy)' }}>Contact us</a></p>
      </div>

    </div>
  )
}
