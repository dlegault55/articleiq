import { usePageTitle } from '@/hooks/usePageTitle'
import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Zap, Scan, BookOpen, Link2, Copy, Tag, Clock, Type, Shield, ExternalLink, ImageOff } from 'lucide-react'

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
            { num: '01', title: 'Connect your KB', desc: "Go to Connectors in the account menu. Choose Zendesk®, HelpScout, or Freshdesk and follow the setup steps. ArticleIQ uses read-only access for scanning — we never modify your articles without your say." },
            { num: '02', title: 'Find your API credentials', desc: "Zendesk®: Admin Center → APIs → API Tokens. HelpScout: Your Profile → API Keys. Freshdesk: Your avatar → Profile Settings → API Key at the bottom. Paste into the connector form." },
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
        {/* Readability is computed and passed to Quality Score but no longer shown as standalone issue */}
        <Check icon={Tag}       severity="warning"  title="Missing labels"     desc="Articles with no tags assigned. Makes them harder to find and manage. Use Suggest Labels to get AI-powered tag ideas." />
        <Check icon={Copy}      severity="warning"  title="Duplicate detection" desc="Compares article titles using similarity scoring (85%+ match). Good for catching near-duplicate titles — does not compare article body content." />
        <Check icon={Link2}     severity="critical" title="Broken links"       desc="Checks hyperlinks and images inside articles. Dead links and broken images are flagged as critical — a customer clicking a broken link gets nothing. Enabled by default. Can slow down scans on very large knowledge bases." />
      </div>

      {/* AI features */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 8, letterSpacing: -0.3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>AI features (Scan Pack & Annual Pro)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 16 }}>
          Open any article and click <strong>Analyse & Improve</strong> to launch the three-pane editor. All AI features run in a single unified flow — analysis informs the rewrite, and recommendations update as you work.
        </p>

        {/* Three pane overview */}
        <div className="card" style={{ overflow:'hidden', marginBottom:16 }}>
          <div style={{ padding:'10px 18px', background:'var(--bg)', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', margin:0 }}>Three-pane editor layout</p>
          </div>
          {[
            { pane:'Left', label:'Original Article', desc:'The untouched original article — always visible for reference while you work.' },
            { pane:'Middle', label:'Recommendations', desc:'Quality Score and SEO Score run automatically when you open an article. Shows dimension bars, specific improvement suggestions, and SEO fixes with high/medium/low impact ratings.' },
            { pane:'Right', label:'AI Rewrite', desc:'The AI rewrite appears here after you click Improve Article. Switch between Edit (editable) and Changes (word-level diff showing additions and removals) using the tabs in the panel header.' },
          ].map(({ pane, label, desc }, i, arr) => (
            <div key={pane} style={{ display:'flex', gap:12, padding:'12px 18px', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width:36, height:36, borderRadius:8, background:'var(--navy-light)', border:'1px solid var(--navy-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800, color:'var(--navy)' }}>{pane}</div>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 3px' }}>{label}</p>
                <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.7 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Feature list */}
        <div className="card" style={{ overflow: 'hidden', marginBottom: 12 }}>
          {[
            {
              title: 'Quality Score',
              desc: 'Scores 0–100 across five dimensions: Clarity, Completeness, Structure, Accuracy, and Actionability. Each dimension is scored out of 20. Runs automatically when you open the drawer.',
            },
            {
              title: 'SEO Score',
              desc: 'Grades A–F based on title length and keyword clarity, heading structure, content depth, and first paragraph strength. Suggests an improved title if the current one underperforms. Runs automatically alongside Quality Score.',
            },
            {
              title: 'Improve Article',
              desc: 'Generates a targeted rewrite informed by the specific quality and SEO findings — not a generic grammar pass. Detects the article type (troubleshooting, how-to, FAQ, release note) and applies the correct structure. All images, links, code blocks, and tables are preserved exactly. For thin or low-scoring articles, ArticleIQ will tell you the article needs a human rewrite rather than attempting to improve content it cannot safely expand.',
            },
            {
              title: 'Dismissing recommendations',
              desc: 'Click <strong>Not relevant</strong> on any recommendation to mark it as not applicable. Dismissed items are removed from the list, excluded from future rewrites, and remembered next time you open this article. The quality score adjusts upward to reflect only the relevant findings.',
            },
            {
              title: 'Changes tab (diff view)',
              desc: 'After improving, switch to the Changes tab in the right panel to see a word-level diff — additions highlighted in green, removals in red strikethrough. A summary bar shows how many words were added and removed.',
            },
            {
              title: 'Re-analyse',
              desc: 'After editing the rewrite, click Re-analyse in the footer to run fresh Quality and SEO scores on your edited version. The recommendations update to reflect what still needs attention.',
            },
            {
              title: 'Publish to Zendesk®',
              desc: 'Publishes the rewrite directly back to your knowledge base with one click. For Zendesk® this requires a Guide Admin API token — see the FAQ below if publishing returns a 403 error. HelpScout publishing works with any API key.',
            },
            {
              title: 'Label suggestions',
              desc: 'Suggests 3–5 relevant labels based on article content. Click any label to publish it directly to your KB — existing labels are preserved. Available to all users.',
            },
          ].map(({ title, desc }, i, arr) => (
            <div key={title} style={{ padding: '14px 18px', borderBottom: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</p>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--amber-light)', border: '1px solid var(--amber-border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--amber)' }}>Always review before publishing.</strong> AI rewrites can introduce errors, change technical meaning, or miss context specific to your product. Verify technical steps, product names, version numbers, and links before clicking Publish.
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
          a="No. ArticleIQ is fully read-only. We never write to your knowledge base unless you explicitly click Publish in the AI drawer. Nothing is changed automatically." />
        <FAQ q="Why does the scan need the tab to stay open?"
          a="Scans run in your browser rather than on a server. Keep the tab active while scanning — you'll get an email when it's done." />
        <FAQ q="What happens if an article is too short or low quality for AI to improve?"
          a={<span>If an article scores below 35/100 or has fewer than 150 words, ArticleIQ will flag it as <strong>needing a human rewrite</strong> rather than running AI on it. The rewrite panel explains exactly what the article is missing — context, steps, expected outcome, escalation path — so you know what to write. A <strong>Clean up formatting only</strong> option is still available if you want AI to fix grammar and structure without adding any new content. This is intentional: AI improvising on thin articles risks publishing inaccurate information.</span>} />

        <FAQ q="Which platforms does ArticleIQ support?"
          a={<span>ArticleIQ currently supports <strong>Zendesk®</strong>, <strong>HelpScout</strong>, and <strong>Freshdesk</strong>. Go to Connectors, choose your platform, and follow the setup steps. More connectors are in the roadmap — if your platform is not listed, <a href="/contact" style={{color:"var(--navy)"}}>let us know</a> and we will prioritise it.</span>} />

        <FAQ q="How do I connect Freshdesk?"
          a={<span>In Freshdesk, click your avatar in the top right → <strong>Profile Settings</strong> → scroll to the bottom to find your <strong>API Key</strong>. Copy it and paste into the Freshdesk connector form along with your subdomain (just the part before .freshdesk.com). Publishing back to Freshdesk works with any API key.</span>} />

        <FAQ q="Publish is failing with a 403 or permission error — what do I do?"
          a={<span>Publishing requires your API token to belong to a user with <strong>Guide Admin</strong> role in Zendesk® — not just any admin. Go to <strong>Connectors</strong>, remove your current connector, and reconnect using the email and API token of a Guide Admin user. You can check in Zendesk® under Admin Center → People → find a user with Guide Admin role. After reconnecting, use the <strong>Test connection</strong> button — it will confirm whether Guide Admin is detected.</span>} />

        <FAQ q="What's the difference between Quality Score and SEO Score?"
          a={<span><strong>Quality Score</strong> measures whether the article genuinely helps the reader — scored across Clarity, Completeness, Structure, Accuracy, and Actionability. <strong>SEO Score</strong> measures how likely the article is to rank in Google — title, headings, content depth, and keyword signals. Both run automatically when you open the AI drawer. Click <strong>Improve Article</strong> to generate a rewrite informed by both scores. Dismiss any recommendation that isn't relevant — the score adjusts automatically to reflect only applicable findings. Re-analyse after editing to see updated scores.</span>} />
        <FAQ q="How do I get API credentials for my platform?"
          a={<span>Admin Center → Apps & Integrations → APIs → Zendesk® API → API Tokens → Add API token. <a href="https://support.zendesk.com/hc/en-us/articles/4408889192858" target="_blank" rel="noreferrer" style={{ color: 'var(--navy)', fontWeight: 600 }}>View Zendesk® guide →</a></span>} />
        <FAQ q="What does ArticleIQ do with my article content?"
          a="Article content is fetched directly from your knowledge base using your API credentials. When you use AI features, the article HTML is sent to Anthropic's API. We store article metadata (title, word count, scores) but not the full article body." />
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
