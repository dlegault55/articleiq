import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { grammarFix, fullRewrite, getQualityScore } from '@/lib/claude'
import { canUseAI } from '@/lib/stripe'
import {
  AlertOctagon, AlertTriangle, Info, ChevronDown, ChevronUp,
  Wand2, RefreshCcw, Star, ExternalLink, Filter, Loader,
  ArrowLeft, CheckCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const severityIcon = { critical: AlertOctagon, warning: AlertTriangle, info: Info }
const severityColor = { critical: '#FC8181', warning: '#FCD34D', info: '#93C5FD' }

const IssueRow = ({ issue }) => {
  const Icon = severityIcon[issue.severity] || Info
  return (
    <div className="flex items-start gap-3 py-3 px-4 border-b border-border last:border-0 hover:bg-surface-3 transition-colors">
      <Icon size={14} className="flex-shrink-0 mt-0.5" style={{ color: severityColor[issue.severity] }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`badge-${issue.severity}`}>
            <Icon size={9} /> {issue.issue_type.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{issue.description}</p>
      </div>
    </div>
  )
}

const ArticleRow = ({ article, issues, isPaid, onAIAction }) => {
  const [expanded, setExpanded] = useState(false)
  const [aiLoading, setAiLoading] = useState(null)
  const [aiResult, setAiResult] = useState(null)
  const [qualityScore, setQualityScore] = useState(null)

  const critical = issues.filter(i => i.severity === 'critical').length
  const warning = issues.filter(i => i.severity === 'warning').length
  const info = issues.filter(i => i.severity === 'info').length

  const handleAI = async (action) => {
    if (!isPaid) return
    setAiLoading(action)
    setAiResult(null)
    try {
      if (action === 'grammar') {
        const result = await grammarFix(article.title, article.title) // placeholder — real impl fetches body
        setAiResult({ type: 'grammar', content: result })
      } else if (action === 'rewrite') {
        const result = await fullRewrite(article.title, article.title)
        setAiResult({ type: 'rewrite', content: result })
      } else if (action === 'quality') {
        const score = await getQualityScore(article.title, article.title)
        setQualityScore(score)
      }
      onAIAction?.(action)
    } catch (e) {
      setAiResult({ type: 'error', content: e.message })
    } finally {
      setAiLoading(null)
    }
  }

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-3 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {article.title}
            </span>
            {article.url && (
              <a href={article.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0">
                <ExternalLink size={11} style={{ color: 'var(--text-muted)' }} />
              </a>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{article.word_count || 0} words</span>
            <span>Readability: {article.readability_score || 'N/A'}</span>
            {article.last_updated && <span>Updated {formatDistanceToNow(new Date(article.last_updated), { addSuffix: true })}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {critical > 0 && <span className="badge-critical"><AlertOctagon size={9} />{critical}</span>}
          {warning > 0 && <span className="badge-warning"><AlertTriangle size={9} />{warning}</span>}
          {info > 0 && <span className="badge-info"><Info size={9} />{info}</span>}
          {expanded ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 bg-surface-1">
          {/* Issues */}
          {issues.length > 0 ? (
            <div className="rounded-md overflow-hidden mb-4" style={{ border: '1px solid var(--border)' }}>
              {issues.map(i => <IssueRow key={i.id} issue={i} />)}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-3 text-xs mb-4" style={{ color: 'var(--xbox-light)' }}>
              <CheckCircle size={13} /> No issues found for this article
            </div>
          )}

          {/* AI Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono mr-1" style={{ color: 'var(--text-muted)' }}>AI Actions:</span>
            {[
              { key: 'grammar', label: 'Fix Grammar', icon: Wand2 },
              { key: 'rewrite', label: 'Full Rewrite', icon: RefreshCcw },
              { key: 'quality', label: 'Quality Score', icon: Star },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key}
                onClick={() => isPaid ? handleAI(key) : null}
                disabled={!isPaid || aiLoading === key}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all ${
                  isPaid ? 'btn-secondary' : 'opacity-40 cursor-not-allowed'
                }`}
                title={!isPaid ? 'Upgrade to Pro to use AI features' : undefined}>
                {aiLoading === key ? <Loader size={11} className="animate-spin" /> : <Icon size={11} />}
                {label}
                {!isPaid && <span className="px-1 rounded" style={{ background: 'rgba(16,124,16,0.2)', color: 'var(--xbox-light)', fontSize: '8px' }}>PRO</span>}
              </button>
            ))}
          </div>

          {/* AI Result */}
          {(aiResult || qualityScore) && (
            <div className="mt-3 p-3 rounded-md text-xs" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-bright)' }}>
              {aiResult?.type === 'error' && <p style={{ color: '#FC8181' }}>{aiResult.content}</p>}
              {aiResult?.type === 'grammar' && (
                <>
                  <p className="font-mono mb-1" style={{ color: 'var(--xbox-light)' }}>✓ Grammar Fix Applied</p>
                  <p className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{aiResult.content.slice(0, 500)}{aiResult.content.length > 500 ? '...' : ''}</p>
                </>
              )}
              {aiResult?.type === 'rewrite' && (
                <>
                  <p className="font-mono mb-1" style={{ color: 'var(--xbox-light)' }}>✓ Article Rewritten</p>
                  <p className="whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>{aiResult.content.slice(0, 500)}{aiResult.content.length > 500 ? '...' : ''}</p>
                </>
              )}
              {qualityScore && (
                <div>
                  <div className="flex items-center gap-4 mb-2">
                    <span className="font-mono" style={{ color: 'var(--xbox-light)' }}>Quality Score</span>
                    <span className="font-display font-bold text-2xl" style={{ color: qualityScore.overall >= 70 ? 'var(--xbox-light)' : qualityScore.overall >= 40 ? '#FCD34D' : '#FC8181' }}>
                      {qualityScore.overall}<span className="text-sm">/100</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {['clarity', 'completeness', 'structure', 'tone'].map(k => (
                      <div key={k} className="text-center">
                        <div className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{qualityScore[k]}</div>
                        <div style={{ color: 'var(--text-muted)' }}>{k}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ color: 'var(--text-secondary)' }}>{qualityScore.summary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ScanResultsPage() {
  const { scanId } = useParams()
  const { profile } = useAuth()
  const [scan, setScan] = useState(null)
  const [articles, setArticles] = useState([])
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const isPaid = canUseAI(profile?.plan)

  useEffect(() => {
    const load = async () => {
      const { data: scanData } = await supabase.from('scan_jobs').select('*').eq('id', scanId).single()
      setScan(scanData)

      const { data: arts } = await supabase.from('scanned_articles').select('*').eq('scan_job_id', scanId).order('title')
      setArticles(arts || [])

      const { data: iss } = await supabase.from('article_issues').select('*').eq('scan_job_id', scanId)
      setIssues(iss || [])
      setLoading(false)
    }
    load()
  }, [scanId])

  const filteredArticles = articles.filter(a => {
    const artIssues = issues.filter(i => i.article_id === a.id)
    if (filter === 'all') return true
    if (filter === 'issues') return artIssues.length > 0
    return artIssues.some(i => i.severity === filter)
  })

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader size={24} className="animate-spin" style={{ color: 'var(--xbox)' }} />
    </div>
  )

  if (!scan) return (
    <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Scan not found.</div>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <Link to="/scanner" className="btn-ghost text-xs mb-4 inline-flex">
          <ArrowLeft size={12} /> Back to Scanner
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <p className="section-header">Scan Report</p>
            <h1 className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>
              {scan?.created_at ? `Scan — ${new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(scan.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : scanId.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })} ·{' '}
              {scan.scanned_articles || 0} articles scanned
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-mono ${
            scan.status === 'completed' ? 'text-xbox-light bg-xbox/10 border border-xbox/20' :
            scan.status === 'failed' ? 'text-red-400 bg-red-400/10 border border-red-400/20' :
            'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20'
          }`}>
            {scan.status === 'completed' && <CheckCircle size={13} />}
            {scan.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Articles', value: scan.scanned_articles || 0, color: 'var(--text-primary)' },
          { label: 'Critical', value: scan.critical_count || 0, color: '#FC8181' },
          { label: 'Warning', value: scan.warning_count || 0, color: '#FCD34D' },
          { label: 'Info', value: scan.info_count || 0, color: '#93C5FD' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <div className="font-display font-bold text-3xl" style={{ color }}>{value}</div>
            <div className="text-xs font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter size={13} style={{ color: 'var(--text-muted)' }} />
        {['all', 'issues', 'critical', 'warning', 'info'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-mono transition-all ${
              filter === f
                ? 'bg-xbox/15 border border-xbox/30 text-xbox-light'
                : 'bg-surface-3 border border-border hover:border-border-bright'
            }`} style={{ color: filter === f ? undefined : 'var(--text-secondary)' }}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Compact readability legend */}
      <div className="flex items-center gap-3 mb-4 px-1 flex-wrap">
        <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>Readability:</span>
        {[
          { range: '70–100', label: 'Easy',      color: 'var(--xbox)' },
          { range: '50–69',  label: 'Moderate',  color: 'var(--badge-warning-color)' },
          { range: '30–49',  label: 'Difficult', color: '#f97316' },
          { range: '0–29',   label: 'Very hard', color: 'var(--badge-critical-color)' },
        ].map(({ range, label, color }) => (
          <div key={range} className="flex items-center gap-1.5">
            <span className="text-xs font-mono" style={{ color }}>{range}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Articles table */}
      <div className="card">
        {filteredArticles.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            No articles match this filter.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredArticles.map(a => (
              <ArticleRow
                key={a.id}
                article={a}
                issues={issues.filter(i => i.article_id === a.id)}
                isPaid={isPaid}
                onAIAction={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
