import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { grammarFix, fullRewrite, getQualityScore } from '@/lib/claude'
import { canUseAI } from '@/lib/stripe'
import { EmptyState } from '@/components/ui'
import {
  AlertOctagon, AlertTriangle, Info, ChevronDown, ChevronUp,
  Wand2, RefreshCcw, Star, ExternalLink, Loader,
  ArrowLeft, CheckCircle, FileText, Clock, Type, Tag,
  Link2, BookOpen, Copy, Download, ChevronLeft, ChevronRight as ChevronR,
  CheckSquare, Square, Share2, Check
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// ─── Constants ────────────────────────────────────────────────
const PAGE_SIZE = 25

const SEVERITY_COLOR = {
  critical: 'var(--badge-critical-color)',
  warning:  'var(--badge-warning-color)',
  info:     'var(--badge-info-color)',
}

const ISSUE_ICON = {
  low_readability:   BookOpen,
  low_word_count:    Type,
  outdated:          Clock,
  missing_labels:    Tag,
  missing_metadata:  FileText,
  missing_title:     FileText,
  broken_link:       Link2,
  duplicate_content: Copy,
}

// ─── Helpers ──────────────────────────────────────────────────
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

// ─── Export to Excel (SheetJS) ────────────────────────────────
const exportToExcel = async (scan, articles, issues, scanId) => {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')

  const scanDate = format(new Date(scan.created_at), 'MMM d yyyy h:mm a')

  // Summary sheet
  const summaryData = [
    ['ArticleIQ — Scan Report'],
    [''],
    ['Scan Date',     scanDate],
    ['Articles',      articles.length],
    ['Critical',      issues.filter(i => i.severity === 'critical').length],
    ['Warnings',      issues.filter(i => i.severity === 'warning').length],
    ['Info',          issues.filter(i => i.severity === 'info').length],
    ['Health Score',  healthScore(articles, issues) ?? 'N/A'],
  ]

  // Issues sheet
  const issueRows = [
    ['Article Title', 'URL', 'Severity', 'Issue Type', 'Description', 'Word Count', 'Readability', 'Last Updated']
  ]
  for (const article of articles) {
    const artIssues = issues.filter(i => i.article_id === article.id)
    if (artIssues.length === 0) {
      issueRows.push([article.title, article.url || '', 'Clean', '', '', article.word_count || 0, article.readability_score ?? '', article.last_updated ? format(new Date(article.last_updated), 'MMM d yyyy') : ''])
    } else {
      for (const iss of artIssues) {
        issueRows.push([
          article.title,
          article.url || '',
          iss.severity.charAt(0).toUpperCase() + iss.severity.slice(1),
          iss.issue_type.replace(/_/g, ' '),
          iss.description,
          article.word_count || 0,
          article.readability_score ?? '',
          article.last_updated ? format(new Date(article.last_updated), 'MMM d yyyy') : '',
        ])
      }
    }
  }

  const wb = XLSX.utils.book_new()
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  const wsIssues  = XLSX.utils.aoa_to_sheet(issueRows)

  // Column widths
  wsIssues['!cols'] = [{ wch: 50 }, { wch: 40 }, { wch: 10 }, { wch: 22 }, { wch: 60 }, { wch: 12 }, { wch: 12 }, { wch: 16 }]
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 30 }]

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  XLSX.utils.book_append_sheet(wb, wsIssues, 'Issues')

  const filename = `ArticleIQ_Scan_${format(new Date(scan.created_at), 'yyyy-MM-dd_HH-mm')}.xlsx`
  XLSX.writeFile(wb, filename)
}

// ─── ReadabilityPill ──────────────────────────────────────────
const ReadabilityPill = ({ score }) => {
  if (score == null) return <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
  const color = readabilityColor(score)
  return (
    <span style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 4, padding: '1px 6px' }}>
      {score} · {readabilityLabel(score)}
    </span>
  )
}

// ─── IssueChip ────────────────────────────────────────────────
const IssueChip = ({ issue, onResolve, resolved }) => {
  const Icon = ISSUE_ICON[issue.issue_type] || Info
  const color = SEVERITY_COLOR[issue.severity]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
      padding: '8px 10px', borderRadius: 6, marginBottom: 4,
      background: `${color}10`, border: `1px solid ${color}25`,
      opacity: resolved ? 0.45 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
        <Icon size={13} style={{ color, flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color, marginBottom: 2, textDecoration: resolved ? 'line-through' : 'none' }}>
            {issue.issue_type.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{issue.description}</div>
        </div>
      </div>
      <button onClick={() => onResolve(issue.id, !resolved)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: resolved ? 'var(--xbox)' : 'var(--text-muted)', flexShrink: 0, padding: 2, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}
        title={resolved ? 'Mark unresolved' : 'Mark resolved'}>
        {resolved ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>
    </div>
  )
}

// ─── AIPanel ─────────────────────────────────────────────────
const AIPanel = ({ article, isPaid }) => {
  const [loading, setLoading] = useState(null)
  const [result,  setResult]  = useState(null)

  const run = async (action) => {
    if (!isPaid) return
    setLoading(action); setResult(null)
    try {
      if (action === 'grammar')  setResult({ type: 'grammar',  original: article.title, content: await grammarFix(article.title, article.title) })
      if (action === 'rewrite')  setResult({ type: 'rewrite',  original: article.title, content: await fullRewrite(article.title, article.title) })
      if (action === 'quality')  setResult({ type: 'quality',  score:   await getQualityScore(article.title, article.title) })
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
          <button key={key} onClick={() => run(key)}
            disabled={!isPaid || loading === key} className="btn-secondary"
            style={{ fontSize: 11, padding: '4px 10px', opacity: isPaid ? 1 : 0.4, cursor: isPaid ? 'pointer' : 'not-allowed' }}
            title={!isPaid ? 'Upgrade to Pro' : undefined}>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', color: 'var(--xbox)', margin: 0 }}>
                  ✓ {result.type === 'grammar' ? 'Grammar suggestions' : 'Rewrite preview'}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(result.content)}
                  style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Fira Code, monospace' }}>
                  Copy
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'Fira Code, monospace', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Before</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 5, border: '1px solid var(--border)' }}>
                    {result.original?.slice(0, 400)}{result.original?.length > 400 ? '…' : ''}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontFamily: 'Fira Code, monospace', color: 'var(--xbox)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>After</div>
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, padding: '8px 10px', background: 'var(--xbox-subtle)', borderRadius: 5, border: '1px solid var(--xbox-border)' }}>
                    {result.content?.slice(0, 400)}{result.content?.length > 400 ? '…' : ''}
                  </div>
                </div>
              </div>
            </>
          )}
          {result.type === 'quality' && result.score && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 36, color: healthColor(result.score.overall), lineHeight: 1 }}>{result.score.overall}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>/ 100</div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5, flex: 1 }}>{result.score.summary}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {['clarity','completeness','structure','tone'].map(k => (
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

// ─── ArticleRow ───────────────────────────────────────────────
const ArticleRow = ({ article, issues, isPaid, resolvedIssues, resolvedArticles, onResolveIssue, onResolveArticle }) => {
  const [open, setOpen] = useState(false)

  const articleResolved = resolvedArticles.has(article.id)
  const critical = issues.filter(i => i.severity === 'critical')
  const warning  = issues.filter(i => i.severity === 'warning')
  const info     = issues.filter(i => i.severity === 'info')
  const unresolvedIssues = issues.filter(i => !resolvedIssues.has(i.id))

  const leftColor = critical.length ? 'var(--badge-critical-color)' : warning.length ? 'var(--badge-warning-color)' : 'var(--xbox)'

  return (
    <div style={{ borderBottom: '1px solid var(--border)', opacity: articleResolved ? 0.45 : 1 }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', cursor: 'pointer', userSelect: 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, flexShrink: 0, background: leftColor }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: articleResolved ? 'line-through' : 'none' }}>
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

      {open && (
        <div style={{ padding: '4px 20px 16px 36px', background: 'var(--bg-sunken)' }}>
          {/* Mark article resolved */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button onClick={() => onResolveArticle(article.id, !articleResolved)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: articleResolved ? 'var(--xbox)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {articleResolved ? <CheckSquare size={13} /> : <Square size={13} />}
              {articleResolved ? 'Article reviewed' : 'Mark article reviewed'}
            </button>
          </div>

          {issues.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0', color: 'var(--xbox)', fontSize: 12 }}>
              <CheckCircle size={13} /> No issues — this article looks great
            </div>
          ) : (
            <div style={{ marginBottom: 8 }}>
              {issues.map(issue => (
                <IssueChip
                  key={issue.id}
                  issue={issue}
                  resolved={resolvedIssues.has(issue.id)}
                  onResolve={onResolveIssue}
                />
              ))}
            </div>
          )}
          <AIPanel article={article} isPaid={isPaid} />
        </div>
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────
const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="btn-secondary"
        style={{ padding: '5px 10px', opacity: page === 1 ? 0.4 : 1 }}>
        <ChevronLeft size={14} />
      </button>
      {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
        let p
        if (totalPages <= 7) p = i + 1
        else if (page <= 4) p = i + 1
        else if (page >= totalPages - 3) p = totalPages - 6 + i
        else p = page - 3 + i
        return (
          <button key={p} onClick={() => onChange(p)}
            style={{ width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: page === p ? 700 : 400,
              background: page === p ? 'var(--xbox)' : 'var(--bg-elevated)',
              color: page === p ? '#fff' : 'var(--text-secondary)',
              outline: '1px solid var(--border)',
            }}>
            {p}
          </button>
        )
      })}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className="btn-secondary"
        style={{ padding: '5px 10px', opacity: page === totalPages ? 0.4 : 1 }}>
        <ChevronR size={14} />
      </button>
      <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
        Page {page} of {totalPages}
      </span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────
export default function ScanResultsPage() {
  const { scanId }  = useParams()
  const { profile } = useAuth()
  const isPaid      = canUseAI(profile?.plan)

  const [scan,     setScan]     = useState(null)
  const [articles, setArticles] = useState([])
  const [issues,   setIssues]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [exporting,setExporting]= useState(false)
  const [sharing,  setSharing]   = useState(false)
  const [shared,   setShared]    = useState(false)

  // Resolved state (persisted to Supabase)
  const [resolvedIssues,   setResolvedIssues]   = useState(new Set())
  const [resolvedArticles, setResolvedArticles] = useState(new Set())

  // UI state
  const [filter, setFilter] = useState('all')
  const [sort,   setSort]   = useState('severity')
  const [page,   setPage]   = useState(1)

  // Initial load + resolved state handled by polling effect below

  // Poll while scan is still running
  useEffect(() => {
    if (!scanId) return
    let intervalRef = null

    const poll = async () => {
      const [{ data: s }, { data: a }, { data: i }] = await Promise.all([
        supabase.from('scan_jobs').select('*').eq('id', scanId).single(),
        supabase.from('scanned_articles').select('*').eq('scan_job_id', scanId),
        supabase.from('article_issues').select('*').eq('scan_job_id', scanId),
      ])
      if (s) setScan(s)
      if (a) setArticles(a)
      if (i) {
        setIssues(i)
        setResolvedIssues(new Set(i.filter(x => x.resolved).map(x => x.id)))
      }
      // Return true if still running
      return s?.status === 'running' || s?.status === 'pending'
    }

    // Drive chunks — browser calls API sequentially page by page
    const runChunks = async (scanJobId, connectorId, userId, preset) => {
      if (!scanJobId || !connectorId || !userId) return
      let page = 1
      let done = false
      while (!done) {
        try {
          const res = await fetch('/api/scan-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scanJobId, connectorId, userId, preset, page }),
          })
          if (!res.ok) break
          const data = await res.json()
          if (data.done || data.cancelled || !data.hasMore) done = true
          else page = data.nextPage || page + 1
        } catch (e) {
          console.error('Chunk error:', e)
          break
        }
      }
    }

    const start = async () => {
      // First poll to get scan details
      const { data: s } = await supabase.from('scan_jobs').select('*').eq('id', scanId).single()

      if (s) {
        setScan(s)
        setLoading(false)

        if (s.status === 'pending' || s.status === 'running') {
          // Get connector info to drive chunks
          const { data: connector } = await supabase
            .from('zendesk_connectors')
            .select('id')
            .eq('user_id', s.user_id)
            .eq('is_active', true)
            .limit(1)
            .single()

          if (connector && s.status === 'pending') {
            runChunks(scanId, connector.id, s.user_id, s.preset || 'standard')
          }

          // Poll for progress
          intervalRef = setInterval(async () => {
            const stillGoing = await poll()
            if (!stillGoing) clearInterval(intervalRef)
          }, 2000)
        } else {
          await poll()
        }
      } else {
        setLoading(false)
      }
    }

    start()
    return () => { if (intervalRef) clearInterval(intervalRef) }
  }, [scanId])

  // Mark issue resolved
  const resolveIssue = useCallback(async (issueId, resolved) => {
    await supabase.from('article_issues').update({ resolved, resolved_at: resolved ? new Date().toISOString() : null }).eq('id', issueId)
    setResolvedIssues(prev => {
      const next = new Set(prev)
      resolved ? next.add(issueId) : next.delete(issueId)
      return next
    })
  }, [])

  // Mark article reviewed (we store this as a local Set for now — could persist to a separate table)
  const resolveArticle = useCallback((articleId, resolved) => {
    setResolvedArticles(prev => {
      const next = new Set(prev)
      resolved ? next.add(articleId) : next.delete(articleId)
      return next
    })
  }, [])

  const score = healthScore(articles, issues)

  // Filter articles
  const filtered = articles
    .filter(a => {
      const ai = issues.filter(i => i.article_id === a.id)
      const unresolvedIssues = ai.filter(i => !resolvedIssues.has(i.id))
      const isArticleResolved = resolvedArticles.has(a.id)

      if (filter === 'resolved') return isArticleResolved || (ai.length > 0 && ai.every(i => resolvedIssues.has(i.id)))
      if (filter === 'all')      return !isArticleResolved
      if (filter === 'clean')    return !isArticleResolved && ai.length === 0
      if (filter === 'issues')   return !isArticleResolved && unresolvedIssues.length > 0
      if (filter === 'critical') return !isArticleResolved && unresolvedIssues.some(i => i.severity === 'critical')
      if (filter === 'warning')  return !isArticleResolved && unresolvedIssues.some(i => i.severity === 'warning')
      return true
    })
    .sort((a, b) => {
      const ai = issues.filter(i => i.article_id === a.id).filter(i => !resolvedIssues.has(i.id))
      const bi = issues.filter(i => i.article_id === b.id).filter(i => !resolvedIssues.has(i.id))
      if (sort === 'severity') {
        const sev = (x) => x.some(i => i.severity === 'critical') ? 0 : x.some(i => i.severity === 'warning') ? 1 : x.length ? 2 : 3
        return sev(ai) - sev(bi)
      }
      if (sort === 'readability') return (a.readability_score || 0) - (b.readability_score || 0)
      if (sort === 'words')       return (a.word_count || 0) - (b.word_count || 0)
      if (sort === 'updated')     return new Date(a.last_updated || 0) - new Date(b.last_updated || 0)
      return 0
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Reset page when filter changes
  useEffect(() => setPage(1), [filter, sort])

  const filterOptions = [
    { key: 'all',      label: 'All',        count: articles.filter(a => !resolvedArticles.has(a.id)).length },
    { key: 'issues',   label: 'Has issues', count: articles.filter(a => !resolvedArticles.has(a.id) && issues.some(i => i.article_id === a.id && !resolvedIssues.has(i.id))).length },
    { key: 'critical', label: 'Critical',   count: articles.filter(a => !resolvedArticles.has(a.id) && issues.some(i => i.article_id === a.id && i.severity === 'critical' && !resolvedIssues.has(i.id))).length },
    { key: 'warning',  label: 'Warning',    count: articles.filter(a => !resolvedArticles.has(a.id) && issues.some(i => i.article_id === a.id && i.severity === 'warning' && !resolvedIssues.has(i.id))).length },
    { key: 'clean',    label: 'Clean',      count: articles.filter(a => !resolvedArticles.has(a.id) && !issues.some(i => i.article_id === a.id)).length },
    { key: 'resolved', label: 'Resolved',   count: articles.filter(a => resolvedArticles.has(a.id) || (issues.filter(i => i.article_id === a.id).length > 0 && issues.filter(i => i.article_id === a.id).every(i => resolvedIssues.has(i.id)))).length },
  ]

  const handleExport = async () => {
    setExporting(true)
    try { await exportToExcel(scan, articles, issues, scanId) }
    catch (e) { console.error('Export failed:', e) }
    finally { setExporting(false) }
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      await supabase.from('scan_jobs').update({ is_shared: true, shared_at: new Date().toISOString() }).eq('id', scanId)
      const url = `${window.location.origin}/share/${scanId}`
      await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 3000)
    } catch (e) {
      console.error('Share failed:', e)
    } finally {
      setSharing(false)
    }
  }

  if (loading) return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }} className="animate-fade-in">
      {[0,1,2,3].map(i => <div key={i} style={{ height: 68, borderRadius: 8, marginBottom: 8 }} className="skeleton" />)}
    </div>
  )

  if (!scan) return (
    <div style={{ padding: 32 }}>
      <EmptyState icon={FileText} title="Scan not found" description="This scan may have been deleted."
        action={<Link to="/scanner" className="btn-primary" style={{ fontSize: 13 }}>Back to Scanner</Link>} />
    </div>
  )

  return (
    <div style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }} className="animate-fade-in">

      {/* Back + export */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Link to="/scanner" className="btn-ghost" style={{ fontSize: 12 }}>
          <ArrowLeft size={12} /> Back to Scanner
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleShare} disabled={sharing} className="btn-secondary" style={{ fontSize: 12 }}>
            {sharing ? <Loader size={13} className="animate-spin" /> : shared ? <Check size={13} /> : <Share2 size={13} />}
            {shared ? 'Link copied!' : 'Share report'}
          </button>
          <button onClick={handleExport} disabled={exporting} className="btn-secondary" style={{ fontSize: 12 }}>
            {exporting ? <Loader size={13} className="animate-spin" /> : <Download size={13} />}
            {exporting ? 'Exporting...' : 'Export to Excel'}
          </button>
        </div>
      </div>

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

      {/* Live progress banner — shown while scan is running */}
      {(scan.status === 'running' || scan.status === 'pending') && (
        <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 9, background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--xbox)', boxShadow: '0 0 6px var(--xbox)', animation: 'aiq-pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--xbox)', margin: 0 }}>Scan in progress</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                {scan.scanned_articles || 0} of {scan.total_articles || '?'} articles analyzed — keep this tab open
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 120, height: 4, borderRadius: 2, background: 'var(--bg-overlay)', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--xbox)', borderRadius: 2, transition: 'width 1s ease', width: scan.total_articles ? `${Math.round((scan.scanned_articles / scan.total_articles) * 100)}%` : '0%' }} />
              </div>
              <span style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', color: 'var(--xbox)', minWidth: 32 }}>
                {scan.total_articles ? `${Math.round((scan.scanned_articles / scan.total_articles) * 100)}%` : '...'}
              </span>
            </div>
            <button
              onClick={async () => {
                await supabase.from('scan_jobs').update({ status: 'failed', error_message: 'Cancelled by user', completed_at: new Date().toISOString() }).eq('id', scanId)
                setScan(s => ({ ...s, status: 'failed' }))
              }}
              className="btn-ghost"
              style={{ fontSize: 12, color: 'var(--badge-critical-color)', padding: '4px 10px', flexShrink: 0 }}>
              Stop scan
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes aiq-pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Articles', value: articles.length,                                       color: 'var(--text-primary)',         icon: FileText },
          { label: 'Critical', value: issues.filter(i => i.severity === 'critical').length,  color: 'var(--badge-critical-color)', icon: AlertOctagon },
          { label: 'Warnings', value: issues.filter(i => i.severity === 'warning').length,   color: 'var(--badge-warning-color)',  icon: AlertTriangle },
          { label: 'Resolved', value: resolvedIssues.size + resolvedArticles.size,           color: 'var(--xbox)',                 icon: CheckSquare },
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
              style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'Fira Code, monospace', transition: 'all 0.15s',
                background: filter === key ? 'var(--xbox-subtle)' : 'var(--bg-elevated)',
                border: `1px solid ${filter === key ? 'var(--xbox-border)' : 'var(--border)'}`,
                color: filter === key ? 'var(--xbox)' : 'var(--text-secondary)',
              }}>
              {label} <span style={{ opacity: 0.6 }}>({count})</span>
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="input" style={{ padding: '4px 28px 4px 8px', fontSize: 12, width: 'auto' }}>
          <option value="severity">By severity</option>
          <option value="readability">By readability</option>
          <option value="words">By word count</option>
          <option value="updated">By last updated</option>
        </select>
      </div>

      {/* Readability legend + count */}
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
          {filtered.length} article{filtered.length !== 1 ? 's' : ''} · page {page} of {Math.max(1, totalPages)}
        </span>
      </div>

      {/* Article list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {paginated.length === 0 ? (
          <EmptyState icon={CheckCircle} title="No articles match this filter" />
        ) : (
          paginated.map(a => (
            <ArticleRow
              key={a.id}
              article={a}
              issues={issues.filter(i => i.article_id === a.id)}
              isPaid={isPaid}
              resolvedIssues={resolvedIssues}
              resolvedArticles={resolvedArticles}
              onResolveIssue={resolveIssue}
              onResolveArticle={resolveArticle}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
