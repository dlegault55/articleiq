import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { EmptyState } from '@/components/ui'
import {
  AlertOctagon, AlertTriangle, Info, ChevronDown, ChevronUp,
  ExternalLink, CheckCircle, FileText, Clock, Type, Tag,
  Link2, BookOpen, Copy, ArrowRight
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// ─── Helpers (same as ScanResultsPage) ────────────────────────
const readabilityColor = (s) => {
  if (s == null) return 'var(--text-muted)'
  if (s >= 70) return 'var(--xbox)'
  if (s >= 50) return 'var(--badge-warning-color)'
  if (s >= 30) return '#f97316'
  return 'var(--badge-critical-color)'
}

const readabilityLabel = (s) => {
  if (s == null) return 'N/A'
  if (s >= 70) return 'Easy'
  if (s >= 50) return 'Moderate'
  if (s >= 30) return 'Difficult'
  return 'Very hard'
}

const healthScore = (articles, issues) => {
  if (!articles?.length) return null
  const total    = articles.length
  const critical = issues.filter(i => i.severity === 'critical').length
  const warning  = issues.filter(i => i.severity === 'warning').length
  const info     = issues.filter(i => i.severity === 'info').length
  const penalty  = (critical * 3 + warning * 1 + info * 0.2) / total
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}

const healthColor = (s) => {
  if (s >= 80) return 'var(--xbox)'
  if (s >= 60) return 'var(--badge-warning-color)'
  if (s >= 40) return '#f97316'
  return 'var(--badge-critical-color)'
}

const ISSUE_ICON = {
  low_readability: BookOpen, low_word_count: Type, outdated: Clock,
  missing_labels: Tag, missing_metadata: FileText, missing_title: FileText,
  broken_link: Link2, duplicate_content: Copy,
}

const ReadabilityPill = ({ score }) => {
  if (score == null) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
  const color = readabilityColor(score)
  return (
    <span style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 4, padding: '1px 6px' }}>
      {score} · {readabilityLabel(score)}
    </span>
  )
}

const ArticleRow = ({ article, issues }) => {
  const [open, setOpen] = useState(false)
  const critical = issues.filter(i => i.severity === 'critical')
  const warning  = issues.filter(i => i.severity === 'warning')
  const info     = issues.filter(i => i.severity === 'info')
  const leftColor = critical.length ? 'var(--badge-critical-color)' : warning.length ? 'var(--badge-warning-color)' : 'var(--xbox)'

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', userSelect: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0, background: leftColor }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {article.title}
            </span>
            {article.url && (
              <a href={article.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, color: 'var(--text-muted)', lineHeight: 1 }}>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{article.word_count || 0} words</span>
            {article.last_updated && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated {formatDistanceToNow(new Date(article.last_updated), { addSuffix: true })}</span>}
            <ReadabilityPill score={article.readability_score} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {critical.length > 0 && <span className="badge-critical"><AlertOctagon size={9} />{critical.length}</span>}
          {warning.length  > 0 && <span className="badge-warning"><AlertTriangle size={9} />{warning.length}</span>}
          {info.length     > 0 && <span className="badge-info"><Info size={9} />{info.length}</span>}
          {issues.length === 0 && <CheckCircle size={13} style={{ color: 'var(--xbox)' }} />}
          {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {open && issues.length > 0 && (
        <div style={{ padding: '4px 20px 14px 36px', background: 'var(--bg-sunken)' }}>
          {issues.map(issue => {
            const Icon = ISSUE_ICON[issue.issue_type] || Info
            const color = issue.severity === 'critical' ? 'var(--badge-critical-color)' : issue.severity === 'warning' ? 'var(--badge-warning-color)' : 'var(--badge-info-color)'
            return (
              <div key={issue.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', borderRadius: 6, marginBottom: 4, background: `${color}10`, border: `1px solid ${color}25` }}>
                <Icon size={13} style={{ color, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 2 }}>{issue.issue_type.replace(/_/g, ' ')}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{issue.description}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function SharedReportPage() {
  const { scanId } = useParams()
  const [scan,     setScan]     = useState(null)
  const [articles, setArticles] = useState([])
  const [issues,   setIssues]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    const load = async () => {
      const [{ data: s }, { data: a }, { data: i }] = await Promise.all([
        supabase.from('scan_jobs').select('*').eq('id', scanId).eq('is_shared', true).single(),
        supabase.from('scanned_articles').select('*').eq('scan_job_id', scanId),
        supabase.from('article_issues').select('*').eq('scan_job_id', scanId),
      ])
      if (!s) { setNotFound(true); setLoading(false); return }
      setScan(s); setArticles(a || []); setIssues(i || [])
      setLoading(false)
    }
    load()
  }, [scanId])

  const score = healthScore(articles, issues)

  const filterOptions = [
    { key: 'all',      label: 'All',        count: articles.length },
    { key: 'issues',   label: 'Has issues', count: articles.filter(a => issues.some(i => i.article_id === a.id)).length },
    { key: 'critical', label: 'Critical',   count: articles.filter(a => issues.some(i => i.article_id === a.id && i.severity === 'critical')).length },
    { key: 'clean',    label: 'Clean',      count: articles.filter(a => !issues.some(i => i.article_id === a.id)).length },
  ]

  const filtered = articles
    .filter(a => {
      const ai = issues.filter(i => i.article_id === a.id)
      if (filter === 'all')      return true
      if (filter === 'issues')   return ai.length > 0
      if (filter === 'critical') return ai.some(i => i.severity === 'critical')
      if (filter === 'clean')    return ai.length === 0
      return true
    })
    .sort((a, b) => {
      const ai = issues.filter(i => i.article_id === a.id)
      const bi = issues.filter(i => i.article_id === b.id)
      const sev = x => x.some(i => i.severity === 'critical') ? 0 : x.some(i => i.severity === 'warning') ? 1 : x.length ? 2 : 3
      return sev(ai) - sev(bi)
    })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--xbox)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Report not found</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>This report may not be shared or may have been removed.</p>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--xbox)', color: '#fff', borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
          Get ArticleIQ <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Public nav */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#107C10,#0A5A0A)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: '#fff', fontSize: 11 }}>A</span>
          </div>
          <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 14, letterSpacing: 2, color: 'var(--text-primary)' }}>
            ARTICLE<span style={{ color: 'var(--xbox)' }}>IQ</span>
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8, padding: '2px 8px', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 4 }}>
            Shared Report
          </span>
        </div>
        <Link to="/" style={{ fontSize: 12, color: 'var(--xbox)', textDecoration: 'none', fontWeight: 500 }}>
          Try ArticleIQ free →
        </Link>
      </div>

      <div style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div>
            <p className="section-header">Scan Report</p>
            <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: -0.5 }}>
              {format(new Date(scan.created_at), 'MMM d, yyyy — h:mm a')}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              {articles.length} articles scanned · {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
            </p>
          </div>
          {score !== null && (
            <div style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 32, color: healthColor(score), lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 10, fontFamily: 'Fira Code, monospace', color: 'var(--text-muted)', marginTop: 2 }}>Health score</div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Articles', value: articles.length,                                      color: 'var(--text-primary)',         icon: FileText },
            { label: 'Critical', value: issues.filter(i => i.severity === 'critical').length, color: 'var(--badge-critical-color)', icon: AlertOctagon },
            { label: 'Warnings', value: issues.filter(i => i.severity === 'warning').length,  color: 'var(--badge-warning-color)',  icon: AlertTriangle },
            { label: 'Info',     value: issues.filter(i => i.severity === 'info').length,     color: 'var(--badge-info-color)',     icon: Info },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={15} style={{ color }} />
              </div>
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 24, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {filterOptions.map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Fira Code, monospace',
                background: filter === key ? 'var(--xbox-subtle)' : 'var(--bg-elevated)',
                border: `1px solid ${filter === key ? 'var(--xbox-border)' : 'var(--border)'}`,
                color: filter === key ? 'var(--xbox)' : 'var(--text-secondary)',
              }}>
              {label} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace', alignSelf: 'center' }}>
            {filtered.length} articles
          </span>
        </div>

        {/* Article list */}
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.length === 0
            ? <EmptyState icon={CheckCircle} title="No articles match this filter" />
            : filtered.map(a => (
                <ArticleRow key={a.id} article={a} issues={issues.filter(i => i.article_id === a.id)} />
              ))
          }
        </div>

        {/* Footer CTA */}
        <div style={{ marginTop: 32, textAlign: 'center', padding: '24px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Want to scan your own knowledge base?</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>ArticleIQ is free to get started — no credit card required.</p>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: 'var(--xbox)', color: '#fff', borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            Start for free <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  )
}
