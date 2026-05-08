import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/useToast'
import { useUpgrade } from '@/hooks/useUpgrade'
import { supabase } from '@/lib/supabase'
import {
  AlertOctagon, AlertTriangle, CheckCircle, Scan, Plug, ArrowRight,
  Trash2, ChevronRight, Loader, TrendingUp, TrendingDown, Zap, Target, BookOpen
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const calcHealth = (scan) => {
  if (!scan?.scanned_articles) return null
  const penalty = ((scan.critical_count||0)*3 + (scan.warning_count||0) + (scan.info_count||0)*0.2) / scan.scanned_articles
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}
const healthLabel = (s) => s >= 80 ? 'Healthy' : s >= 60 ? 'Needs attention' : 'Critical'
const pointsToHealthy = (s) => s >= 80 ? 0 : 80 - s

const SCAN_CHECKS = [
  { key: 'outdated',    label: 'Outdated articles',  desc: 'Not updated in 180+ days' },
  { key: 'wordCount',   label: 'Thin content',        desc: 'Under 150 words' },
  { key: 'readability', label: 'Readability score',   desc: 'Hard to read articles' },
  { key: 'labels',      label: 'Missing labels',      desc: 'No tags assigned' },
  { key: 'duplicates',  label: 'Duplicate detection', desc: 'Similar articles' },
  { key: 'links',       label: 'Broken links',        desc: 'Dead hyperlinks' },
]
const AI_CHECKS = [
  { key: 'ai_grammar',  label: 'Improve Article', desc: 'Grammar + rewrite in one pass' },
  { key: 'ai_quality',  label: 'Quality Score',   desc: 'Rate clarity and completeness' },
  { key: 'ai_labels',   label: 'Label Suggestions',desc: 'Suggest tags from content' },
]
const DEFAULT_CHECKS = { outdated:true, wordCount:true, readability:true, labels:true, duplicates:false, links:false }

export default function DashboardPage() {
  const { userId, profile } = useAuth()
  const { recentScans, activeScan, reload: reloadScans } = useScan()
  const toast    = useToast()
  const navigate = useNavigate()
  const upgrade  = useUpgrade()

  const [connector,   setConnector]   = useState(null)
  const [hasConn,     setHasConn]     = useState(null)
  const [checks,      setChecks]      = useState(null)
  const [checksReady, setChecksReady] = useState(false)
  const [starting,    setStarting]    = useState(false)
  const [error,       setError]       = useState(null)
  const [lastCounts,  setLastCounts]  = useState(null)
  const [quickWins,   setQuickWins]   = useState([])

  const completed = recentScans.filter(s => s.status === 'completed')
  const lastScan  = completed[0] || null
  const prevScan  = completed[1] || null

  // Load connector
  useEffect(() => {
    if (!userId) return
    supabase.from('zendesk_connectors').select('*').eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { setConnector(data?.[0] || null); setHasConn(!!(data?.length)) })
  }, [userId])

  // Load scan defaults
  useEffect(() => {
    if (profile !== null) {
      setChecks({ ...DEFAULT_CHECKS, ...(profile?.scan_defaults || {}) })
      setChecksReady(true)
    }
  }, [profile?.id, profile])

  // Backfill scan counts + load quick wins
  useEffect(() => {
    if (!lastScan) return
    Promise.all([
      supabase.from('article_issues').select('severity').eq('scan_job_id', lastScan.id),
      supabase.from('article_issues').select('*, scanned_articles(title, url)')
        .eq('scan_job_id', lastScan.id).eq('resolved', false)
        .in('severity', ['critical', 'warning']).order('severity', { ascending: true }).limit(3),
    ]).then(([{ data: counts }, { data: wins }]) => {
      if (counts) {
        const c = {
          critical: counts.filter(i => i.severity==='critical').length,
          warning:  counts.filter(i => i.severity==='warning').length,
          info:     counts.filter(i => i.severity==='info').length,
        }
        setLastCounts(c)
        if (lastScan.critical_count === 0 && lastScan.warning_count === 0 && c.critical + c.warning > 0) {
          supabase.from('scan_jobs').update({ critical_count: c.critical, warning_count: c.warning, info_count: c.info, issues_found: c.critical + c.warning + c.info }).eq('id', lastScan.id)
        }
      }
      if (wins) setQuickWins(wins)
    })
    // Backfill stale scans in background
    completed.filter(s => s.id !== lastScan.id && s.critical_count === 0 && s.warning_count === 0 && (s.scanned_articles||0) > 0).slice(0, 5)
      .forEach(async (scan) => {
        const { data } = await supabase.from('article_issues').select('severity').eq('scan_job_id', scan.id)
        if (!data?.length) return
        const critical = data.filter(i=>i.severity==='critical').length
        const warning  = data.filter(i=>i.severity==='warning').length
        const info     = data.filter(i=>i.severity==='info').length
        if (critical + warning + info > 0)
          supabase.from('scan_jobs').update({ critical_count: critical, warning_count: warning, info_count: info, issues_found: critical + warning + info }).eq('id', scan.id)
      })
  }, [lastScan?.id])

  // Upgrade success toast
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('upgraded') === 'true') {
      toast.success('Welcome to Pro! AI features are now unlocked.', 6000)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  const counts = lastCounts || { critical: lastScan?.critical_count||0, warning: lastScan?.warning_count||0, info: lastScan?.info_count||0 }
  const total  = counts.critical + counts.warning + counts.info
  const lastH  = lastScan ? calcHealth({...lastScan, ...counts}) : null
  const prevH  = prevScan ? calcHealth(prevScan) : null
  const trend  = lastH != null && prevH != null ? lastH - prevH : null
  const needed = lastH != null ? pointsToHealthy(lastH) : null

  const startScan = async () => {
    if (!userId || !connector) return
    setStarting(true); setError(null)
    try {
      const { data: job, error: jobErr } = await supabase.from('scan_jobs')
        .insert({ user_id: userId, connector_id: connector.id, status: 'pending', preset: Object.entries(checks || DEFAULT_CHECKS).filter(([,v])=>v).map(([k])=>k).join(',') })
        .select().single()
      if (jobErr) throw new Error(jobErr.message)
      reloadScans()
      navigate(`/scanner/results/${job.id}`)
    } catch (e) { setError(e.message); setStarting(false) }
  }

  const deleteScan = async (scanId) => {
    const ok = await toast.confirm('Delete this scan and all its results?', 'Delete', 'Cancel')
    if (!ok) return
    await supabase.from('scan_jobs').delete().eq('id', scanId)
    toast.success('Scan deleted')
    reloadScans()
  }

  const scoreColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>

      {/* ── Active scan banner ── */}
      {activeScan && (
        <Link to={`/scanner/results/${activeScan.id}`} style={{ display:'block', textDecoration:'none', marginBottom:16 }}>
          <div style={{ borderRadius:'var(--radius-xl)', background:'var(--navy)', overflow:'hidden' }} className="animate-in">
            <div style={{ padding:'16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'white', opacity:0.8, animation:'pulse-dot 1.5s ease-in-out infinite' }} />
                <div>
                  <p style={{ fontSize:14, fontWeight:700, color:'white', margin:0 }}>Scan in progress — keep this tab open</p>
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.6)', margin:0 }}>{activeScan.scanned_articles||0} of {activeScan.total_articles||'?'} articles</p>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <span style={{ fontSize:20, fontWeight:800, color:'white' }}>
                  {activeScan.total_articles ? `${Math.round((activeScan.scanned_articles/activeScan.total_articles)*100)}%` : '...'}
                </span>
                <ArrowRight size={16} color="white" />
              </div>
            </div>
            <div className="progress-track" style={{ borderRadius:0, background:'rgba(255,255,255,0.15)' }}>
              <div className="progress-fill" style={{ width: activeScan.total_articles ? `${Math.round((activeScan.scanned_articles/activeScan.total_articles)*100)}%` : '2%', background:'rgba(255,255,255,0.7)' }} />
            </div>
          </div>
        </Link>
      )}

      {/* ── No connector onboarding ── */}
      {!activeScan && hasConn === false && (
        <div className="animate-in">
          <div style={{ borderRadius:'var(--radius-xl)', background:'var(--navy)', padding:'32px', marginBottom:16, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', marginBottom:8 }}>Welcome to ArticleIQ</p>
            <h1 style={{ fontSize:26, fontWeight:800, color:'white', marginBottom:8, letterSpacing:-0.5 }}>Let's score your knowledge base</h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.7)', maxWidth:480, lineHeight:1.6 }}>
              Connect Zendesk® in 2 minutes and we'll tell you exactly what's hurting your customer experience — and what to fix first.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            {[
              { step:1, icon:<Plug size={16} style={{ color:'var(--navy)' }} />, title:'Connect Zendesk®', desc:'Add your subdomain and API token. Read-only — we never touch your articles.', action:true },
              { step:2, icon:<Scan size={16} style={{ color:'var(--text-3)' }} />, title:'Run a scan', desc:'We analyze every article for readability, freshness, duplicates, and more.', action:false },
              { step:3, icon:<Target size={16} style={{ color:'var(--text-3)' }} />, title:'Fix what matters', desc:'Get a health score, see top issues, and use AI to fix them.', action:false },
            ].map(({ step, icon, title, desc, action }) => (
              <div key={step} className="card" style={{ padding:'20px', borderTop:`3px solid ${action ? 'var(--navy)' : 'var(--border)'}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:28, height:28, borderRadius:7, background: action ? 'var(--navy-light)' : 'var(--bg)', border:`1px solid ${action ? 'var(--navy-border)' : 'var(--border-md)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
                  <span style={{ fontSize:10, fontWeight:700, color: action ? 'var(--navy)' : 'var(--text-3)' }}>Step {step}</span>
                </div>
                <p style={{ fontSize:13, fontWeight:700, color: action ? 'var(--text)' : 'var(--text-3)', marginBottom:5 }}>{title}</p>
                <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6, marginBottom: action ? 14 : 0 }}>{desc}</p>
                {action && <Link to="/connector" className="btn btn-primary btn-sm" style={{ width:'100%', justifyContent:'center' }}><Plug size={12} /> Connect Zendesk® →</Link>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Connected, no scans yet ── */}
      {!activeScan && hasConn && !lastScan && (
        <div style={{ borderRadius:'var(--radius-xl)', background:'var(--navy)', padding:'32px', marginBottom:16, position:'relative', overflow:'hidden' }} className="animate-in">
          <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.05)' }} />
          <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.45)', marginBottom:8 }}>You're connected ✓</p>
          <h1 style={{ fontSize:26, fontWeight:800, color:'white', marginBottom:10, letterSpacing:-0.5 }}>Ready to score your knowledge base?</h1>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.7)', lineHeight:1.6, marginBottom:20, maxWidth:500 }}>
            Most knowledge bases have issues their teams don't know about. Your first scan reveals exactly what's there.
          </p>
        </div>
      )}

      {/* ── Health score hero ── */}
      {!activeScan && hasConn && lastScan && (
        <div style={{ background:'var(--navy)', borderRadius:'var(--radius-xl)', padding:'22px 26px', marginBottom:16, position:'relative', overflow:'hidden' }} className="animate-in">
          <div style={{ position:'absolute', top:-50, right:-50, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
          <div style={{ position:'absolute', bottom:-60, right:80, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.03)' }} />
          <div style={{ position:'relative' }}>
            <p style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:6 }}>
              Knowledge base health · {formatDistanceToNow(new Date(lastScan.created_at), { addSuffix:true })}
            </p>
            <div style={{ display:'flex', alignItems:'flex-end', gap:16, marginBottom:14 }}>
              <div style={{ fontSize:76, fontWeight:800, color:'white', lineHeight:1, letterSpacing:-3 }}>{lastH}</div>
              <div style={{ paddingBottom:10 }}>
                <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,0.85)', marginBottom:4 }}>{healthLabel(lastH)}</div>
                {trend !== null && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.6)' }}>
                    {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trend > 0 ? '+' : ''}{trend} vs previous scan
                  </div>
                )}
              </div>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
              {counts.critical > 0 && <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(192,57,43,0.35)', color:'#FFAAAA', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><AlertOctagon size={10}/> {counts.critical} critical</div>}
              {counts.warning  > 0 && <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,200,80,0.18)', color:'#FFD980', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}><AlertTriangle size={10}/> {counts.warning} warnings</div>}
              <div style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.65)', fontSize:11, fontWeight:600 }}>
                {(lastScan.scanned_articles||0) - counts.critical - counts.warning} clean
              </div>
              <Link to={`/scanner/results/${lastScan.id}`}
                style={{ padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.12)', color:'white', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, marginLeft:'auto', textDecoration:'none' }}>
                View report <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats row ── */}
      {!activeScan && lastScan && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:16 }} className="animate-in">
          {[
            { label:'Articles scanned', value: (lastScan.scanned_articles||0).toLocaleString(), sub:'last scan' },
            { label:'Issues found',     value: total.toLocaleString(),                          sub:'across all checks' },
            { label:'Scans this month', value: recentScans.filter(s => new Date(s.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length, sub:'last 30 days' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="card" style={{ padding:'14px 18px' }}>
              <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', marginBottom:6 }}>{label}</p>
              <p style={{ fontSize:24, fontWeight:800, color:'var(--text)', lineHeight:1, marginBottom:2 }}>{value}</p>
              <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick wins ── */}
      {!activeScan && lastScan && quickWins.length > 0 && (
        <div className="card animate-in" style={{ marginBottom:16, overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Fix these first</p>
            <Link to={`/scanner/results/${lastScan.id}`} className="btn btn-ghost btn-xs" style={{ color:'var(--text-3)' }}>See all <ChevronRight size={12} /></Link>
          </div>
          {quickWins.map((issue, i) => (
            <div key={issue.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px', borderBottom: i < quickWins.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background: issue.severity==='critical' ? 'var(--red)' : 'var(--amber)' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {issue.scanned_articles?.title || 'Untitled'}
                </p>
                <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>{issue.description}</p>
              </div>
              <span className={`badge badge-${issue.severity==='critical' ? 'critical' : 'warning'}`}>{issue.severity}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Scan launcher ── */}
      {!activeScan && hasConn && (
        <div className="card animate-in" style={{ padding:'20px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>New scan</p>
            {connector && (
              <span style={{ fontSize:11, color:'var(--text-3)', display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)' }} />
                {connector.subdomain}.zendesk.com
              </span>
            )}
          </div>

          {/* Quality checks */}
          <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', marginBottom:8 }}>Quality checks</p>
          {!checksReady ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16 }}>
              {[...Array(6)].map((_,i) => <div key={i} style={{ height:56, borderRadius:8, background:'var(--bg)', border:'1px solid var(--border-md)', opacity:0.6 }} />)}
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16 }}>
              {SCAN_CHECKS.map(({ key, label, desc }) => {
                const on = (checks || DEFAULT_CHECKS)[key]
                return (
                  <button key={key} onClick={() => setChecks(c => ({ ...c, [key]: !c[key] }))}
                    style={{ display:'flex', alignItems:'flex-start', gap:9, padding:'10px 12px', borderRadius:8, cursor:'pointer', textAlign:'left', border:'none', transition:'all 0.12s', fontFamily:'inherit',
                      background: on ? 'white' : 'var(--bg)',
                      outline: `1.5px solid ${on ? 'var(--navy)' : 'var(--border-md)'}`,
                    }}>
                    <div style={{ width:16, height:16, borderRadius:4, flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.12s',
                      background: on ? 'var(--navy)' : 'white',
                      border: `2px solid ${on ? 'var(--navy)' : 'var(--border-md)'}`,
                    }}>
                      {on && <span style={{ fontSize:9, color:'white', fontWeight:800 }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color: on ? 'var(--navy)' : 'var(--text)', marginBottom:1 }}>{label}</div>
                      <div style={{ fontSize:10, color:'var(--text-3)' }}>{desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* AI section */}
          <div style={{ borderRadius:10, background:'var(--navy)', padding:'14px 16px', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
              <Zap size={13} style={{ color:'#FFD93D' }} />
              <span style={{ fontSize:12, fontWeight:700, color:'white' }}>Fix with ArticleIQ</span>
              <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:100, background:'#FFD93D', color:'#1A1A18' }}>Pro</span>
            </div>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginBottom: profile?.plan === 'paid' ? 10 : 0 }}>
              {profile?.plan === 'paid' ? 'AI-powered grammar, rewrites, and quality scoring.' : 'Upgrade to unlock AI-powered article improvements.'}
            </p>
            {profile?.plan === 'paid' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {AI_CHECKS.map(({ key, label, desc }) => {
                  const on = (checks || DEFAULT_CHECKS)[key]
                  return (
                    <button key={key} onClick={() => setChecks(c => ({ ...c, [key]: !c[key] }))}
                      style={{ padding:'9px 10px', borderRadius:8, cursor:'pointer', textAlign:'left', border:'none', transition:'all 0.12s', fontFamily:'inherit',
                        background: on ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                        outline: `1.5px solid ${on ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
                      }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'white', marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>{desc}</div>
                    </button>
                  )
                })}
              </div>
            )}
            {profile?.plan !== 'paid' && (
              <button onClick={upgrade} style={{ marginTop:10, padding:'6px 14px', borderRadius:7, background:'#FFD93D', color:'#1A1A18', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                <Zap size={11} /> Upgrade to Pro — $99/mo
              </button>
            )}
          </div>

          {error && <p style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>{error}</p>}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={startScan} disabled={starting} className="btn btn-primary">
              {starting ? <Loader size={15} style={{ animation:'spin 0.7s linear infinite' }} /> : <Scan size={15} />}
              {starting ? 'Starting...' : 'Start scan'}
            </button>
            <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>Keep this tab open while scanning</p>
          </div>
        </div>
      )}

      {/* ── Scan history ── */}
      {recentScans.length > 0 && (
        <div className="card animate-in" style={{ overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>Recent scans</p>
            <span style={{ fontSize:11, color:'var(--text-3)' }}>{recentScans.length} total</span>
          </div>
          {recentScans.map((scan, i) => {
            const h = calcHealth(scan)
            const isActive = scan.status==='running'||scan.status==='pending'
            const boxBg    = isActive ? 'var(--navy-light)' : h>=80 ? 'var(--green-light)' : h>=60 ? 'var(--amber-light)' : 'var(--red-light)'
            const boxColor = isActive ? 'var(--navy)' : h>=80 ? 'var(--green)' : h>=60 ? 'var(--amber)' : 'var(--red)'
            return (
              <div key={scan.id}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', borderBottom: i < recentScans.length-1 ? '1px solid var(--border)' : 'none', transition:'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--bg-hover)'; const d=e.currentTarget.querySelector('.del'); if(d) d.style.opacity='1' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; const d=e.currentTarget.querySelector('.del'); if(d) d.style.opacity='0' }}>
                <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, background:boxBg, color:boxColor }}>
                  {isActive ? <Loader size={14} style={{ animation:'spin 0.7s linear infinite' }} /> : (h ?? '—')}
                </div>
                <Link to={`/scanner/results/${scan.id}`} style={{ flex:1, minWidth:0, textDecoration:'none' }}>
                  <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center', gap:6, marginBottom:1 }}>
                    {format(new Date(scan.created_at), 'MMM d, yyyy — h:mm a')}
                    {scan.preset && (() => {
                      const count = scan.preset.split(',').filter(Boolean).length
                      return <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:3, background:'var(--bg)', color:'var(--text-3)', border:'1px solid var(--border-md)' }}>{count} checks</span>
                    })()}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>
                    {isActive ? `${scan.scanned_articles||0} of ${scan.total_articles||'?'} articles · in progress`
                      : `${formatDistanceToNow(new Date(scan.created_at), { addSuffix:true })} · ${(scan.scanned_articles||0).toLocaleString()} articles`}
                  </div>
                </Link>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  {scan.critical_count > 0 && <span style={{ fontSize:10, fontWeight:700, color:'var(--red)' }}>{scan.critical_count} critical</span>}
                  <ChevronRight size={13} style={{ color:'var(--border-strong)' }} />
                </div>
                <button className="del btn btn-ghost btn-xs" onClick={() => deleteScan(scan.id)}
                  style={{ opacity:0, transition:'opacity 0.1s', color:'var(--text-3)', flexShrink:0 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
