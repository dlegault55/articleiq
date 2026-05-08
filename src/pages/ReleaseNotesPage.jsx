import { Zap, Shield, Sparkles, Wrench, ArrowRight } from 'lucide-react'

const RELEASES = [
  {
    version: '1.3.0',
    date: 'May 7, 2026',
    tag: 'Major update',
    tagColor: 'var(--green)',
    tagBg: 'var(--green-light)',
    changes: [
      { type: 'new',  text: 'AI-powered article improvement — fix grammar, spelling, and rewrite for clarity in one click' },
      { type: 'new',  text: 'Publish directly to Zendesk® from ArticleIQ — no copy-pasting required' },
      { type: 'new',  text: 'Full WYSIWYG editor with toolbar — make final edits before publishing' },
      { type: 'new',  text: 'Tables, images, and links preserved through AI rewrite' },
      { type: 'new',  text: 'Quality Score — Claude rates your article on clarity, completeness, structure, and tone' },
      { type: 'new',  text: 'Broken link detection added to Full scan preset' },
      { type: 'new',  text: 'Release notes page (you are here)' },
      { type: 'fix',  text: 'Scan progress now resumes correctly if tab is backgrounded' },
      { type: 'fix',  text: 'Issue counts now accurately derived from article_issues table' },
      { type: 'fix',  text: 'Scan preset badge now shows "Standard · 5 checks" instead of raw key string' },
    ],
  },
  {
    version: '1.2.0',
    date: 'May 6, 2026',
    tag: 'Design overhaul',
    tagColor: '#7C3AED',
    tagBg: '#F3F0FF',
    changes: [
      { type: 'new',  text: 'Completely redesigned dashboard with health score hero, quick wins, and insight card' },
      { type: 'new',  text: 'Landing page with demo screenshots and pricing' },
      { type: 'new',  text: 'Redesigned login page with split panel and trust signals' },
      { type: 'new',  text: 'Article row redesign — cleaner flow: see issue → understand → fix → resolve' },
      { type: 'new',  text: 'AI section split from quality checks with Pro upsell panel' },
      { type: 'new',  text: 'Help & documentation page with AI disclaimer' },
      { type: 'new',  text: 'Settings page with email notification toggle and scan defaults' },
      { type: 'fix',  text: 'Sign out moved out of danger zone into its own Session section' },
      { type: 'fix',  text: 'Resolved vs Reviewed consolidated into single "Mark resolved" action' },
    ],
  },
  {
    version: '1.1.0',
    date: 'May 5, 2026',
    tag: 'Scan improvements',
    tagColor: 'var(--amber)',
    tagBg: 'var(--amber-light)',
    changes: [
      { type: 'new',  text: 'Checkbox-based scan picker — choose exactly which checks to run' },
      { type: 'new',  text: 'Stall detection — scan shows Resume button if no activity for 3 minutes' },
      { type: 'new',  text: 'Duplicate-safe resume — restarting a scan skips already-processed articles' },
      { type: 'new',  text: 'Heartbeat tracking via last_activity timestamp' },
      { type: 'new',  text: 'Scan completion email notification' },
      { type: 'fix',  text: 'Health score now derived from article_issues table, not accumulated per-chunk' },
      { type: 'fix',  text: 'Scan history preset badge readable again' },
    ],
  },
  {
    version: '1.0.0',
    date: 'May 4, 2026',
    tag: 'Initial release',
    tagColor: 'var(--text-3)',
    tagBg: 'var(--bg)',
    changes: [
      { type: 'new',  text: 'Zendesk® knowledge base scanner' },
      { type: 'new',  text: 'Health score (0–100) with critical, warning, and info issue classification' },
      { type: 'new',  text: 'Readability scoring using Flesch-Kincaid formula' },
      { type: 'new',  text: 'Outdated content detection (180+ days without update)' },
      { type: 'new',  text: 'Duplicate article detection via title similarity' },
      { type: 'new',  text: 'Missing labels and section detection' },
      { type: 'new',  text: 'Filter by All / Has issues / Critical / Clean / Resolved' },
      { type: 'new',  text: 'Export to Excel with full issue breakdown' },
      { type: 'new',  text: 'Shareable public report links' },
      { type: 'new',  text: 'Google OAuth authentication via Supabase' },
    ],
  },
]

const TYPE_CONFIG = {
  new: { label: 'New',     color: 'var(--green)', bg: 'var(--green-light)', border: 'var(--green-border)' },
  fix: { label: 'Fix',     color: 'var(--amber)',  bg: 'var(--amber-light)', border: 'var(--amber-border)' },
  improved: { label: 'Improved', color: 'var(--blue)', bg: 'var(--blue-light)', border: 'var(--blue-border)' },
}

export default function ReleaseNotesPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: -0.3 }}>Release Notes</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>What's new, fixed, and improved in ArticleIQ</p>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Timeline line */}
        <div style={{ position: 'absolute', left: 15, top: 8, bottom: 0, width: 1, background: 'var(--border)' }} />

        {RELEASES.map((release, ri) => (
          <div key={release.version} style={{ position: 'relative', paddingLeft: 40, marginBottom: 40 }}>
            {/* Timeline dot */}
            <div style={{ position: 'absolute', left: 8, top: 6, width: 14, height: 14, borderRadius: '50%', background: ri === 0 ? 'var(--green)' : 'var(--border-md)', border: '2px solid var(--bg-card)', zIndex: 1 }} />

            {/* Release header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>v{release.version}</h2>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 100, background: release.tagBg, color: release.tagColor, border: `1px solid ${release.tagColor}30` }}>
                {release.tag}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{release.date}</span>
            </div>

            {/* Changes */}
            <div className="card" style={{ overflow: 'hidden' }}>
              {release.changes.map((change, ci) => {
                const t = TYPE_CONFIG[change.type] || TYPE_CONFIG.new
                return (
                  <div key={ci} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px', borderBottom: ci < release.changes.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: t.bg, color: t.color, border: `1px solid ${t.border}`, flexShrink: 0, marginTop: 1 }}>
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

      <div style={{ padding: '16px 20px', borderRadius: 10, background: 'var(--green-light)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Have a feature request?</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>We'd love to hear what would make ArticleIQ more useful for you.</p>
        </div>
        <a href="mailto:support@articleiq.app" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
          Send feedback
        </a>
      </div>
    </div>
  )
}
