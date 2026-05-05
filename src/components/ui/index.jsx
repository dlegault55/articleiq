import { Loader, AlertTriangle, RefreshCw, Inbox } from 'lucide-react'

// ─── PageShell ────────────────────────────────────────────────
// Consistent page wrapper with header
export const PageShell = ({ eyebrow, title, subtitle, action, children }) => (
  <div className="p-8 max-w-5xl mx-auto animate-fade-in">
    <div className="flex items-start justify-between mb-8">
      <div>
        {eyebrow && <p className="section-header">{eyebrow}</p>}
        <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 28, color: 'var(--text-primary)', margin: 0, letterSpacing: -0.5 }}>
          {title}
        </h1>
        {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
    {children}
  </div>
)

// ─── LoadingState ─────────────────────────────────────────────
// Inline loading — not a full screen takeover
export const LoadingState = ({ message = 'Loading...' }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <Loader size={20} style={{ color: 'var(--xbox)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>{message}</p>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
)

// ─── ErrorState ───────────────────────────────────────────────
export const ErrorState = ({ message, onRetry }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, maxWidth: 360, textAlign: 'center' }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AlertTriangle size={18} style={{ color: 'var(--badge-critical-color)' }} />
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, margin: 0 }}>Something went wrong</p>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary" style={{ marginTop: 4 }}>
          <RefreshCw size={13} /> Try again
        </button>
      )}
    </div>
  </div>
)

// ─── EmptyState ───────────────────────────────────────────────
export const EmptyState = ({ icon: Icon = Inbox, title, description, action }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, maxWidth: 320, textAlign: 'center' }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-sunken)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} style={{ color: 'var(--text-muted)' }} />
      </div>
      <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, margin: 0 }}>{title}</p>
      {description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{description}</p>}
      {action && <div style={{ marginTop: 4 }}>{action}</div>}
    </div>
  </div>
)

// ─── InfoBanner ───────────────────────────────────────────────
export const InfoBanner = ({ icon, title, description, action, type = 'info' }) => {
  const styles = {
    info:    { bg: 'var(--xbox-subtle)',          border: 'var(--xbox-border)',          color: 'var(--xbox)' },
    warning: { bg: 'rgba(245,158,11,0.08)',        border: 'rgba(245,158,11,0.2)',        color: 'var(--badge-warning-color)' },
    error:   { bg: 'rgba(239,68,68,0.08)',         border: 'rgba(239,68,68,0.2)',         color: 'var(--badge-critical-color)' },
  }
  const s = styles[type] || styles.info
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 16px', borderRadius: 9, background: s.bg, border: `1px solid ${s.border}`, marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {icon && <div style={{ width: 32, height: 32, borderRadius: 7, background: s.bg, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: s.color }}>{icon}</div>}
        <div>
          {title && <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</p>}
          {description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginTop: 1 }}>{description}</p>}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────
export const StatCard = ({ label, value, sub, icon: Icon, color }) => (
  <div className="card p-5">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 10, fontFamily: 'Fira Code, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{label}</span>
      {Icon && (
        <div style={{ width: 30, height: 30, borderRadius: 7, background: `${color}18`, border: `1px solid ${color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={14} style={{ color }} />
        </div>
      )}
    </div>
    <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: -0.5, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
  </div>
)
