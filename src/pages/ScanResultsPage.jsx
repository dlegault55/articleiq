import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { supabase } from '@/lib/supabase'
import {
  AlertOctagon, AlertTriangle, Info, CheckCircle, ArrowLeft, X,
  ChevronDown, ChevronUp, ExternalLink, Download, Share2, Check,
  ChevronLeft, ChevronRight, Square, CheckSquare,
  Loader, Wand2, RefreshCcw, Star, BookOpen, Type, Clock, Tag,
  FileText, Link2, Zap, Target
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const PAGE_SIZE = 25
const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const ISSUE_ICONS = {
  low_readability:   BookOpen,
  low_word_count:    Type,
  outdated:          Clock,
  missing_labels:    Tag,
  missing_section:   FileText,
  missing_metadata:  FileText,
  broken_link:       Link2,
  duplicate_content: CheckSquare,
  missing_title:     FileText,
}

const calcHealth = (articles, issues) => {
  if (!articles?.length) return null
  const penalty = (issues.filter(i=>i.severity==='critical').length * 3 + issues.filter(i=>i.severity==='warning').length + issues.filter(i=>i.severity==='info').length * 0.2) / articles.length
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}
const healthColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'
const healthLabel = (s) => s >= 80 ? 'Healthy' : s >= 60 ? 'Needs attention' : 'Critical'

const readColor = (s) => {
  if (s == null) return 'var(--text-3)'
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

// ─── Claude API ────────────────────────────────────────────────
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
  return (await res.json()).content[0]?.text || ''
}

// ─── Excel export ──────────────────────────────────────────────
const exportExcel = async (scan, articles, issues) => {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs')
  const rows = [['Title', 'URL', 'Severity', 'Issue', 'Description', 'Words', 'Readability', 'Last Updated']]
  for (const a of articles) {
    const ai = issues.filter(i => i.article_id === a.id)
    if (!ai.length) {
      rows.push([a.title, a.url||'', 'Clean', '', '', a.word_count||0, a.readability_score??'', a.last_updated ? format(new Date(a.last_updated), 'MMM d yyyy') : ''])
    } else {
      for (const i of ai) {
        rows.push([a.title, a.url||'', i.severity, i.issue_type.replace(/_/g,' '), i.description, a.word_count||0, a.readability_score??'', a.last_updated ? format(new Date(a.last_updated), 'MMM d yyyy') : ''])
      }
    }
  }
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{wch:50},{wch:40},{wch:10},{wch:22},{wch:60},{wch:8},{wch:12},{wch:14}]
  XLSX.utils.book_append_sheet(wb, ws, 'Issues')
  XLSX.writeFile(wb, `ArticleIQ_${format(new Date(scan.created_at), 'yyyy-MM-dd')}.xlsx`)
}

// ─── AI Drawer ─────────────────────────────────────────────────
function AIDrawer({ article, connector, action, onClose }) {
  const [loading,  setLoading]  = useState(true)
  const [body,     setBody]     = useState('')
  const [result,   setResult]   = useState('')
  const [copying,  setCopying]  = useState(false)
  const [error,    setError]    = useState(null)

  // Fetch article body from Zendesk then run AI
  useEffect(() => {
    if (!article || !connector || !action) return
    const run = async () => {
      setLoading(true); setError(null)
      try {
        // Fetch article body from Zendesk
        const authHeader = `Basic ${btoa(connector.api_key_encrypted)}`
        const res = await fetch(
          `https://${connector.subdomain}.zendesk.com/api/v2/help_center/articles/${article.zendesk_article_id}`,
          { headers: { Authorization: authHeader } }
        )
        const rawBody = res.ok ? ((await res.json()).article?.body || '') : ''
        // Strip HTML for display
        const plain = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        setBody(plain || article.title)

        // Run AI on the content
        let aiResult = ''
        if (action === 'grammar') {
          aiResult = await callClaude(
            'You are a professional editor. Fix all grammar, spelling, punctuation, and clarity issues in this knowledge base article. Preserve the meaning and structure exactly. Return only the corrected text with no commentary.',
            plain || article.title,
            2048
          )
        } else if (action === 'rewrite') {
          aiResult = await callClaude(
            'You are a technical writer specializing in customer support content. Rewrite this knowledge base article to be clearer, more concise, and easier to follow. Use simple language, active voice, and short sentences. Preserve all the information. Return only the rewritten text with no commentary.',
            plain || article.title,
            2048
          )
        }
        setResult(aiResult)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [article?.id, action])

  const copy = async () => {
    await navigator.clipboard.writeText(result)
    setCopying(true)
    setTimeout(() => setCopying(false), 2000)
  }

  const actionLabel = action === 'grammar' ? 'Grammar Fix' : 'Rewrite'

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, animation:'fade-in 0.2s ease' }} />

      {/* Drawer */}
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'min(820px, 90vw)', background:'var(--bg-card)', zIndex:201, display:'flex', flexDirection:'column', boxShadow:'-8px 0 40px rgba(0,0,0,0.15)', animation:'slide-in 0.25s ease' }}>
        <style>{`@keyframes slide-in { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

        {/* Header */}
        <div style={{ padding:'16px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg, #0A5A0A, #107C10)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {action === 'grammar' ? <Wand2 size={15} color="white" /> : <RefreshCcw size={15} color="white" />}
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>AI {actionLabel}</p>
              <p style={{ fontSize:12, color:'var(--text-3)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:400 }}>{article.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm"><X size={16} /></button>
        </div>

        {loading ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
            <Loader size={24} style={{ color:'var(--green)', animation:'spin 0.7s linear infinite' }} />
            <p style={{ fontSize:13, color:'var(--text-3)' }}>Fetching article and running AI...</p>
          </div>
        ) : error ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32 }}>
            <div style={{ textAlign:'center' }}>
              <p style={{ color:'var(--red)', marginBottom:12 }}>{error}</p>
              <button onClick={onClose} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        ) : (
          <>
            {/* Before / After columns */}
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden' }}>
              {/* Before */}
              <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border)', overflow:'hidden' }}>
                <div style={{ padding:'12px 20px', background:'var(--bg)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)' }}>Before</span>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:'20px', fontSize:13, color:'var(--text-2)', lineHeight:1.8 }}>
                  {body}
                </div>
              </div>

              {/* After */}
              <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ padding:'12px 20px', background:'var(--green-light)', borderBottom:'1px solid var(--green-border)', flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--green)' }}>After · AI {actionLabel}</span>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:'20px', fontSize:13, color:'var(--text)', lineHeight:1.8 }}>
                  {result}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div style={{ padding:'14px 24px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'var(--bg)' }}>
              <p style={{ fontSize:12, color:'var(--text-3)', margin:0 }}>
                Copy the improved text and paste it into Zendesk
              </p>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={onClose} className="btn btn-secondary btn-sm">Close</button>
                <button onClick={copy} className="btn btn-primary btn-sm">
                  {copying ? <><Check size={13} /> Copied!</> : <><CheckSquare size={13} /> Copy improved text</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ─── AI Panel ──────────────────────────────────────────────────
function AIPanel({ article, isPaid, connector, onOpenDrawer }) {
  const [loading, setLoading] = useState(null)
  const [result,  setResult]  = useState(null)

  const runQuality = async () => {
    if (!isPaid) return
    setLoading('quality'); setResult(null)
    try {
      const raw = await callClaude(
        'Evaluate this knowledge base article title. Return JSON only: {"score": 0-100, "verdict": "one sentence", "suggestions": ["s1","s2","s3"]}',
        `Article title: ${article.title}`, 512
      )
      setResult({ type: 'quality', data: JSON.parse(raw.replace(/```json|```/g,'').trim()) })
    } catch (e) {
      setResult({ type: 'error', message: e.message })
    } finally { setLoading(null) }
  }

  if (!isPaid) {
    return (
      <div style={{ marginTop:12, padding:'14px 16px', borderRadius:10, background:'linear-gradient(135deg, #0A5A0A 0%, #107C10 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-10, right:-10, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <Zap size={14} style={{ color:'#FFD93D' }} />
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>AI Analysis</span>
          <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:100, background:'#FFD93D', color:'#0A1A0A' }}>Pro</span>
        </div>
        <p style={{ fontSize:12, color:'rgba(255,255,255,0.7)', margin:'0 0 10px', lineHeight:1.5 }}>
          Fix grammar, rewrite unclear content, and score quality — powered by Claude.
        </p>
        <button className="btn btn-sm" style={{ background:'#FFD93D', color:'#0A1A0A', fontWeight:700, fontSize:12 }}>
          <Zap size={12} /> Upgrade to Pro
        </button>
      </div>
    )
  }

  return (
    <div style={{ marginTop:12, padding:'14px 16px', borderRadius:10, background:'linear-gradient(135deg, #0A5A0A 0%, #107C10 100%)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <Zap size={13} style={{ color:'#FFD93D' }} />
        <span style={{ fontSize:12, fontWeight:700, color:'white' }}>AI Analysis</span>
        <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:100, background:'rgba(255,255,255,0.2)', color:'white' }}>Pro</span>
      </div>
      <div style={{ display:'flex', gap:6, marginBottom: result ? 12 : 0 }}>
        {/* Grammar + Rewrite open the drawer */}
        <button onClick={() => onOpenDrawer('grammar')} disabled={!!loading}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:'rgba(255,255,255,0.15)', color:'white' }}>
          <Wand2 size={11} /> Fix Grammar
          <span style={{ fontSize:9, opacity:0.7 }}>↗</span>
        </button>
        <button onClick={() => onOpenDrawer('rewrite')} disabled={!!loading}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, background:'rgba(255,255,255,0.15)', color:'white' }}>
          <RefreshCcw size={11} /> Rewrite
          <span style={{ fontSize:9, opacity:0.7 }}>↗</span>
        </button>
        {/* Quality score stays inline */}
        <button onClick={runQuality} disabled={!!loading}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 10px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
            background: loading==='quality' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)', color:'white' }}>
          {loading==='quality' ? <Loader size={11} style={{ animation:'spin 0.7s linear infinite' }} /> : <Star size={11} />}
          Quality Score
        </button>
      </div>

      {result?.type === 'quality' && result.data && (
        <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:8, padding:'12px', marginTop:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:10 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:36, fontWeight:800, color:'white', lineHeight:1 }}>{result.data.score}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>/100</div>
            </div>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.85)', margin:0, flex:1 }}>{result.data.verdict}</p>
          </div>
          {result.data.suggestions?.map((s,i) => (
            <div key={i} style={{ fontSize:12, color:'rgba(255,255,255,0.7)', display:'flex', gap:6, marginBottom:4 }}>
              <span style={{ color:'#FFD93D', flexShrink:0 }}>→</span>{s}
            </div>
          ))}
        </div>
      )}
      {result?.type === 'error' && (
        <p style={{ fontSize:12, color:'#FFD93D', margin:'8px 0 0' }}>{result.message}</p>
      )}
    </div>
  )
}

// ─── Article row ───────────────────────────────────────────────
function ArticleRow({ article, issues, isPaid, connector, onOpenDrawer, resolvedIssues, resolvedArticles, onResolveIssue, onResolveArticle }) {
  const [open, setOpen] = useState(false)

  const activeIssues   = issues.filter(i => !resolvedIssues.has(i.id))
  const critical       = activeIssues.filter(i => i.severity === 'critical')
  const warning        = activeIssues.filter(i => i.severity === 'warning')
  const artResolved    = resolvedArticles.has(article.id)
  const allResolved    = issues.length > 0 && issues.every(i => resolvedIssues.has(i.id))
  const clean          = issues.length === 0

  const barColor = critical.length ? 'var(--red)' : warning.length ? 'var(--amber)' : (allResolved || clean) ? 'var(--green)' : 'var(--border-md)'

  return (
    <div style={{ borderBottom:'1px solid var(--border)', opacity: artResolved ? 0.45 : 1 }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 20px', cursor:'pointer', transition:'background 0.1s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

        {/* Severity bar */}
        <div style={{ width:3, alignSelf:'stretch', borderRadius:2, background:barColor, flexShrink:0 }} />

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              textDecoration: artResolved ? 'line-through' : 'none' }}>
              {article.title}
            </span>
            {article.url && (
              <a href={article.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                style={{ color:'var(--text-3)', display:'flex', flexShrink:0 }}>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>{article.word_count||0} words</span>
            {article.last_updated && (
              <span style={{ fontSize:11, color:'var(--text-3)' }}>
                Updated {formatDistanceToNow(new Date(article.last_updated), { addSuffix:true })}
              </span>
            )}
            {article.readability_score != null && (
              <span style={{ fontSize:11, fontWeight:600, color:readColor(article.readability_score), background:`${readColor(article.readability_score)}18`, padding:'1px 6px', borderRadius:4 }}>
                {article.readability_score} · {readLabel(article.readability_score)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {critical.length > 0 && <span className="badge badge-critical"><AlertOctagon size={9} />{critical.length}</span>}
          {warning.length  > 0 && <span className="badge badge-warning"><AlertTriangle size={9} />{warning.length}</span>}
          {(clean || allResolved) && <CheckCircle size={14} style={{ color:'var(--green)' }} />}
          {open ? <ChevronUp size={13} style={{ color:'var(--text-3)' }} /> : <ChevronDown size={13} style={{ color:'var(--text-3)' }} />}
        </div>
      </div>

      {open && (
        <div style={{ padding:'4px 20px 16px 36px', background:'var(--bg)' }}>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
            <button onClick={() => onResolveArticle(article.id, !artResolved)}
              style={{ display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:500, color: artResolved ? 'var(--green)' : 'var(--text-3)' }}>
              {artResolved ? <CheckSquare size={13} /> : <Square size={13} />}
              {artResolved ? 'Reviewed ✓' : 'Mark as reviewed'}
            </button>
          </div>

          {issues.length === 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--green)', fontSize:13, padding:'6px 0' }}>
              <CheckCircle size={14} /> No issues found — this article looks good
            </div>
          )}

          {[...issues.filter(i=>i.severity==='critical'), ...issues.filter(i=>i.severity==='warning'), ...issues.filter(i=>i.severity==='info')].map(issue => {
            const Icon = ISSUE_ICONS[issue.issue_type] || Info
            const resolved = resolvedIssues.has(issue.id)
            const colors = {
              critical: { bg:'var(--red-light)',   border:'var(--red-border)',   color:'var(--red)'   },
              warning:  { bg:'var(--amber-light)', border:'var(--amber-border)', color:'var(--amber)' },
              info:     { bg:'var(--blue-light)',  border:'var(--blue-border)',  color:'var(--blue)'  },
            }
            const c = colors[issue.severity]
            return (
              <div key={issue.id} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, padding:'10px 12px', borderRadius:8, marginBottom:6,
                background:c.bg, border:`1px solid ${c.border}`, opacity: resolved ? 0.4 : 1 }}>
                <div style={{ display:'flex', gap:8, flex:1 }}>
                  <Icon size={13} style={{ color:c.color, flexShrink:0, marginTop:1 }} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:c.color, marginBottom:2, textDecoration: resolved ? 'line-through' : 'none' }}>
                      {issue.issue_type.replace(/_/g,' ')}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5 }}>{issue.description}</div>
                  </div>
                </div>
                <button onClick={() => onResolveIssue(issue.id, !resolved)}
                  title={resolved ? 'Mark unresolved' : 'Mark resolved'}
                  style={{ background:'none', border:'none', cursor:'pointer', color: resolved ? c.color : 'var(--text-3)', flexShrink:0, padding:2, display:'flex' }}>
                  {resolved ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>
              </div>
            )
          })}

          <AIPanel article={article} isPaid={isPaid} connector={connector} onOpenDrawer={onOpenDrawer} />
        </div>
      )}
    </div>
  )
}

// ─── Pagination ────────────────────────────────────────────────
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = []
  let start = Math.max(1, page - 2)
  let end   = Math.min(totalPages, start + 4)
  start = Math.max(1, end - 4)
  for (let p = start; p <= end; p++) pages.push(p)

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'20px 0' }}>
      <button onClick={() => onChange(page-1)} disabled={page===1} className="btn btn-secondary btn-sm"><ChevronLeft size={14} /></button>
      {pages.map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{ width:32, height:32, borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight: page===p ? 700 : 400,
            background: page===p ? 'var(--green)' : 'var(--bg-card)', color: page===p ? 'white' : 'var(--text-2)' }}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page+1)} disabled={page===totalPages} className="btn btn-secondary btn-sm"><ChevronRight size={14} /></button>
      <span style={{ fontSize:12, color:'var(--text-3)', marginLeft:4 }}>Page {page} of {totalPages}</span>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────
export default function ScanResultsPage() {
  const { id: scanId } = useParams()
  const { profile }    = useAuth()
  const { resumeScan } = useScan()

  const [scan,     setScan]     = useState(null)
  const [articles, setArticles] = useState([])
  const [issues,   setIssues]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('all')
  const [sort,     setSort]     = useState('severity')
  const [page,     setPage]     = useState(1)
  const [exporting,setExporting]= useState(false)
  const [shared,   setShared]   = useState(false)
  const [resolvedIssues,   setResolvedIssues]   = useState(new Set())
  const [resolvedArticles, setResolvedArticles] = useState(new Set())
  const [drawer,           setDrawer]           = useState(null) // { article, action }
  const [connector,        setConnector]        = useState(null)
  const intervalRef = useRef(null)

  const isPaid = profile?.plan === 'paid'

  // Load connector for AI drawer
  useEffect(() => {
    if (!scan?.user_id) return
    supabase.from('zendesk_connectors').select('*').eq('user_id', scan.user_id).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).single()
      .then(({ data }) => setConnector(data || null))
  }, [scan?.user_id])

  const fetchAll = useCallback(async () => {
    const [{ data:s }, { data:a }, { data:i }] = await Promise.all([
      supabase.from('scan_jobs').select('*').eq('id', scanId).single(),
      supabase.from('scanned_articles').select('*').eq('scan_job_id', scanId),
      supabase.from('article_issues').select('*').eq('scan_job_id', scanId),
    ])
    if (s) setScan(s)
    if (a) setArticles(a)
    if (i) { setIssues(i); setResolvedIssues(new Set(i.filter(x=>x.resolved).map(x=>x.id))) }
    return s?.status === 'running' || s?.status === 'pending'
  }, [scanId])

  useEffect(() => {
    const init = async () => {
      const running = await fetchAll()
      setLoading(false)
      if (running) {
        intervalRef.current = setInterval(async () => {
          const still = await fetchAll()
          if (!still) clearInterval(intervalRef.current)
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
    await supabase.from('scan_jobs').update({ is_shared:true, shared_at:new Date().toISOString() }).eq('id', scanId)
    await navigator.clipboard.writeText(`${window.location.origin}/share/${scanId}`)
    setShared(true); setTimeout(() => setShared(false), 3000)
  }

  const score    = calcHealth(articles, issues)
  const isActive = scan?.status === 'running' || scan?.status === 'pending'
  const isStalled = isActive && scan?.last_activity &&
    (Date.now() - new Date(scan.last_activity).getTime()) > 3 * 60 * 1000
  const pct = scan?.total_articles ? Math.round((scan.scanned_articles / scan.total_articles) * 100) : 0

  const filterOpts = [
    { key:'all',      label:'All',         count: articles.length },
    { key:'issues',   label:'Has issues',  count: articles.filter(a => !resolvedArticles.has(a.id) && issues.some(i=>i.article_id===a.id && !resolvedIssues.has(i.id))).length },
    { key:'critical', label:'Critical',    count: articles.filter(a => issues.some(i=>i.article_id===a.id && i.severity==='critical' && !resolvedIssues.has(i.id))).length },
    { key:'clean',    label:'Clean',       count: articles.filter(a => !issues.some(i=>i.article_id===a.id)).length },
    { key:'resolved', label:'Resolved',    count: articles.filter(a => resolvedArticles.has(a.id) || (issues.some(i=>i.article_id===a.id) && issues.filter(i=>i.article_id===a.id).every(i=>resolvedIssues.has(i.id)))).length },
  ]

  const filtered = articles
    .filter(a => {
      const ai    = issues.filter(i => i.article_id===a.id)
      const unrec = ai.filter(i => !resolvedIssues.has(i.id))
      const artRes = resolvedArticles.has(a.id) || (ai.length > 0 && ai.every(i=>resolvedIssues.has(i.id)))
      if (filter==='resolved') return artRes
      if (artRes) return false
      if (filter==='all')      return true
      if (filter==='issues')   return unrec.length > 0
      if (filter==='critical') return unrec.some(i=>i.severity==='critical')
      if (filter==='clean')    return ai.length === 0
      return true
    })
    .sort((a, b) => {
      const ai = issues.filter(i=>i.article_id===a.id && !resolvedIssues.has(i.id))
      const bi = issues.filter(i=>i.article_id===b.id && !resolvedIssues.has(i.id))
      if (sort==='severity') {
        const sev = x => x.some(i=>i.severity==='critical') ? 0 : x.some(i=>i.severity==='warning') ? 1 : x.length ? 2 : 3
        return sev(ai) - sev(bi)
      }
      if (sort==='readability') return (a.readability_score||0) - (b.readability_score||0)
      if (sort==='words')       return (a.word_count||0) - (b.word_count||0)
      return 0
    })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
      <div style={{ textAlign:'center' }}>
        <Loader size={22} style={{ color:'var(--green)', animation:'spin 0.7s linear infinite', marginBottom:10 }} />
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Loading report...</p>
      </div>
    </div>
  )

  if (!scan) return (
    <div style={{ maxWidth:600, margin:'80px auto', textAlign:'center', padding:'0 24px' }}>
      <p style={{ color:'var(--text-3)', marginBottom:16 }}>Scan not found</p>
      <Link to="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
    </div>
  )

  return (
    <div style={{ maxWidth:960, margin:'0 auto', padding:'24px' }}>
      <style>{`@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}`}</style>

      {/* Back + actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ gap:5 }}>
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={handleShare} className="btn btn-secondary btn-sm">
            {shared ? <Check size={13} /> : <Share2 size={13} />}
            {shared ? 'Link copied!' : 'Share report'}
          </button>
          <button onClick={() => { setExporting(true); exportExcel(scan, articles, issues).finally(() => setExporting(false)) }}
            disabled={exporting} className="btn btn-secondary btn-sm">
            {exporting ? <Loader size={13} style={{ animation:'spin 0.7s linear infinite' }} /> : <Download size={13} />}
            Export
          </button>
        </div>
      </div>

      {/* Progress banner */}
      {isActive && (
        <div className="card animate-in" style={{ marginBottom:16, overflow:'hidden',
          borderColor: isStalled ? 'var(--amber-border)' : 'var(--green-border)',
          background: isStalled ? 'var(--amber-light)' : 'var(--green-light)' }}>
          {isStalled && (
            <div style={{ padding:'10px 20px', borderBottom:'1px solid var(--amber-border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--amber)' }}>Scan appears stalled — no activity for 3+ minutes</span>
              <button onClick={() => resumeScan(scan)} className="btn btn-primary btn-sm">Resume scan</button>
            </div>
          )}
          <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              {!isStalled && <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', animation:'pulse-dot 1.5s ease-in-out infinite' }} />}
              <div>
                <p style={{ fontSize:14, fontWeight:700, color: isStalled ? 'var(--amber)' : 'var(--green)', margin:0 }}>
                  {isStalled ? 'Scan paused' : 'Scan in progress'}
                </p>
                <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>
                  {scan.scanned_articles||0} of {scan.total_articles||'?'} articles · {!isStalled && 'keep this tab open'}
                </p>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:22, fontWeight:800, color: isStalled ? 'var(--amber)' : 'var(--green)' }}>
                {scan.total_articles ? `${pct}%` : '...'}
              </span>
              <button onClick={async () => {
                await supabase.from('scan_jobs').update({ status:'failed', error_message:'Cancelled', completed_at:new Date().toISOString() }).eq('id', scanId)
                setScan(s => ({ ...s, status:'failed' }))
              }} className="btn btn-ghost btn-sm" style={{ color:'var(--red)', fontSize:12 }}>Stop</button>
            </div>
          </div>
          <div className="progress-track" style={{ borderRadius:0, height:4 }}>
            <div className="progress-fill" style={{ width:`${Math.max(pct,1)}%`, background: isStalled ? 'var(--amber)' : 'var(--green)' }} />
          </div>
        </div>
      )}

      {/* Hero health score */}
      <div style={{ borderRadius:'var(--radius-xl)', background:'var(--green)', padding:'24px 28px', marginBottom:16, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:28, alignItems:'center' }}>
          <div>
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', marginBottom:4 }}>
              Scan Report · {format(new Date(scan.created_at), 'MMM d, yyyy')}
            </p>
            {score !== null && !isActive ? (
              <>
                <div style={{ fontSize:80, fontWeight:800, color:'white', lineHeight:1, letterSpacing:-3 }}>{score}</div>
                <div style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.85)', marginTop:4 }}>{healthLabel(score)}</div>
              </>
            ) : (
              <div style={{ fontSize:48, fontWeight:800, color:'rgba(255,255,255,0.3)', lineHeight:1, letterSpacing:-2 }}>
                {isActive ? `${pct}%` : '—'}
              </div>
            )}
          </div>
          <div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12 }}>
              {issues.filter(i=>i.severity==='critical').length > 0 && (
                <div style={{ padding:'6px 14px', borderRadius:100, background:'#FF4444', color:'white', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                  <AlertOctagon size={12} /> {issues.filter(i=>i.severity==='critical').length} Critical
                </div>
              )}
              {issues.filter(i=>i.severity==='warning').length > 0 && (
                <div style={{ padding:'6px 14px', borderRadius:100, background:'#FFD93D', color:'#1A1A00', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                  <AlertTriangle size={12} /> {issues.filter(i=>i.severity==='warning').length} Warnings
                </div>
              )}
              <div style={{ padding:'6px 14px', borderRadius:100, background:'rgba(255,255,255,0.2)', color:'white', fontSize:13, fontWeight:500 }}>
                {articles.length} articles
              </div>
              {scan.preset && (
                <div style={{ padding:'6px 14px', borderRadius:100, background:'rgba(255,255,255,0.15)', color:'white', fontSize:12, fontWeight:600 }}>
                  {scan.preset.split(',').length} checks
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              {score !== null && score < 80 && (
                <div style={{ padding:'8px 14px', borderRadius:8, background:'rgba(255,255,255,0.12)', fontSize:12, color:'rgba(255,255,255,0.85)', display:'flex', alignItems:'center', gap:6 }}>
                  <Target size={12} /> {80-score} points to Healthy
                </div>
              )}
              <div style={{ padding:'8px 14px', borderRadius:8, background:'rgba(255,255,255,0.12)', fontSize:12, color:'rgba(255,255,255,0.85)' }}>
                {formatDistanceToNow(new Date(scan.created_at), { addSuffix:true })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + sort */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.7)', borderRadius:100, padding:4, border:'1px solid var(--border-md)', flexWrap:'wrap' }}>
          {filterOpts.map(({ key, label, count }) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{ padding:'5px 14px', borderRadius:100, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', transition:'all 0.15s',
                background: filter===key ? 'var(--green)' : 'transparent',
                color: filter===key ? 'white' : 'var(--text-2)',
              }}>
              {label} <span style={{ opacity:0.7 }}>({count})</span>
            </button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="input"
          style={{ width:'auto', padding:'6px 10px', fontSize:13 }}>
          <option value="severity">Sort by severity</option>
          <option value="readability">Sort by readability</option>
          <option value="words">Sort by word count</option>
        </select>
      </div>

      {/* Article count + readability legend */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, flexWrap:'wrap', gap:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Readability:</span>
          {[['70+','Easy','var(--green)'],['50–69','Moderate','var(--amber)'],['30–49','Difficult','#ea580c'],['<30','Very hard','var(--red)']].map(([range,label,color]) => (
            <div key={range} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:11, fontWeight:600, color, fontFamily:'monospace' }}>{range}</span>
              <span style={{ fontSize:11, color:'var(--text-3)' }}>{label}</span>
            </div>
          ))}
        </div>
        <span style={{ fontSize:11, color:'var(--text-3)' }}>{filtered.length} articles</span>
      </div>

      {/* Article list */}
      <div className="card" style={{ overflow:'hidden', marginBottom:16 }}>
        {paginated.length === 0 ? (
          <div style={{ padding:48, textAlign:'center' }}>
            <CheckCircle size={28} style={{ color:'var(--green)', marginBottom:10 }} />
            <p style={{ fontSize:14, color:'var(--text-3)' }}>No articles match this filter</p>
          </div>
        ) : paginated.map(a => (
          <ArticleRow key={a.id} article={a}
            issues={issues.filter(i=>i.article_id===a.id)}
            isPaid={isPaid}
            connector={connector}
            onOpenDrawer={(action) => setDrawer({ article: a, action })}
            resolvedIssues={resolvedIssues}
            resolvedArticles={resolvedArticles}
            onResolveIssue={resolveIssue}
            onResolveArticle={resolveArticle}
          />
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={p => { setPage(p); window.scrollTo(0,0) }} />

      {/* AI Drawer */}
      {drawer && (
        <AIDrawer
          article={drawer.article}
          connector={connector}
          action={drawer.action}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  )
}
