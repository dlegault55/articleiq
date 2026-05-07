import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle, Zap, Scan, BookOpen, Link2, Copy, Tag, Clock, Type, Shield, ExternalLink } from 'lucide-react'

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 40 }}>
    <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16, letterSpacing: -0.3, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>{title}</h2>
    {children}
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
        <div style={{ paddingBottom: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8 }}>
          {a}
        </div>
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
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: -0.3 }}>Help & Documentation</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Everything you need to get the most out of ArticleIQ</p>
      </div>

      {/* ── AI Disclaimer — prominent ── */}
      <div style={{ borderRadius: 12, background: 'var(--amber-light)', border: '1.5px solid var(--amber-border)', padding: '18px 20px', marginBottom: 40 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>AI features can make mistakes — always review before publishing</p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 8 }}>
              ArticleIQ uses Claude AI to help fix grammar, rewrite articles, and score quality. While Claude is highly capable, AI can introduce errors, change technical meaning, miss context, or produce output that doesn't match your brand voice.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 8 }}>
              <strong style={{ color: 'var(--text)' }}>You are responsible for any content published to your knowledge base.</strong> ArticleIQ provides AI suggestions as a starting point — not a finished product. Always read the full rewrite before clicking "Publish to Zendesk", and verify that technical instructions, product names, steps, and links are correct.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
              ArticleIQ and its operators accept no liability for inaccurate, incomplete, or misleading content published to your knowledge base as a result of using AI features. Use of AI features constitutes acceptance of these terms.
            </p>
          </div>
        </div>
      </div>

      {/* ── Getting started ── */}
      <Section title="Getting started">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { num: '01', title: 'Connect Zendesk', desc: 'Go to Connectors in the account menu. Enter your Zendesk subdomain, admin email, and API token. ArticleIQ uses read-only access by default — we never modify your articles unless you explicitly publish an AI rewrite.' },
            { num: '02', title: 'Find your API token', desc: 'In Zendesk: Admin Center → Apps & Integrations → APIs → Zendesk API → API Tokens. Create a new token and copy it. Keep it safe — you won\'t be able to see it again.' },
            { num: '03', title: 'Run your first scan', desc: 'From the Dashboard, select which checks to run and click Start Scan. Keep the tab open while scanning — the scan runs in your browser and will pause if the tab is closed or backgrounded for too long.' },
            { num: '04', title: 'Review your results', desc: 'Your health score and issue breakdown appear as soon as the scan completes. Click any article to expand its issues. Use the filter tabs to focus on Critical issues first.' },
          ].map(({ num, title, desc }) => (
            <div key={num} style={{ display: 'flex', gap: 14, padding: '16px 18px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--green-light)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>{num}</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Scan checks explained ── */}
      <Section title="What each check looks for">
        <Check icon={Clock}    severity="warning"  title="Outdated articles" desc="Articles that haven't been updated in 180+ days. Flagged as a warning — not automatically wrong, but worth reviewing to confirm the content is still accurate." />
        <Check icon={Type}     severity="warning"  title="Thin content" desc="Articles under 150 words are flagged as warnings; under 50 words as critical. Short articles are often too brief to genuinely help a customer through a problem." />
        <Check icon={BookOpen} severity="critical" title="Readability score" desc="Uses the Flesch-Kincaid formula to score how easy an article is to read (0–100). Below 50 is a warning; below 30 is critical. Long sentences, passive voice, and technical jargon all lower the score." />
        <Check icon={Tag}      severity="warning"  title="Missing labels" desc="Articles with no tags or category assigned. Makes them harder to find via search and harder to manage at scale." />
        <Check icon={Copy}     severity="warning"  title="Duplicate detection" desc="Compares article titles across your knowledge base for high similarity. Articles with 85%+ title similarity are flagged. This catches near-duplicate content that confuses customers and dilutes search results." />
        <Check icon={Link2}    severity="warning"  title="Broken links" desc="Checks hyperlinks inside articles by following them and checking for non-200 HTTP responses. Can slow down the Full scan significantly on large knowledge bases." />
      </Section>

      {/* ── AI features ── */}
      <Section title="AI features (Pro)">
        <div style={{ padding: '16px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #0A5A0A, #107C10)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={14} style={{ color: '#FFD93D' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'white', margin: 0 }}>Powered by Claude</p>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.7 }}>
            AI features use Anthropic's Claude model. Each action fetches the full article HTML from Zendesk and sends it to Claude for processing. Images, links, tables, and code blocks are preserved in the output.
          </p>
        </div>
        {[
          { title: 'Fix Grammar', desc: 'Corrects grammar, spelling, and punctuation errors while preserving the original meaning and structure. Good for quick cleanup of an otherwise well-written article.' },
          { title: 'Rewrite', desc: 'Rewrites the article for clarity and readability. Restructures content into clear sections (Problem, Why This Happens, Solution). Best for articles that are technically correct but hard to follow.' },
          { title: 'Quality Score', desc: 'Scores the article 0–100 on clarity, completeness, structure, and tone. Returns specific suggestions for improvement. Useful for prioritising which articles to rewrite first.' },
        ].map(({ title, desc }) => (
          <div key={title} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</p>
            <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>{desc}</p>
          </div>
        ))}
        <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: 'var(--amber-light)', border: '1px solid var(--amber-border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--amber)' }}>Important:</strong> Always use the Preview tab to review the full AI output before publishing. Pay particular attention to technical steps, product names, version numbers, and any instructions where incorrect information could cause customer harm. ArticleIQ is not responsible for content published using AI features.
          </p>
        </div>
      </Section>

      {/* ── Health score ── */}
      <Section title="How the health score is calculated">
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.8, marginBottom: 12 }}>
          The health score (0–100) is calculated from the ratio of issues to total articles, weighted by severity:
        </p>
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
          A score of <strong>80+</strong> is Healthy. <strong>60–79</strong> needs attention. Below 60 is critical. The score improves as you resolve issues — mark issues as resolved in the results page to see your projected score.
        </p>
      </Section>

      {/* ── FAQ ── */}
      <Section title="Frequently asked questions">
        <FAQ q="Does ArticleIQ modify my Zendesk articles automatically?"
          a="No. ArticleIQ is read-only by default. The only time we write to Zendesk is when you explicitly click 'Publish to Zendesk' inside the AI rewrite drawer. You always see a confirmation dialog before anything is published." />
        <FAQ q="Why does the scan need the tab to stay open?"
          a="Scans run in your browser rather than on a server, which means they pause if the tab is closed or moved to the background for too long. We're working on a server-side scan option. For now, keep the tab active while scanning — you'll get an email when it's done." />
        <FAQ q="How accurate is duplicate detection?"
          a="Duplicate detection compares article titles using text similarity scoring. It flags articles with 85%+ title similarity — which catches near-duplicates reliably but won't catch articles with completely different titles covering the same topic. It's a starting point, not a comprehensive audit." />
        <FAQ q="What does ArticleIQ do with my article content?"
          a="Article content is fetched directly from Zendesk using your API credentials and processed in your browser. When you use AI features, the article HTML is sent to Anthropic's API for processing. We store article metadata (title, word count, scores) in our database but not the full article body." />
        <FAQ q="Can I undo a publish to Zendesk?"
          a="ArticleIQ doesn't provide an undo. If your Zendesk plan includes article version history, you can restore a previous version from the Zendesk admin panel. We strongly recommend reviewing the full rewrite before publishing." />
        <FAQ q="Why is my readability score low even though the article seems clear?"
          a="The Flesch-Kincaid formula penalises long sentences, multi-syllable words, and passive voice. Technical documentation often scores lower than conversational content. Use it as a guide, not an absolute — a score of 40–60 is acceptable for technical content, while consumer-facing articles should aim for 60+." />
        <FAQ q="How do I get an API token from Zendesk?"
          a={<span>In Zendesk: Admin Center → Apps & Integrations → APIs → Zendesk API → API Tokens tab → Add API token. <a href="https://support.zendesk.com/hc/en-us/articles/4408889192858" target="_blank" rel="noreferrer" style={{ color: 'var(--green)', fontWeight: 600 }}>View Zendesk's full guide →</a></span>} />
      </Section>

      {/* ── Contact ── */}
      <div style={{ padding: '20px', borderRadius: 12, background: 'var(--green-light)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Still have questions?</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>We're happy to help — reach out and we'll get back to you.</p>
        </div>
        <a href="mailto:support@articleiq.app" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
          Contact support
        </a>
      </div>

    </div>
  )
}
