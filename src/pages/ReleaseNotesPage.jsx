import { Link } from 'react-router-dom'

const RELEASES = [
  {
    version: '1.5.0',
    date: 'May 7, 2026',
    tag: 'Security & polish',
    tagColor: '#2563EB',
    tagBg: '#EFF6FF',
    changes: [
      { type: 'new',  text: 'JWT authentication on all API endpoints — requests are now verified server-side' },
      { type: 'new',  text: 'Rate limiting on AI and scan endpoints — 30 AI calls/min, 200 scan chunks/hour' },
      { type: 'new',  text: 'HTML sanitization before publishing to Zendesk® — strips scripts and event handlers' },
      { type: 'new',  text: 'Pro plan check enforced server-side on AI features' },
      { type: 'new',  text: 'Zendesk® trademark added throughout with footer disclaimer' },
      { type: 'new',  text: 'Release notes page (you are here)' },
      { type: 'fix',  text: 'Dashboard no longer crashes on load when profile is still fetching' },
      { type: 'fix',  text: 'Scan preset badge now shows "Standard · 5 checks" instead of raw key string' },
      { type: 'fix',  text: 'Failed scan now shows a proper error page with retry option' },
      { type: 'fix',  text: 'Time saved metric removed from dashboard — was based on an estimate' },
      { type: 'fix',  text: 'Sign out moved out of Danger Zone into its own Session section' },
    ],
  },
  {
    version: '1.4.0',
    date: 'May 7, 2026',
    tag: 'AI editor',
    tagColor: 'var(--green)',
    tagBg: 'var(--green-light)',
    changes: [
      { type: 'new',  text: 'Full WYSIWYG editor — make final edits to AI output before publishing, no raw HTML' },
      { type: 'new',  text: 'Tables now render correctly in the AI editor (TipTap table extension)' },
      { type: 'new',  text: 'Toolbar tooltips — hover any editor button to see what it does' },
      { type: 'new',  text: 'Grammar fix and Rewrite combined into single "Improve Article" action' },
      { type: 'new',  text: 'Publish to Zendesk® now routes through server — fixes CORS error' },
      { type: 'new',  text: 'Two-step confirmation before publishing — prevents accidental overwrites' },
      { type: 'new',  text: 'Images, links, and tables preserved through AI rewrite (raw HTML pipeline)' },
      { type: 'new',  text: 'AI calls moved server-side — Anthropic API key no longer exposed in browser' },
      { type: 'fix',  text: 'Article row redesigned — clear flow: Open in Zendesk® → Issues → Fix with ArticleIQ → Resolve' },
      { type: 'fix',  text: 'Resolved vs Reviewed consolidated — just one "Mark resolved" action now' },
      { type: 'fix',  text: 'Stronger border on expanded article panel so grouped content is visually clear' },
    ],
  },
  {
    version: '1.3.0',
    date: 'May 6, 2026',
    tag: 'AI features',
    tagColor: 'var(--green)',
    tagBg: 'var(--green-light)',
    changes: [
      { type: 'new',  text: 'Improve Article — fix grammar, spelling, and rewrite for clarity in one click' },
      { type: 'new',  text: 'Quality Score — Claude rates your article on clarity, completeness, structure, and tone' },
      { type: 'new',  text: 'AI drawer slides in from the right with full before/after view' },
      { type: 'new',  text: 'Publish directly to Zendesk® from ArticleIQ — no copy-pasting required' },
      { type: 'new',  text: 'Fix with ArticleIQ section in article row with full descriptions of each action' },
      { type: 'new',  text: 'Pro upsell panel with AI feature preview for free users' },
      { type: 'new',  text: 'Help & documentation page with AI disclaimer and FAQ' },
      { type: 'new',  text: 'Settings page — email notification toggle, scan defaults, danger zone' },
    ],
  },
  {
    version: '1.2.0',
    date: 'May 6, 2026',
    tag: 'Design overhaul',
    tagColor: '#7C3AED',
    tagBg: '#F3F0FF',
    changes: [
      { type: 'new',  text: 'Completely redesigned dashboard — health score hero, quick wins, insight card, time saved' },
      { type: 'new',  text: 'Landing page with three demo screenshots, pricing, and real sales copy' },
      { type: 'new',  text: 'Redesigned login page — split panel with trust signals and health score preview' },
      { type: 'new',  text: 'Top navigation bar replaces sidebar — cleaner, more space for content' },
      { type: 'new',  text: 'Avatar dropdown — account info, Manage connectors, What\'s new, Help, Sign out' },
      { type: 'new',  text: 'Scan launcher redesigned — checkbox picker with plain English descriptions per check' },
      { type: 'new',  text: 'AI section separated from quality checks with Pro upgrade panel' },
      { type: 'new',  text: 'New user onboarding — 3-step guide shown before first scan' },
      { type: 'new',  text: 'Scan results page redesigned — matches dashboard design language' },
      { type: 'fix',  text: 'Plus Jakarta Sans font replaces Syne — no more squished headings' },
    ],
  },
  {
    version: '1.1.0',
    date: 'May 5, 2026',
    tag: 'Scan improvements',
    tagColor: 'var(--amber)',
    tagBg: 'var(--amber-light)',
    changes: [
      { type: 'new',  text: 'Stall detection — scan shows Resume button if no activity for 3+ minutes' },
      { type: 'new',  text: 'Duplicate-safe resume — restarting a scan skips already-processed articles' },
      { type: 'new',  text: 'Heartbeat tracking via last_activity timestamp on scan jobs' },
      { type: 'new',  text: 'Broken link detection added as optional scan check' },
      { type: 'new',  text: 'Scan completion email notification via Resend' },
      { type: 'new',  text: 'Excel export with full issue breakdown across two sheets' },
      { type: 'new',  text: 'Shareable public report links — no login required to view' },
      { type: 'fix',  text: 'Health score now derived from article_issues table — was previously inaccurate' },
      { type: 'fix',  text: 'Issue counts now accurate across all scan presets' },
      { type: 'fix',  text: 'ConnectorPage no longer crashes on load (undefined profile reference)' },
    ],
  },
  {
    version: '1.0.0',
    date: 'May 4, 2026',
    tag: 'Initial release',
    tagColor: 'var(--text-3)',
    tagBg: 'var(--bg)',
    changes: [
      { type: 'new',  text: 'Zendesk® knowledge base scanner — connect and scan in under 10 minutes' },
      { type: 'new',  text: 'Health score (0–100) with Critical, Warning, and Info issue classification' },
      { type: 'new',  text: 'Readability scoring using Flesch-Kincaid formula' },
      { type: 'new',  text: 'Outdated content detection — articles not updated in 180+ days' },
      { type: 'new',  text: 'Thin content detection — articles under 150 words flagged' },
      { type: 'new',  text: 'Duplicate article detection via title similarity scoring' },
      { type: 'new',  text: 'Missing labels and section assignment detection' },
      { type: 'new',  text: 'Filter results by All / Has issues / Critical / Clean / Resolved' },
      { type: 'new',  text: 'Sort by severity, readability, or word count' },
      { type: 'new',  text: 'Mark individual issues as resolved — persists across sessions' },
      { type: 'new',  text: 'Google OAuth authentication via Supabase' },
    ],
  },
]

const TYPE_CONFIG = {
  new: { label: 'New', color: 'var(--green)', bg: 'var(--green-light)', border: 'var(--green-border)' },
  fix: { label: 'Fix', color: 'var(--amber)', bg: 'var(--amber-light)', border: 'var(--amber-border)' },
  improved: { label: 'Improved', color: 'var(--blue)', bg: 'var(--blue-light)', border: 'var(--blue-border)' },
}

export default function ReleaseNotesPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: -0.3 }}>What's New</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Every update, fix, and improvement to ArticleIQ</p>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 15, top: 8, bottom: 0, width: 1, background: 'var(--border)' }} />

        {RELEASES.map((release, ri) => (
          <div key={release.version} style={{ position: 'relative', paddingLeft: 40, marginBottom: 40 }}>
            <div style={{ position: 'absolute', left: 8, top: 6, width: 14, height: 14, borderRadius: '50%', background: ri === 0 ? 'var(--green)' : 'var(--border-md)', border: '2px solid white', zIndex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>v{release.version}</h2>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: release.tagBg, color: release.tagColor }}>
                {release.tag}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{release.date}</span>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              {release.changes.map((change, ci) => {
                const t = TYPE_CONFIG[change.type] || TYPE_CONFIG.new
                return (
                  <div key={ci} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: ci < release.changes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: t.bg, color: t.color, border: `1px solid ${t.border}`, flexShrink: 0, marginTop: 2 }}>
                      {t.label}
                    </span>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{change.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px', borderRadius: 10, background: 'var(--green-light)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Have a feature request or found a bug?</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>We'd love to hear from you.</p>
        </div>
        <a href="mailto:support@articleiq.app" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
          Send feedback
        </a>
      </div>
    </div>
  )
}
