import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { AlertOctagon, AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp, ExternalLink, Scan, BookOpen, Type, Clock, Tag, FileText, Link2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const ISSUE_ICONS = {
  low_readability: BookOpen, low_word_count: Type, outdated: Clock,
  missing_labels: Tag, missing_section: FileText, broken_link: Link2,
  duplicate_content: CheckCircle, missing_title: FileText,
}

const calcHealth = (articles, issues) => {
  if (!articles?.length) return null
  const penalty = (issues.filter(i=>i.severity==='critical').length*3 + issues.filter(i=>i.severity==='warning').length + issues.filter(i=>i.severity==='info').length*0.2) / articles.length
  return Math.max(0, Math.min(100, Math.round(100 - penalty*20)))
}
const healthColor = s => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'
const healthLabel = s => s >= 80 ? 'Healthy' : s >= 60 ? 'Needs attention' : 'Critical'
const readColor = s => { if (s==null) return 'var(--text-3)'; if (s>=70) return 'var(--green)'; if (s>=50) return 'var(--amber)'; if (s>=30) return '#ea580c'; return 'var(--red)' }
const readLabel = s => { if (s==null) return '—'; if (s>=70) return 'Easy'; if (s>=50) return 'Moderate'; if (s>=30) return 'Difficult'; return 'Very hard' }

function ArticleRow({ article, issues }) {
  const [open, setOpen] = useState(false)
  const critical = issues.filter(i=>i.severity==='critical')
  const warning  = issues.filter(i=>i.severity==='warning')
  const clean    = issues.length === 0
  const barColor = critical.length ? 'var(--red)' : warning.length ? 'var(--amber)' : clean ? 'var(--green)' : 'var(--border-md)'

  const SEVERITY = {
    critical: { bg:'#FEF2F2', border:'#FECACA', color:'var(--red)',   label:'Critical' },
    warning:  { bg:'#FFFBEB', border:'#FDE68A', color:'var(--amber)', label:'Warning'  },
    info:     { bg:'#EFF6FF', border:'#BFDBFE', color:'var(--blue)',  label:'Info'     },
  }

  return (
    <div style={{ borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 20px', cursor:'pointer', transition:'background 0.1s' }}
        onClick={() => setOpen(v=>!v)}
        onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background='transparent'}>
        <div style={{ width:3, alignSelf:'stretch', borderRadius:2, background:barColor, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <span style={{ fontSize:15, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{article.title}</span>
            {article.url && <a href={article.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{ color:'var(--text-3)', display:'flex', flexShrink:0 }}><ExternalLink size={12} /></a>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>{article.word_count||0} words</span>
            {article.last_updated && <span style={{ fontSize:11, color:'var(--text-3)' }}>Updated {formatDistanceToNow(new Date(article.last_updated), { addSuffix:true })}</span>}
            {article.readability_score != null && (
              <span style={{ fontSize:11, fontWeight:600, color:readColor(article.readability_score), background:`${readColor(article.readability_score)}18`, padding:'1px 6px', borderRadius:4 }}>
                Readability {article.readability_score} · {readLabel(article.readability_score)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {critical.length > 0 && <span className="badge badge-critical"><AlertOctagon size={9}/>{critical.length}</span>}
          {warning.length  > 0 && <span className="badge badge-warning"><AlertTriangle size={9}/>{warning.length}</span>}
          {clean && <span className="badge badge-success"><CheckCircle size={9}/>Clean</span>}
          {open ? <ChevronUp size={13} style={{ color:'var(--text-3)' }}/> : <ChevronDown size={13} style={{ color:'var(--text-3)' }}/>}
        </div>
      </div>
      {open && (
        <div style={{ padding:'8px 20px 16px 36px', background:'var(--bg)', borderTop:'1px solid var(--border)', borderLeft:'4px solid var(--border-md)', margin:'0 16px 8px', borderRadius:'0 0 8px 8px' }}>
          {issues.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px', borderRadius:8, background:'var(--green-light)', border:'1px solid var(--green-border)' }}>
              <CheckCircle size={14} style={{ color:'var(--green)' }}/> <span style={{ fontSize:13, color:'var(--green)', fontWeight:600 }}>No issues found</span>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[...issues.filter(i=>i.severity==='critical'), ...issues.filter(i=>i.severity==='warning'), ...issues.filter(i=>i.severity==='info')].map(issue => {
                const Icon = ISSUE_ICONS[issue.issue_type] || Info
                const s = SEVERITY[issue.severity] || SEVERITY.info
                return (
                  <div key={issue.id} style={{ borderRadius:8, border:`1px solid ${s.border}`, background:s.bg, padding:'12px 14px', display:'flex', alignItems:'flex-start', gap:10 }}>
                    <div style={{ width:30, height:30, borderRadius:7, background:'white', border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon size={14} style={{ color:s.color }}/>
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:s.color, marginBottom:3, textTransform:'capitalize' }}>{issue.issue_type.replace(/_/g,' ')} · {s.label}</div>
                      <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6 }}>{issue.description}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SharePage() {
  const { id: scanId } = useParams()
  const [scan,     setScan]     = useState(null)
  const [articles, setArticles] = useState([])
  const [issues,   setIssues]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from('scan_jobs').select('*').eq('id', scanId).eq('is_shared', true).single()
      if (!s) { setNotFound(true); setLoading(false); return }
      setScan(s)
      const [{ data: a }, { data: i }] = await Promise.all([
        supabase.from('scanned_articles').select('*').eq('scan_job_id', scanId),
        supabase.from('article_issues').select('*').eq('scan_job_id', scanId),
      ])
      setArticles(a || [])
      setIssues(i || [])
      setLoading(false)
    }
    load()
  }, [scanId])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      <p style={{ color:'var(--text-3)', fontSize:14 }}>Loading report...</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:8 }}>Report not found</p>
        <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:20 }}>This report may have been removed or the link is incorrect.</p>
        <Link to="/" className="btn btn-primary">Go to ArticleIQ</Link>
      </div>
    </div>
  )

  const score = calcHealth(articles, issues)
  const filterOpts = [
    { key:'all',      label:'All',        count: articles.length },
    { key:'issues',   label:'Has issues', count: articles.filter(a=>issues.some(i=>i.article_id===a.id)).length },
    { key:'critical', label:'Critical',   count: articles.filter(a=>issues.some(i=>i.article_id===a.id&&i.severity==='critical')).length },
    { key:'clean',    label:'Clean',      count: articles.filter(a=>!issues.some(i=>i.article_id===a.id)).length },
  ]
  const filtered = articles.filter(a => {
    const ai = issues.filter(i=>i.article_id===a.id)
    if (filter==='all')      return true
    if (filter==='issues')   return ai.length > 0
    if (filter==='critical') return ai.some(i=>i.severity==='critical')
    if (filter==='clean')    return ai.length === 0
    return true
  })

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background:'white', borderBottom:'1px solid var(--border)', padding:'14px 32px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:26, height:26, background:'var(--green)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={14} color="white"/>
          </div>
          <span style={{ fontWeight:800, fontSize:15, color:'var(--text)', letterSpacing:-0.3 }}>Article<span style={{ color:'var(--green)' }}>IQ</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:12, color:'var(--text-3)', padding:'4px 10px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:100 }}>Read-only report</span>
          <Link to="/login" className="btn btn-primary btn-sm">Sign in</Link>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'28px 24px' }}>
        {/* Hero */}
        <div style={{ borderRadius:'var(--radius-xl)', background:'var(--green)', padding:'24px 28px', marginBottom:16, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }}/>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:6 }}>
            Knowledge Base Health Report · Shared {formatDistanceToNow(new Date(scan.created_at), { addSuffix:true })}
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:28, alignItems:'center' }}>
            <div>
              <div style={{ fontSize:80, fontWeight:800, color:'white', lineHeight:1, letterSpacing:-3 }}>{score ?? '—'}</div>
              {score != null && <div style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.85)', marginTop:4 }}>{healthLabel(score)}</div>}
            </div>
            <div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                {issues.filter(i=>i.severity==='critical').length > 0 && <div style={{ padding:'5px 12px', borderRadius:100, background:'#FF4444', color:'white', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><AlertOctagon size={11}/> {issues.filter(i=>i.severity==='critical').length} Critical</div>}
                {issues.filter(i=>i.severity==='warning').length  > 0 && <div style={{ padding:'5px 12px', borderRadius:100, background:'#FFD93D', color:'#1A1A00', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><AlertTriangle size={11}/> {issues.filter(i=>i.severity==='warning').length} Warnings</div>}
                <div style={{ padding:'5px 12px', borderRadius:100, background:'rgba(255,255,255,0.2)', color:'white', fontSize:12, fontWeight:500 }}>{articles.length} articles scanned</div>
              </div>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', margin:0 }}>
                Scanned {format(new Date(scan.created_at), 'MMM d, yyyy')} · {scan.preset ? `${scan.preset.split(',').length} checks` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.7)', borderRadius:100, padding:4, border:'1px solid var(--border-md)', marginBottom:12, width:'fit-content' }}>
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

        {/* Articles */}
        <div className="card" style={{ overflow:'hidden', marginBottom:24 }}>
          {filtered.map(a => (
            <ArticleRow key={a.id} article={a} issues={issues.filter(i=>i.article_id===a.id)} />
          ))}
        </div>

        {/* Footer CTA */}
        <div style={{ textAlign:'center', padding:'24px', background:'var(--green-light)', borderRadius:'var(--radius-xl)', border:'1px solid var(--green-border)' }}>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginBottom:6 }}>Want to scan your own knowledge base?</p>
          <p style={{ fontSize:13, color:'var(--text-2)', marginBottom:16 }}>ArticleIQ scans every article for quality issues — free to get started.</p>
          <Link to="/login" className="btn btn-primary">Try ArticleIQ free →</Link>
        </div>
      </div>
    </div>
  )
}
