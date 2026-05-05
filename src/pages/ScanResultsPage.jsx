import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { grammarFix, fullRewrite, getQualityScore } from '@/lib/claude'
import { canUseAI } from '@/lib/stripe'
import { EmptyState } from '@/components/ui'
import {
  AlertOctagon, AlertTriangle, Info, ChevronDown, ChevronUp,
  Wand2, RefreshCcw, Star, ExternalLink, Loader,
  ArrowLeft, CheckCircle, FileText, Clock, Type, Tag, Link2, BookOpen
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────
const readabilityColor = (score) => {
  if (score === null || score === undefined) return 'var(--text-muted)'
  if (score >= 70) return 'var(--xbox)'
  if (score >= 50) return 'var(--badge-warning-color)'
  if (score >= 30) return '#f97316'
  return 'var(--badge-critical-color)'
}

const readabilityLabel = (score) => {
  if (score === null || score === undefined) return 'N/A'
  if (score >= 70) return 'Easy'
  if (score >= 50) return 'Moderate'
  if (score >= 30) return 'Difficult'
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

const healthColor = (score) => {
  if (score >= 80) return 'var(--xbox)'
  if (score >= 60) return 'var(--badge-warning-color)'
  if (score >= 40) return '#f97316'
  return 'var(--badge-critical-color)'
}

const issueTypeIcon = {
  low_readability:  BookOpen,
  low_word_count:   Type,
  outdated:         Clock,
  missing_labels:   Tag,
  missing_metadata: FileText,
  missing_title:    FileText,
  broken_link:      Link2,
}

// ─── Readability pill ─────────────────────────────────────────
const ReadabilityPill = ({ score }) => {
  if (!score && score !== 0) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
  const color = readabilityColor(score)
  return (
    <span style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 4, padding: '1px 6px' }}>
      {score} · {readabilityLabel(score)}
    </span>
  )
}

// ─── Issue chip ───────────────────────────────────────────────
const IssueChip = ({ issue }) => {
  const Icon = issueTypeIcon[issue.issue_type] || Info
  const cls = `badge-${issue.severity}`
  return (
    <div className={cls} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '6px 8px', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon size={10} />
        <span style={{ fontWeight: 600 }}>{issue.issue_type.replace(/_/g, ' ')}</span>
      </div>
      <span style={{ opacity: 0.8, fontFamily: 'Inter, sans-serif', fontWeight: 400, fontSize: 11, textTransform: 'none', letterSpacing: 0 }}>{issue.description}</span>
    </div>
  )
}

// ─── AI Panel ─────────────────────────────────────────────────
const AIPanel = ({ article, isPaid }) => {
  const [loading, setLoading] = useState(null)
  const [result, setResult] = useState(null)

  const run = async (action) => {
    if (!isPaid) return
    setLoading(action)
    setResult(null)
    try {
      if (action === 'grammar') {
        const r = await grammarFix(article.title, article.title)
        setResult({ type: 'grammar', content: r })
      } else if (action === 'rewrite') {
        const r = await fullRewrite(article.title, article.title)
        setResult({ type: 'rewrite', content: r })
      } else if (action === 'quality') {
        const r = await getQualityScore(article.title, article.title)
        setResult({ type: 'quality', score: r })
      }
    } catch (e) {
      setResult({ type: 'error', content: e.message })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontFamily: 'Fira Code, monospace', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI Actions</span>
        {[
          { key: 'grammar', label: 'Fix Grammar', icon: Wand2 },
          { key: 'rewrite', label: 'Rewrite',     icon: RefreshCcw },
          { key: 'quality', label: 'Score',        icon: Star },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key}
            onClick={() => run(key)}
            disabled={!isPaid || loading === key}
            className="btn-secondary"
            style={{ fontSize: 11, padding: '4px 10px', opacity: isPaid ? 1 : 0.4, cursor: isPaid ? 'pointer' : 'not-allowed' }}
            title={!isPaid ? 'Upgrade to Pro' : undefined}
          >
            {loading === key ? <Loader size={11} className="animate-spin" /> : <Icon size={11} />}
            {label}
            {!isPaid && <span style={{ fontSize: 8, background: 'var(--xbox-subtle)', color: 'var(--xbox)', border: '1px solid var(--xbox-border)', borderRadius: 3, padding: '1px 4px', fontFamily: 'Fira Code, monospace' }}>PRO</span>}
          </button>
        ))}
      </div>

      {result && (
        <div style={{ marginTop: 10, padding: '12px 14px', borderRadius: 7, background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
          {result.type === 'error' && <p style={{ color: 'var(--badge-critical-color)', fontSize: 12, margin: 0 }}>{result.content}</p>}
          {(result.type === 'grammar' || result.type === 'rewrite') && (
            <>
              <p style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', color: 'var(--xbox)', marginBottom: 6, margin: '0 0 6px 0' }}>
                ✓ {result.type === 'grammar' ? 'Grammar fixed' : 'Article rewritten'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
                {result.content.slice(0, 600)}{result.content.length > 600 ? '…' : ''}
              </p>
            </>
          )}
          {result.type === 'quality' && result.score && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 36, color: healthColor(result.score.overall), lineHeight: 1 }}>{result.score.overall}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>/ 100</div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{result.score.summary}</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {['clarity', 'completeness', 'structure', 'tone'].map(k => (
                  <div key={k} style={{ textAlign: 'center', padding: '6px', background: 'var(--bg-elevated)', borderRadius: 5, border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: healthColor(result.score[k]) }}>{result.score[k]}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Article row ──────────────────────────────────────────────
const ArticleRow = ({ article, issues, isPaid }) => {
  const [open, setOpen] = useState(false)
  const critical = issues.filter(i => i.severity === 'critical')
  const warning  = issues.filter(i => i.severity === 'warning')
  const info     = issues.filter(i => i.severity === 'info')
  const hasIssues = issues.length > 0
  const score = article.readability_score

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', transition: 'background 0.1s', userSelect: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {/* Health indicator */}
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0, background: critical.length ? 'var(--badge-critical-color)' : warning.length ? 'var(--badge-warning-color)' : 'var(--xbox)' }} />

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
            {article.last_updated && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Updated {formatDistanceToNow(new Date(article.last_updated), { addSuffix: true })}
              </span>
            )}
            <ReadabilityPill score={score} />
          </div>
        </div>

        {/* Issue badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {critical.length > 0 && <span className="badge-critical"><AlertOctagon size={9} />{critical.length}</span>}
          {warning.length  > 0 && <span className="badge-warning"><AlertTriangle size={9} />{warning.length}</span>}
          {info.length     > 0 && <span className="badge-info"><Info size={9} />{info.length}</span>}
          {!hasIssues && <CheckCircle size={13} style={{ color: 'var(--xbox)' }} />}
          {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '4px 20px 16px 36px', background: 'var(--bg-sunken)' }}>
          {issues.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', color: 'var(--xbox)', fontSize: 12 }}>
              <CheckCircle size={13} /> No issues found — this article looks great
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 10, paddingBottom: 4 }}>
              {[...critical, ...warning, ...info].map(issue => (
                <IssueChip key={issue.id} issue={issue} />
              ))}
            </div>
          )}
          <AIPanel article={article} isPaid={isPaid} />
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function ScanResultsPage() {
  const { scanId } = useParams()
  const { profile } = useAuth()
  const [scan, setScan]         = useState(null)
  const [articles, setArticles] = useState([])
  const [issues, setIssues]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [sort, setSort]         = useState('severity') // 'severity' | 'readability' | 'words' | 'updated'

  const isPaid = canUseAI(profile?.plan)

  useEffect(() => {
    const load = async () => {
      const [{ data: s }, { data: a }, { data: i }] = await Promise.all([
        supabase.from('scan_jobs').select('*').eq('id', scanId).single(),
        supabase.from('scanned_articles').select('*').eq('scan_job_id', scanId),
        supabase.from('article_issues').select('*').eq('scan_job_id', scanId),
      ])
      setScan(s)
      setArticles(a || [])
      setIssues(i || [])
      setLoading(false)
    }
    load()
  }, [scanId])

  const score = healthScore(articles, issues)

  const filterOptions = [
    { key: 'all',      label: 'All',      count: articles.length },
    { key: 'issues',   label: 'Has issues', count: articles.filter(a => issues.some(i => i.article_id === a.id)).length },
    { key: 'critical', label: 'Critical', count: articles.filter(a => issues.some(i => i.article_id === a.id && i.severity === 'critical')).length },
    { key: 'warning',  label: 'Warning',  count: articles.filter(a => issues.some(i => i.article_id === a.id && i.severity === 'warning')).length },
    { key: 'clean',    label: 'Clean',    count: articles.filter(a => !issues.some(i => i.article_id === a.id)).length },
  ]

  const filtered = articles
    .filter(a => {
      const ai = issues.filter(i => i.article_id === a.id)
      if (filter === 'all')      return true
      if (filter === 'issues')   return ai.length > 0
      if (filter === 'critical') return ai.some(i => i.severity === 'critical')
      if (filter === 'warning')  return ai.some(i => i.severity === 'warning')
      if (filter === 'clean')    return ai.length === 0
      return true
    })
    .sort((a, b) => {
      const ai = issues.filter(i => i.article_id === a.id)
      const bi = issues.filter(i => i.article_id === b.id)
      if (sort === 'severity') {
        const aSev = ai.some(i => i.severity === 'critical') ? 0 : ai.some(i => i.severity === 'warning') ? 1 : ai.length ? 2 : 3
        const bSev = bi.some(i => i.severity === 'critical') ? 0 : bi.some(i => i.severity === 'warning') ? 1 : bi.length ? 2 : 3
        return aSev - bSev
      }
      if (sort === 'readability') return (a.readability_score || 0) - (b.readability_score || 0)
      if (sort === 'words')       return (a.word_count || 0) - (b.word_count || 0)
      if (sort === 'updated')     return new Date(a.last_updated || 0) - new Date(b.last_updated || 0)
      return 0
    })

  if (loading) return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }} className="animate-fade-in">
      <div style={{ width: 120, height: 16, marginBottom: 24 }} className="skeleton" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 }}>
        <div>
          <div style={{ width: 80, height: 12, marginBottom: 10 }} className="skeleton" />
          <div style={{ width: 280, height: 28, marginBottom: 8 }} className="skeleton" />
          <div style={{ width: 200, height: 14 }} className="skeleton" />
        </div>
        <div style={{ width: 80, height: 70, borderRadius: 10 }} className="skeleton" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 10 }} className="skeleton" />)}
      </div>
      <div style={{ height: 40, marginBottom: 16, borderRadius: 8 }} className="skeleton" />
      {[0,1,2,3,4,5].map(i => (
        <div key={i} style={{ height: 68, borderRadius: 8, marginBottom: 1 }} className="skeleton" />
      ))}
    </div>
  )

  if (!scan) return (
    <div style={{ padding: 32 }}>
      <EmptyState icon={FileText} title="Scan not found" description="This scan may have been deleted." action={<Link to="/scanner" className="btn-primary" style={{ fontSize: 13 }}>Back to Scanner</Link>} />
    </div>
  )

  return (
    <div style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }} className="animate-fade-in">

      {/* Back */}
      <Link to="/scanner" className="btn-ghost" style={{ fontSize: 12, marginBottom: 20, display: 'inline-flex' }}>
        <ArrowLeft size={12} /> Back to Scanner
      </Link>

      {/* Report header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
        <div>
          <p className="section-header">Scan Report</p>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: -0.5 }}>
            {format(new Date(scan.created_at), 'MMM d, yyyy — h:mm a')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {scan.scanned_articles || 0} articles scanned · {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {score !== null && (
            <div style={{ textAlign: 'center', padding: '10px 16px', borderRadius: 10, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 32, color: healthColor(score), lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: 10, fontFamily: 'Fira Code, monospace', color: 'var(--text-muted)', marginTop: 2 }}>Health score</div>
            </div>
          )}
          <div style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, fontFamily: 'Fira Code, monospace', fontWeight: 600,
            background: scan.status === 'completed' ? 'var(--xbox-subtle)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${scan.status === 'completed' ? 'var(--xbox-border)' : 'rgba(245,158,11,0.3)'}`,
            color: scan.status === 'completed' ? 'var(--xbox)' : 'var(--badge-warning-color)',
          }}>
            {scan.status === 'completed' && <CheckCircle size={11} style={{ display: 'inline', marginRight: 4 }} />}
            {scan.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Articles',   value: articles.length,                                         color: 'var(--text-primary)',         icon: FileText },
          { label: 'Critical',   value: issues.filter(i => i.severity === 'critical').length,    color: 'var(--badge-critical-color)', icon: AlertOctagon },
          { label: 'Warnings',   value: issues.filter(i => i.severity === 'warning').length,     color: 'var(--badge-warning-color)',  icon: AlertTriangle },
          { label: 'Info',       value: issues.filter(i => i.severity === 'info').length,        color: 'var(--badge-info-color)',     icon: Info },
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

      {/* Filters + sort */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterOptions.map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                fontFamily: 'Fira Code, monospace', transition: 'all 0.15s',
                background: filter === key ? 'var(--xbox-subtle)' : 'var(--bg-elevated)',
                border: `1px solid ${filter === key ? 'var(--xbox-border)' : 'var(--border)'}`,
                color: filter === key ? 'var(--xbox)' : 'var(--text-secondary)',
              }}>
              {label} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sort:</span>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="input" style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}>
            <option value="severity">By severity</option>
            <option value="readability">By readability</option>
            <option value="words">By word count</option>
            <option value="updated">By last updated</option>
          </select>
        </div>
      </div>

      {/* Readability legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>Readability:</span>
        {[
          { range: '70–100', label: 'Easy',      color: 'var(--xbox)' },
          { range: '50–69',  label: 'Moderate',  color: 'var(--badge-warning-color)' },
          { range: '30–49',  label: 'Difficult', color: '#f97316' },
          { range: '0–29',   label: 'Very hard', color: 'var(--badge-critical-color)' },
        ].map(({ range, label, color }) => (
          <div key={range} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', color }}>{range}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>
          {filtered.length} article{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Article list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No articles match this filter" />
        ) : (
          filtered.map(a => (
            <ArticleRow
              key={a.id}
              article={a}
              issues={issues.filter(i => i.article_id === a.id)}
              isPaid={isPaid}
            />
          ))
        )}
      </div>
    </div>
  )
}
