import { usePageTitle } from '@/hooks/usePageTitle'
import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Zap, Scan, BookOpen, Link2, Copy, Tag, Clock, Type, Shield, ExternalLink } from 'lucide-react'

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 40 }}>
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 3, letterSpacing: -0.3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>{title}</h2>
    </div>
    <div className="card" style={{ overflow: 'hidden' }}>{children}</div>
  </div>
)

const FAQ = ({ q, a }) => {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{q}</span>
        {open ? <ChevronUp size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} /> : <ChevronDown size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
      </button>
      {open && (
        <div style={{ paddingBottom: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>{a}</div>
      )}
    </div>
  )
}

const Check = ({ icon: Icon, title, desc, severity }) => {
  const colors = {
    critical: { bg: 'var(--red-light)',   border: 'var(--red-border)',   color: 'var(--red)'   },
    warning:  { bg: 'var(--amber-light)', border: 'var(--amber-border)', color: 'var(--amber)' },
    info:     { bg: 'var(--blue-light)',  border: 'var(--blue-border)',  color: 'var(--blue)'  },
  }
  const c = colors[severity] || colors.info
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, marginBottom: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'white', border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} style={{ color: c.color }} />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{title}</p>
        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
      </div>
    </div>
  )
}

export default function HelpPage() {
  usePageTitle('Help & docs')
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(16px,4vw,28px) clamp(16px,4vw,24px)' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: -0.3 }}>Help & Documentation</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Everything you need to get the most out of ArticleIQ</p>
      </div>

      {/* AI Disclaimer */}
      <div style={{ borderRadius: 12, background: 'var(--amber-light)', border: '1.5px solid var(--amber-border)', padding: '18px 20px', marginBottom: 40 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Shield size={18} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>AI features can make mistakes — always review before publishing</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 8 }}>
              ArticleIQ uses Claude AI to help fix grammar, rewrite articles, and score quality. While Claude is highly capable, AI can introduce errors, change technical meaning, miss context, or produce output that doesn't match your brand voice.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>You are responsible for any content published to your knowledge base.</strong> ArticleIQ provides AI suggestions as a starting point — not a finished product. Always read the full rewrite before publishing, and verify that technical instructions, product names, steps, and links are correct.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
              ArticleIQ and its operators accept no liability for inaccurate, incomplete, or misleading content published to your knowledge base as a result of using AI features.
            </p>
          </div>
        </div>
      </div>

      {/* Getting started */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: -0.3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>Getting started</h2>
        <div className="card" style={{ overflow: 'hidden' }}>
          {[
            { num: '01', title: 'Connect Zendesk®', desc: "Go to Connectors in the account menu. Enter your Zendesk® subdomain, admin email, and API token. ArticleIQ uses read-only access — we never modify your articles." },
            { num: '02', title: 'Find your API token', desc: "In Zendesk®: Admin Center → Apps & Integrations → APIs → Zendesk® API → API Tokens. Create a new token and copy it." },
            { num: '03', title: 'Run your first scan', desc: "From the Dashboard, select which checks to run and click Start scan. Keep the tab open — the scan runs in your browser." },
            { num: '04', title: 'Review your results', desc: "Your health score appears as soon as the scan completes. Click any article to expand its issues. Use the filter tabs to focus on Critical issues first." },
          ].map(({ num, title, desc }, i, arr) => (
            <div key={num} style={{ display: 'flex', gap: 14, padding: '16px 18px', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: 'var(--navy)' }}>{num}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scan checks */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: -0.3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>What each check looks for</h2>
        <Check icon={Clock}     severity="warning"  title="Outdated articles"  desc="Articles not updated in 180+ days. Flagged as a warning — not automatically wrong, but worth reviewing." />
        <Check icon={Type}      severity="warning"  title="Thin content"       desc="Articles under 150 words are flagged as warnings. Short articles may not have enough detail to help customers — but some are intentionally brief (redirects, notices, out of office messages). Use your judgment." />
        <Check icon={BookOpen}  severity="warning"  title="Readability score"  desc="Uses the Flesch-Kincaid formula (0–100). Scored as a warning when below 50 — indicates the writing may be hard to follow, but doesn't mean the content is wrong or incomplete. Use Improve Article to simplify language. Note: readability is a surface-level signal — use AI Quality Score and SEO Score for deeper analysis." />
        <Check icon={Tag}       severity="warning"  title="Missing labels"     desc="Articles with no tags assigned. Makes them harder to find and manage. Use Suggest Labels to get AI-powered tag ideas." />
        <Check icon={Copy}      severity="warning"  title="Duplicate detection" desc="Compares article titles using similarity scoring (85%+ match). Good for catching near-duplicate titles — does not compare article body content." />
        <Check icon={Link2}     severity="critical" title="Broken links"       desc="Checks hyperlinks and images inside articles. Dead links and broken images are flagged as critical — a customer clicking a broken link gets nothing. Enabled by default. Can slow down scans on very large knowledge bases." />
      </div>

      {/* AI features */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: -0.3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>AI features (Pro)</h2>
        <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
          {[
            { title: 'Improve Article', desc: 'Fixes grammar, spelling, and punctuation while rewriting for clarity in a single pass. Images, links, and tables are preserved.' },
            { title: 'Quality Score',   desc: 'Scores the article 0–100 on clarity, completeness, structure, and tone with specific improvement suggestions.' },
            { title: 'Label Suggestions', desc: 'Suggests 3–5 relevant tags based on article content. Available to all users.' },
          ].map(({ title, desc }, i, arr) => (
            <div key={title} style={{ padding: '14px 18px', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--amber-light)', border: '1px solid var(--amber-border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--amber)' }}>Important:</strong> Always review the full AI output before using it. Pay attention to technical steps, product names, and version numbers. ArticleIQ is not responsible for content published using AI features.
          </p>
        </div>
      </div>

      {/* Health score */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: -0.3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>How the health score is calculated</h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 12 }}>The health score (0–100) is weighted by severity:</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Critical issue', weight: '×3 penalty', color: 'var(--red)',   bg: 'var(--red-light)',   border: 'var(--red-border)'   },
            { label: 'Warning',        weight: '×1 penalty', color: 'var(--amber)', bg: 'var(--amber-light)', border: 'var(--amber-border)' },
            { label: 'Info',           weight: '×0.2 penalty', color: 'var(--blue)', bg: 'var(--blue-light)',  border: 'var(--blue-border)'  },
          ].map(({ label, weight, color, bg, border }) => (
            <div key={label} style={{ padding: '12px', borderRadius: 8, background: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color, margin: '0 0 4px' }}>{label}</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>{weight}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
          <strong>80+</strong> is Healthy. <strong>60–79</strong> needs attention. Below 60 is critical.
        </p>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: -0.3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>Frequently asked questions</h2>
        <FAQ q="Does ArticleIQ modify my Zendesk® articles automatically?"
          a="No. ArticleIQ is fully read-only. We never write to Zendesk® unless you explicitly copy an AI-improved article and paste it yourself." />
        <FAQ q="Why does the scan need the tab to stay open?"
          a="Scans run in your browser rather than on a server. Keep the tab active while scanning — you'll get an email when it's done." />
        <FAQ q="What's the difference between Readability, Quality Score, and SEO Score?"
          a={<span><strong>Readability</strong> is a simple surface metric — it measures sentence length and word complexity using a formula. Low readability doesn't mean the article is bad, just hard to follow. <strong>Quality Score</strong> goes deeper — it scores Clarity, Completeness, Structure, Accuracy, and Actionability using AI that actually reads the article. <strong>SEO Score</strong> measures how likely the article is to rank in Google — title clarity, heading structure, content depth, and keyword signals. Use Improve Article to fix readability and structure in one pass, then re-run Quality and SEO scores to see the improvement.</span>} />
        <FAQ q="How do I get an API token from Zendesk®?"
          a={<span>Admin Center → Apps & Integrations → APIs → Zendesk® API → API Tokens → Add API token. <a href="https://support.zendesk.com/hc/en-us/articles/4408889192858" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)', fontWeight: 600 }}>View Zendesk® guide →</a></span>} />
        <FAQ q="What does ArticleIQ do with my article content?"
          a="Article content is fetched directly from Zendesk® using your API credentials and processed in your browser. When you use AI features, the article HTML is sent to Anthropic's API. We store article metadata (title, word count, scores) but not the full article body." />
        <FAQ q="How accurate is duplicate detection?"
          a="Duplicate detection compares article titles using similarity scoring. It flags articles with 85%+ title similarity — which catches near-duplicates reliably but won't catch articles with different titles covering the same topic." />
      </div>

      {/* Contact */}
      <div style={{ padding: '20px', borderRadius: 12, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Still have questions?</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>We're happy to help — reach out and we'll get back to you.</p>
        </div>
        <a to="/contact" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Contact support</a>
      </div>
    </div>
  )
}
