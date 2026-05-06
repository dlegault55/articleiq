import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { supabase } from '@/lib/supabase'
import {
  AlertOctagon, AlertTriangle, Info, CheckCircle, ArrowLeft,
  ChevronDown, ChevronUp, ExternalLink, Download, Share2, Check,
  ChevronLeft, ChevronRight as ChevronR, Copy, Square, CheckSquare,
  Loader, Wand2, RefreshCcw, Star, BookOpen, Type, Clock, Tag,
  FileText, Link2, Zap
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// ─── Constants ─────────────────────────────────────────────────
const PAGE_SIZE = 25
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const ISSUE_ICONS = {
  low_readability:   BookOpen,
  low_word_count:    Type,
  outdated:          Clock,
  missing_labels:    Tag,
  missing_metadata:  FileText,
  broken_link:       Link2,
  duplicate_content: Copy,
  missing_title:     FileText,
}

const SEVERITY_STYLE = {
  critical: { bg: 'var(--red-light)',   border: 'var(--red-border)',   color: 'var(--red)',   badge: 'badge-critical' },
  warning:  { bg: 'var(--amber-light)', border: 'var(--amber-border)', color: 'var(--amber)', badge: 'badge-warning'  },
  info:     { bg: 'var(--blue-light)',  border: 'var(--blue-border)',  color: 'var(--blue)',  badge: 'badge-info'     },
}

// ─── Health score ──────────────────────────────────────────────
const calcHealth = (articles, issues) => {
  if (!articles?.length) return null
  const total    = articles.length
  const critical = issues.filter(i => i.severity === 'critical').length
  const warning  = issues.filter(i => i.severity === 'warning').length
  const info     = issues.filter(i => i.severity === 'info').length
  const penalty  = (critical * 3 + warning + info * 0.2) / total
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}

const healthColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'

// ─── Readability ───────────────────────────────────────────────
const readColor = (s) => {
  if (s == null) return 'var(--text-muted)'
  if (s >= 70) return 'var(--green)'
  if (s >= 50) return 'var(--amber)'
  if (s >= 30) return '#ea580c'
  return 'var(--red)'
}
const readLabel = (s) => {
  if (s == null) return '—'
  if (s >= 70) return 'Easy'
  if (s >= 50) return 'Moderate'
  if (s >= 30) return 'Difficult'
  return 'Very hard'
}

// ─── AI helper ─────────────────────────────────────────────────
const callClaude = async (system, user, maxTokens = 1024) => {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  return data.content[0]?.text || ''
}

// ─── Export ────────────────────────────────────────────────────
const exportExcel = async (scan, articles, issues) => {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
  const rows = [['Title', 'URL', 'Severity', 'Issue Type', 'Description', 'Word Count', 'Readability', 'Last Updated']]
  for (const a of articles) {
    const ai = issues.filter(i => i.article_id === a.id)
    if (!ai.length) {
      rows.push([a.title, a.url || '', 'Clean', '', '', a.word_count || 0, a.readability_score ?? '', a.last_updated ? format(new Date(a.last_updated), 'MMM d yyyy') : ''])
    } else {
      for (const i of ai) {
        rows.push([a.title, a.url || '', i.severity, i.issue_type.replace(/_/g, ' '), i.description, a.word_count || 0, a.readability_score ?? '', a.last_updated ? format(new Date(a.last_updated), 'MMM d yyyy') : ''])
      }
    }
  }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 50 }, { wch: 40 }, { wch: 10 }, { wch: 22 }, { wch: 60 }, { wch: 12 }, { wch: 12 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Issues')
  XLSX.writeFile(wb, `ArticleIQ_${format(new Date(scan.created_at), 'yyyy-MM-dd')}.xlsx`)
}

// ─── AI Panel ──────────────────────────────────────────────────
function AIPanel({ article, isPaid }) {
  const [loading, setLoading] = useState(null)
  const [result,  setResult]  = useState(null)

  const run = async (action) => {
    if (!isPaid) return
    setLoading(action); setResult(null)
    try {
      if (action === 'grammar') {
        const fixed = await callClaude(
          'You are a professional editor. Fix grammar, spelling, and clarity in this article title. Return ONLY the corrected title, nothing else.',
          `Article title: ${article.title}`
        )
        setResult({ type: 'grammar', original: article.title, fixed })
      } else if (action === 'rewrite') {
        const fixed = await callClaude(
          'You are a technical writer. Rewrite this article title to be clearer and more helpful. Return ONLY the rewritten title.',
          `Article title: ${article.title}`
        )
        setResult({ type: 'rewrite', original: article.title, fixed })
      } else if (action === 'quality') {
        const raw = await callClaude(
          'Evaluate this knowledge base article title. Return JSON only: {"score": 0-100, "verdict": "one sentence", "issues": ["issue1","issue2"], "suggestions": ["s1","s2"]}',
          `Article title: ${article.title}`,
          512
        )
        setResult({ type: 'quality', data: JSON.parse(raw.replace(/```json|```/g, '').trim()) })
      }
    } catch (e) {
      setResult({ type: 'error', message: e.message })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: result ? 12 : 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI</span>
        {[
          { key: 'grammar', label: 'Fix Grammar', icon: Wand2 },
          { key: 'rewrite', label: 'Rewrite',     icon: RefreshCcw },
          { key: 'quality', label: 'Quality Score', icon: Star },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => run(key)} disabled={!isPaid || !!loading}
            className="btn btn-secondary btn-sm"
            style={{ opacity: isPaid ? 1 : 0.5, cursor: isPaid ? 'pointer' : 'not-allowed' }}
            title={!isPaid ? 'Upgrade to Pro to use AI features' : undefined}>
            {loading === key ? <Loader size={12} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Icon size={12} />}
            {label}
            {!isPaid && <Zap size={10} style={{ color: 'var(--amber)' }} />}
          </button>
        ))}
      </div>

      {result && (
        <div style={{ padding: '12px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
          {result.type === 'error' && <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{result.message}</p>}

          {(result.type === 'grammar' || result.type === 'rewrite') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <p style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Before</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 6, border: '1px solid var(--border)' }}>{result.original}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, fontFamily: 'DM Mono', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 4 }}>After</p>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0, padding: '8px 10px', background: 'var(--green-light)', borderRadius: 6, border: '1px solid var(--green-border)' }}>{result.fixed}</p>
              </div>
            </div>
          )}

          {result.type === 'quality' && result.data && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'DM Mono', color: healthColor(result.data.score), lineHeight: 1 }}>{result.data.score}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>/100</div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, flex: 1 }}>{result.data.verdict}</p>
              </div>
              {result.data.suggestions?.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Suggestions</p>
                  {result.data.suggestions.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, marginBottom: 4 }}>
                      <span style={{ color: 'var(--green)', flexShrink: 0 }}>→</span> {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Article row ───────────────────────────────────────────────
function ArticleRow({ article, issues, isPaid, resolvedIssues, resolvedArticles, onResolveIssue, onResolveArticle }) {
  const [open, setOpen] = useState(false)

  const critical = issues.filter(i => i.severity === 'critical' && !resolvedIssues.has(i.id))
  const warning  = issues.filter(i => i.severity === 'warning'  && !resolvedIssues.has(i.id))
  const info     = issues.filter(i => i.severity === 'info'     && !resolvedIssues.has(i.id))
  const artResolved = resolvedArticles.has(article.id)
  const allResolved = issues.length > 0 && issues.every(i => resolvedIssues.has(i.id))
  const clean = issues.length === 0

  const leftColor = critical.length ? 'var(--red)' : warning.length ? 'var(--amber)' : allResolved || clean ? 'var(--green)' : 'var(--border-dark)'

  return (
    <div style={{ borderBottom: '1px solid var(--border)', opacity: artResolved ? 0.4 : 1 }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', cursor: 'pointer', userSelect: 'none', transition: 'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: leftColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: artResolved ? 'line-through' : 'none' }}>
              {article.title}
            </span>
            {article.url && (
              <a href={article.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, color: 'var(--text-muted)', display: 'flex' }}>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
          <div style={{ display: 'flex', align: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{article.word_count || 0} words</span>
            {article.last_updated && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated {formatDistanceToNow(new Date(article.last_updated), { addSuffix: true })}</span>}
            {article.readability_score != null && (
              <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: readColor(article.readability_score), background: `${readColor(article.readability_score)}15`, padding: '0 5px', borderRadius: 4 }}>
                {article.readability_score} · {readLabel(article.readability_score)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {critical.length > 0 && <span className="badge badge-critical"><AlertOctagon size={10} />{critical.length}</span>}
          {warning.length  > 0 && <span className="badge badge-warning"><AlertTriangle size={10} />{warning.length}</span>}
          {info.length     > 0 && <span className="badge badge-info"><Info size={10} />{info.length}</span>}
          {(clean || allResolved) && <CheckCircle size={14} style={{ color: 'var(--green)' }} />}
          {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {open && (
        <div style={{ padding: '8px 20px 16px 36px', background: 'var(--bg)' }}>
          {/* Mark article reviewed */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button onClick={() => onResolveArticle(article.id, !artResolved)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: artResolved ? 'var(--green)' : 'var(--text-muted)' }}>
              {artResolved ? <CheckSquare size={13} /> : <Square size={13} />}
              {artResolved ? 'Article reviewed ✓' : 'Mark as reviewed'}
            </button>
          </div>

          {/* Issues */}
          {issues.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--green)', fontSize: 13, padding: '6px 0' }}>
              <CheckCircle size={14} /> No issues found
            </div>
          )}
          {[...issues.filter(i => i.severity === 'critical'), ...issues.filter(i => i.severity === 'warning'), ...issues.filter(i => i.severity === 'info')].map(issue => {
            const s = SEVERITY_STYLE[issue.severity]
            const Icon = ISSUE_ICONS[issue.issue_type] || Info
            const resolved = resolvedIssues.has(issue.id)
            return (
              <div key={issue.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 7, marginBottom: 5, background: s.bg, border: `1px solid ${s.border}`, opacity: resolved ? 0.45 : 1 }}>
                <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 0 }}>
                  <Icon size={13} style={{ color: s.color, flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: s.color, marginBottom: 2, textDecoration: resolved ? 'line-through' : 'none' }}>
                      {issue.issue_type.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{issue.description}</div>
                  </div>
                </div>
                <button onClick={() => onResolveIssue(issue.id, !resolved)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: resolved ? s.color : 'var(--text-muted)', flexShrink: 0, padding: 2, display: 'flex' }}
                  title={resolved ? 'Mark unresolved' : 'Mark resolved'}>
                  {resolved ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>
              </div>
            )
          })}

          <AIPanel article={article} isPaid={isPaid} />
        </div>
      )}
    </div>
  )
}

// ─── Pagination ────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 20 }}>
      <button onClick={() => onChange(page - 1)} disabled={page === 1} className="btn btn-secondary btn-sm"><ChevronLeft size={14} /></button>
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        let p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i
        return (
          <button key={p} onClick={() => onChange(p)}
            style={{ width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: page === p ? 700 : 400,
              background: page === p ? 'var(--green)' : 'var(--bg-card)',
              color: page === p ? 'white' : 'var(--text-secondary)',
              boxShadow: 'var(--shadow-sm)',
            }}>{p}</button>
        )
      })}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages} className="btn btn-secondary btn-sm"><ChevronR size={14} /></button>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────
export default function ScanResultsPage() {
  const { id: scanId } = useParams()
  const { profile } = useAuth()
  const { resumeScan } = useScan()

  const [scan,     setScan]     = useState(null)
  const [articles, setArticles] = useState([])
  const [issues,   setIssues]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [sort,     setSort]     = useState('severity')
  const [page,     setPage]     = useState(1)
  const [exporting,setExporting]= useState(false)
  const [sharing,  setSharing]  = useState(false)
  const [shared,   setShared]   = useState(false)
  const [resolvedIssues,   setResolvedIssues]   = useState(new Set())
  const [resolvedArticles, setResolvedArticles] = useState(new Set())

  const isPaid = profile?.plan === 'paid'
  const intervalRef = useRef(null)

  const fetchAll = useCallback(async () => {
    const [{ data: s }, { data: a }, { data: i }] = await Promise.all([
      supabase.from('scan_jobs').select('*').eq('id', scanId).single(),
      supabase.from('scanned_articles').select('*').eq('scan_job_id', scanId),
      supabase.from('article_issues').select('*').eq('scan_job_id', scanId),
    ])
    if (s) setScan(s)
    if (a) setArticles(a)
    if (i) { setIssues(i); setResolvedIssues(new Set(i.filter(x => x.resolved).map(x => x.id))) }
    return s?.status === 'running' || s?.status === 'pending'
  }, [scanId])

  useEffect(() => {
    const init = async () => {
      const running = await fetchAll()
      setLoading(false)
      if (running) {
        intervalRef.current = setInterval(async () => {
          const stillRunning = await fetchAll()
          if (!stillRunning) clearInterval(intervalRef.current)
        }, 3000)
      }
    }
    init()
    return () => clearInterval(intervalRef.current)
  }, [scanId])

  useEffect(() => setPage(1), [filter, sort])

  const resolveIssue = async (issueId, resolved) => {
    await supabase.from('article_issues').update({ resolved, resolved_at: resolved ? new Date().toISOString() : null }).eq('id', issueId)
    setResolvedIssues(prev => { const n = new Set(prev); resolved ? n.add(issueId) : n.delete(issueId); return n })
  }

  const resolveArticle = (articleId, resolved) => {
    setResolvedArticles(prev => { const n = new Set(prev); resolved ? n.add(articleId) : n.delete(articleId); return n })
  }

  const handleShare = async () => {
    setSharing(true)
    await supabase.from('scan_jobs').update({ is_shared: true, shared_at: new Date().toISOString() }).eq('id', scanId)
    await navigator.clipboard.writeText(`${window.location.origin}/share/${scanId}`)
    setShared(true); setTimeout(() => setShared(false), 3000)
    setSharing(false)
  }

  const score = calcHealth(articles, issues)

  const filterOpts = [
    { key: 'all',      label: 'All',        count: articles.filter(a => !resolvedArticles.has(a.id)).length },
    { key: 'issues',   label: 'Has issues', count: articles.filter(a => !resolvedArticles.has(a.id) && issues.some(i => i.article_id === a.id && !resolvedIssues.has(i.id))).length },
    { key: 'critical', label: 'Critical',   count: articles.filter(a => !resolvedArticles.has(a.id) && issues.some(i => i.article_id === a.id && i.severity === 'critical' && !resolvedIssues.has(i.id))).length },
    { key: 'clean',    label: 'Clean',      count: articles.filter(a => !resolvedArticles.has(a.id) && !issues.some(i => i.article_id === a.id)).length },
    { key: 'resolved', label: 'Resolved',   count: articles.filter(a => resolvedArticles.has(a.id) || (issues.some(i => i.article_id === a.id) && issues.filter(i => i.article_id === a.id).every(i => resolvedIssues.has(i.id)))).length },
  ]

  const filtered = articles
    .filter(a => {
      const ai = issues.filter(i => i.article_id === a.id)
      const unresolved = ai.filter(i => !resolvedIssues.has(i.id))
      const artRes = resolvedArticles.has(a.id)
      if (filter === 'resolved') return artRes || (ai.length > 0 && ai.every(i => resolvedIssues.has(i.id)))
      if (artRes) return false
      if (filter === 'all')      return true
      if (filter === 'issues')   return unresolved.length > 0
      if (filter === 'critical') return unresolved.some(i => i.severity === 'critical')
      if (filter === 'clean')    return ai.length === 0
      return true
    })
    .sort((a, b) => {
      const ai = issues.filter(i => i.article_id === a.id && !resolvedIssues.has(i.id))
      const bi = issues.filter(i => i.article_id === b.id && !resolvedIssues.has(i.id))
      if (sort === 'severity') {
        const sev = x => x.some(i => i.severity === 'critical') ? 0 : x.some(i => i.severity === 'warning') ? 1 : x.length ? 2 : 3
        return sev(ai) - sev(bi)
      }
      if (sort === 'readability') return (a.readability_score || 0) - (b.readability_score || 0)
      if (sort === 'words')       return (a.word_count || 0) - (b.word_count || 0)
      return 0
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <Loader size={20} style={{ color: 'var(--green)', animation: 'spin 0.7s linear infinite', marginBottom: 10 }} />
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading report...</p>
      </div>
    </div>
  )

  if (!scan) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <p style={{ color: 'var(--text-muted)' }}>Scan not found</p>
      <Link to="/dashboard" className="btn btn-primary" style={{ marginTop: 16 }}>Back to Dashboard</Link>
    </div>
  )

  // Stall detection
  const lastActivity = scan.last_activity ? new Date(scan.last_activity) : new Date(scan.created_at)
  const isRunning = scan.status === 'running' || scan.status === 'pending'
  const isStalled = isRunning && (Date.now() - lastActivity.getTime()) > 3 * 60 * 1000

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px" }}>
      {/* Back + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Link to="/dashboard" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Back</Link>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleShare} disabled={sharing} className="btn btn-secondary btn-sm">
            {sharing ? <Loader size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : shared ? <Check size={13} /> : <Share2 size={13} />}
            {shared ? 'Copied!' : 'Share'}
          </button>
          <button onClick={() => { setExporting(true); exportExcel(scan, articles, issues).finally(() => setExporting(false)) }} disabled={exporting} className="btn btn-secondary btn-sm">
            {exporting ? <Loader size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Download size={13} />}
            Export
          </button>
        </div>
      </div>

      {/* Progress banner */}
      {isRunning && (
        <div className="card animate-in" style={{ marginBottom: 20, overflow: 'hidden', borderColor: isStalled ? 'var(--amber-border)' : 'var(--green-border)', background: isStalled ? 'var(--amber-light)' : 'var(--green-light)' }}>
          {isStalled && (
            <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--amber-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)' }}>Scan appears stalled — no recent activity</span>
              <button onClick={() => resumeScan(scan)} className="btn btn-primary btn-sm">Resume scan</button>
            </div>
          )}
          <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {!isStalled && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />}
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: isStalled ? 'var(--amber)' : 'var(--green)', margin: 0 }}>{isStalled ? 'Scan paused' : 'Scan in progress'}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  {scan.scanned_articles || 0} of {scan.total_articles || '?'} articles · {!isStalled && 'keep this tab open'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'DM Mono', color: isStalled ? 'var(--amber)' : 'var(--green)' }}>
                {scan.total_articles ? `${Math.round((scan.scanned_articles / scan.total_articles) * 100)}%` : '...'}
              </span>
              <button onClick={async () => {
                await supabase.from('scan_jobs').update({ status: 'failed', error_message: 'Cancelled', completed_at: new Date().toISOString() }).eq('id', scanId)
                setScan(s => ({ ...s, status: 'failed' }))
              }} className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}>Stop</button>
            </div>
          </div>
          <div className="progress-track" style={{ borderRadius: 0, height: 4 }}>
            <div className="progress-fill" style={{ width: scan.total_articles ? `${Math.round((scan.scanned_articles / scan.total_articles) * 100)}%` : '2%', background: isStalled ? 'var(--amber)' : 'var(--green)' }} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 24 }}>
        <div>
          <p className="section-label">Scan Report</p>
          <h1 style={{ fontFamily: "Plus Jakarta Sans, sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{format(new Date(scan.created_at), "MMM d, yyyy — h:mm a")}</h1>
          <p style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            {articles.length} articles
            {scan.preset && <span style={{ fontSize: 11, fontFamily: 'DM Mono', padding: '1px 7px', background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 10 }}>{scan.preset}</span>}
            · {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
          </p>
        </div>
        {score !== null && !isRunning && (
          <div style={{ textAlign: 'center', padding: '12px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: 40, fontWeight: 700, fontFamily: 'DM Mono', color: healthColor(score), lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'DM Mono', marginTop: 2 }}>Health score</div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Articles',  value: articles.length,                                       color: 'var(--text-primary)', bg: 'var(--bg-card)',     border: 'var(--border)',        icon: FileText },
          { label: 'Critical',  value: issues.filter(i => i.severity === 'critical').length,  color: 'var(--red)',          bg: 'var(--red-light)',   border: 'var(--red-border)',    icon: AlertOctagon },
          { label: 'Warnings',  value: issues.filter(i => i.severity === 'warning').length,   color: 'var(--amber)',        bg: 'var(--amber-light)', border: 'var(--amber-border)', icon: AlertTriangle },
          { label: 'Resolved',  value: resolvedIssues.size + resolvedArticles.size,           color: 'var(--green)',        bg: 'var(--green-light)', border: 'var(--green-border)', icon: CheckSquare },
        ].map(({ label, value, color, bg, border, icon: Icon }) => (
          <div key={label} style={{ padding: '14px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Icon size={16} style={{ color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'DM Mono', color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color, opacity: 0.7, marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + sort */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filterOpts.map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={filter === key ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}>
              {label} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input" style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}>
          <option value="severity">By severity</option>
          <option value="readability">By readability</option>
          <option value="words">By word count</option>
        </select>
      </div>

      {/* Readability legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>Readability:</span>
        {[['70–100', 'Easy', 'var(--green)'], ['50–69', 'Moderate', 'var(--amber)'], ['30–49', 'Difficult', '#ea580c'], ['0–29', 'Very hard', 'var(--red)']].map(([range, label, color]) => (
          <div key={range} style={{ display: 'flex', gap: 4 }}>
            <span style={{ fontSize: 11, fontFamily: 'DM Mono', color }}>{range}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'DM Mono', color: 'var(--text-muted)' }}>
          {filtered.length} articles · page {page} of {Math.max(1, totalPages)}
        </span>
      </div>

      {/* Article list */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 16 }}>
        {paginated.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <CheckCircle size={28} style={{ color: 'var(--green)', marginBottom: 10 }} />
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No articles match this filter</p>
          </div>
        ) : paginated.map(a => (
          <ArticleRow
            key={a.id} article={a}
            issues={issues.filter(i => i.article_id === a.id)}
            isPaid={isPaid}
            resolvedIssues={resolvedIssues}
            resolvedArticles={resolvedArticles}
            onResolveIssue={resolveIssue}
            onResolveArticle={resolveArticle}
          />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}
