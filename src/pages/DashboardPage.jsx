import { usePageTitle } from '@/hooks/usePageTitle'
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

// ─── Health trend chart ───────────────────────────────────────
function HealthChart({ scans }) {
  if (!scans || scans.length < 2) return null

  const W = 600, H = 120, PAD = { top:12, right:16, bottom:24, left:28 }
  const IW = W - PAD.left - PAD.right
  const IH = H - PAD.top  - PAD.bottom

  const calcH = (s) => {
    if (!s?.scanned_articles) return null
    const p = ((s.critical_count||0)*3 + (s.warning_count||0) + (s.info_count||0)*0.2) / s.scanned_articles
    return Math.max(0, Math.min(100, Math.round(100 - p * 20)))
  }

  // Up to 20 scans, oldest first, only completed with a health score
  const pts = scans
    .filter(s => s.status === 'completed' && s.scanned_articles > 0)
    .slice(0, 20).reverse()
    .map(s => ({ score: calcH(s), date: new Date(s.created_at), id: s.id }))
    .filter(p => p.score !== null)

  if (pts.length < 2) return null

  const minY = Math.max(0,  Math.min(...pts.map(p => p.score)) - 10)
  const maxY = Math.min(100, Math.max(...pts.map(p => p.score)) + 10)
  const rangeY = maxY - minY || 10

  const minX = pts[0].date.getTime()
  const maxX = pts[pts.length-1].date.getTime()
  const rangeX = maxX - minX || 1

  const px = (d) => PAD.left + ((d.getTime() - minX) / rangeX) * IW
  const py = (s) => PAD.top  + (1 - (s - minY) / rangeY) * IH

  const path = pts.map((p,i) => `${i===0?'M':'L'}${px(p.date).toFixed(1)},${py(p.score).toFixed(1)}`).join(' ')
  const area = `${path} L${px(pts[pts.length-1].date).toFixed(1)},${(PAD.top+IH).toFixed(1)} L${PAD.left},${(PAD.top+IH).toFixed(1)} Z`

  // Y gridlines at 20, 40, 60, 80
  const gridLines = [20,40,60,80].filter(v => v >= minY && v <= maxY)

  // X axis labels — show up to 4 dates
  const labelIdxs = pts.length <= 4
    ? pts.map((_,i) => i)
    : [0, Math.floor(pts.length/3), Math.floor(2*pts.length/3), pts.length-1]

  const last  = pts[pts.length-1]
  const prev  = pts[pts.length-2]
  const delta = last.score - prev.score

  return (
    <div style={{ background:'white', borderRadius:'var(--radius-lg)', border:'1px solid var(--border-md)', padding:'16px 18px', marginBottom:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <div>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', margin:'0 0 2px' }}>Health score trend</p>
          <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>{pts.length} scans</p>
        </div>
        <div style={{ display:'flex', gap:16 }}>
          {/* Healthy threshold legend */}
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text-3)' }}>
            <div style={{ width:20, height:1, background:'rgba(16,124,16,0.3)', borderTop:'1.5px dashed rgba(16,124,16,0.4)' }} />
            Healthy (80)
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600,
            color: delta > 0 ? 'var(--green)' : delta < 0 ? 'var(--red)' : 'var(--text-3)' }}>
            {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}
            {delta > 0 ? '+' : ''}{delta} vs previous
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block', overflow:'visible' }}>
        {/* Grid lines */}
        {gridLines.map(v => (
          <g key={v}>
            <line x1={PAD.left} y1={py(v)} x2={PAD.left+IW} y2={py(v)}
              stroke="var(--border)" strokeWidth="1" strokeDasharray={v===80?"4,3":undefined} />
            <text x={PAD.left-5} y={py(v)+4} textAnchor="end" fontSize="9" fill="var(--text-3)">{v}</text>
          </g>
        ))}

        {/* Healthy threshold dashed line */}
        {80 >= minY && 80 <= maxY && (
          <line x1={PAD.left} y1={py(80)} x2={PAD.left+IW} y2={py(80)}
            stroke="rgba(16,124,16,0.35)" strokeWidth="1.5" strokeDasharray="4,3" />
        )}

        {/* Area fill */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--navy)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--navy)" stopOpacity="0.01" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={path} fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points */}
        {pts.map((p, i) => {
          const isLast = i === pts.length - 1
          const cx = px(p.date), cy = py(p.score)
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={isLast ? 5 : 3.5}
                fill={isLast ? 'var(--navy)' : 'white'}
                stroke="var(--navy)" strokeWidth={isLast ? 0 : 1.5} />
              {isLast && (
                <text x={cx} y={cy-10} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--navy)">{p.score}</text>
              )}
            </g>
          )
        })}

        {/* X axis labels */}
        {labelIdxs.map(i => {
          const p = pts[i]
          const d = p.date
          const label = `${d.toLocaleString('default',{month:'short'})} ${d.getDate()}`
          return (
            <text key={i} x={px(d)} y={H-2} textAnchor="middle" fontSize="9" fill="var(--text-3)">{label}</text>
          )
        })}
      </svg>
    </div>
  )
}

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
  // readability removed as standalone check — factored into Quality & SEO analysis
  { key: 'labels',      label: 'Missing labels',      desc: 'No tags assigned' },
  { key: 'duplicates',  label: 'Duplicate detection', desc: 'Similar article titles (85%+ match)' },
  { key: 'links',       label: 'Broken links',        desc: 'Dead hyperlinks' },
]
const AI_CHECKS = [
  { key: 'ai_grammar',  label: 'Improve Article', desc: 'Grammar + rewrite in one pass' },
  { key: 'ai_quality',  label: 'Quality Score',   desc: 'Rate clarity and completeness' },
  { key: 'ai_labels',   label: 'Label Suggestions',desc: 'Suggest tags from content' },
]
const DEFAULT_CHECKS = { outdated:true, wordCount:true, readability:false, labels:true, duplicates:true, links:true }

export default function DashboardPage() {
  const { userId, profile } = useAuth()
  const { recentScans, activeScan, reload: reloadScans } = useScan()
  usePageTitle('Dashboard')

  const toast    = useToast()
  const navigate     = useNavigate()
  const justUpgraded = new URLSearchParams(window.location.search).get('upgraded') === 'true'
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
      const saved = profile?.scan_defaults || {}
      // Force links and duplicates on — old saved defaults may have these as false
      const merged = { ...DEFAULT_CHECKS, ...saved, links: true, duplicates: true }
      setChecks(merged)
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
    completed.filter(s => s.id !== lastScan?.id && s.critical_count === 0 && s.warning_count === 0 && (s.scanned_articles||0) > 0).slice(0, 5)
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

  const outOfScans = profile?.plan === 'pack' && (profile?.scans_remaining ?? 0) <= 0
  const isPaid     = ['paid','pack','annual'].includes(profile?.plan)

  const startScan = async () => {
    if (outOfScans) { upgrade(); return }
    if (!userId || !connector) return
    setStarting(true); setError(null)
    try {
      const { data: job, error: jobErr } = await supabase.from('scan_jobs')
        .insert({ user_id: userId, connector_id: connector.id, status: 'pending', preset: Object.entries(checks || DEFAULT_CHECKS).filter(([,v])=>v).map(([k])=>k).join(',') })
        .select().single()
      if (jobErr) throw new Error(jobErr.message)
      // Deduct scan credit for pack users using DB decrement (atomic, avoids stale state)
      if (profile?.plan === 'pack') {
        await supabase.rpc('decrement_scans_remaining', { user_id_input: userId })
        refreshProfile()
      }
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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 'clamp(16px, 4vw, 24px)' }}>

      {/* ── Active scan banner ── */}
      {activeScan && (
        <Link to={`/scanner/results/${activeScan.id}`} style={{ display:'block', textDecoration:'none', marginBottom:16 }}>
          <div style={{ borderRadius:'var(--radius-xl)', background:'var(--navy)', overflow:'hidden' }} className="animate-in">
            <div style={{ padding:'16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div className="pulse-dot" style={{ width:8, height:8, borderRadius:'50%', background:'white', opacity:0.8 }} />
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
          <div className='onboard-grid' style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
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

      {/* Welcome banner after upgrade */}
      {justUpgraded && (
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderRadius:10, marginBottom:14, background:'var(--green-light)', border:'1px solid var(--green-border)' }}>
            <CheckCircle size={22} style={{ color:'var(--green)', flexShrink:0 }} />
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:'0 0 2px' }}>
                {profile?.plan === 'annual' ? 'Welcome to Annual Pro!' : 'Welcome to Scan Pack!'}
              </p>
              <p style={{ fontSize:12, color:'var(--text-2)', margin:0 }}>
                {profile?.plan === 'annual'
                  ? 'Unlimited scans, full AI features, and KB health trend tracking are all unlocked. Run your first scan below.'
                  : `You have 5 scans ready to use — they never expire. AI features, unlimited articles, and direct publishing to Zendesk® are all unlocked. Run your first scan below.`
                }
              </p>
            </div>
          </div>
        )}

      {/* Scan Pack credits banner */}
      {profile?.plan === 'pack' && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:10, marginBottom:14,
            background: profile.scans_remaining === 0 ? 'var(--red-light)' : 'var(--navy-light)',
            border: `1px solid ${profile.scans_remaining === 0 ? 'var(--red-border)' : 'var(--navy-border)'}`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:34, height:34, borderRadius:8, background: profile.scans_remaining === 0 ? 'var(--red-light)' : 'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Zap size={16} style={{ color: profile.scans_remaining === 0 ? 'var(--red)' : 'white' }} />
              </div>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 1px' }}>
                  {profile.scans_remaining === 0
                    ? 'No scans remaining'
                    : `${profile.scans_remaining} scan${profile.scans_remaining !== 1 ? 's' : ''} remaining`}
                </p>
                <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>
                  {profile.scans_remaining === 0
                    ? 'Buy another Scan Pack or upgrade to Annual for unlimited scans'
                    : 'Scan Pack · credits never expire'}
                </p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {profile.scans_remaining === 0 && (
                <button onClick={upgrade} className="btn btn-primary btn-sm">Buy more scans</button>
              )}
              {profile.scans_remaining > 0 && profile.scans_remaining <= 2 && (
                <button onClick={upgrade} className="btn btn-secondary btn-sm">Upgrade to Annual</button>
              )}
            </div>
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
              <div className='health-score' style={{ fontSize:76, fontWeight:800, color:'white', lineHeight:1, letterSpacing:-3 }}>{lastH}</div>
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

      {/* ── Health trend chart ── */}
      {!activeScan && completed.length >= 2 && (
        <HealthChart scans={completed} />
      )}

      {/* ── Stats row ── */}
      {!activeScan && lastScan && (
        <div className="card animate-in" style={{ marginBottom:16, overflow:'hidden' }}>
          <div className='stats-grid' style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr', borderBottom:'1px solid var(--border)' }}>
            {[
              {
                label: 'Articles scanned',
                value: (lastScan.scanned_articles||0).toLocaleString(),
                sub: 'last scan',
              },
              {
                label: 'Critical issues',
                value: counts.critical.toLocaleString(),
                sub: 'needs immediate attention',
                color: counts.critical > 0 ? 'var(--red)' : 'var(--green)',
              },
              {
                label: 'Warnings',
                value: counts.warning.toLocaleString(),
                sub: 'worth reviewing',
                color: counts.warning > 0 ? 'var(--amber)' : 'var(--green)',
              },
              {
                label: 'Health trend',
                value: trend != null ? `${trend > 0 ? '+' : ''}${trend}` : '—',
                sub: trend != null ? (trend > 0 ? 'improving ↑' : trend < 0 ? 'declining ↓' : 'no change') : 'run 2+ scans',
                color: trend != null ? (trend > 0 ? 'var(--green)' : trend < 0 ? 'var(--red)' : 'var(--text-3)') : 'var(--text-3)',
              },
              {
                label: 'Scans this month',
                value: recentScans.filter(s => new Date(s.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length,
                sub: 'last 30 days',
              },
            ].map(({ label, value, sub, color }, i, arr) => (
              <div key={label} style={{ padding:'14px 18px', borderRight: i < arr.length-1 ? '1px solid var(--border)' : 'none' }}>
                <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--text-3)', marginBottom:6 }}>{label}</p>
                <p style={{ fontSize:24, fontWeight:800, color: color || 'var(--text)', lineHeight:1, marginBottom:2 }}>{value}</p>
                <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>{sub}</p>
              </div>
            ))}
          </div>
          <div style={{ padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>
              Last scanned {lastScan.created_at ? formatDistanceToNow(new Date(lastScan.created_at), { addSuffix:true }) : ''}
            </p>
            <Link to={`/scanner/results/${lastScan.id}`} className="btn btn-ghost btn-xs" style={{ color:'var(--navy)' }}>
              View full report <ChevronRight size={12} />
            </Link>
          </div>
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
            <div className='checks-grid' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16 }}>
              {[...Array(6)].map((_,i) => <div key={i} style={{ height:56, borderRadius:8, background:'var(--bg)', border:'1px solid var(--border-md)', opacity:0.6 }} />)}
            </div>
          ) : (
            <div className='checks-grid' style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16 }}>
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
              {!isPaid && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:100, background:'#FFD93D', color:'#1A1A18' }}>Pro</span>}
            </div>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', marginBottom: isPaid ? 6 : 0 }}>
              {isPaid
                ? 'AI Quality Score, SEO Score, Improve Article, and Label Suggestions — available on any article after scanning.'
                : 'Upgrade to unlock AI-powered article improvements, quality scoring, and direct publishing to Zendesk®.'}
            </p>
            {!isPaid && (
              <button onClick={upgrade} style={{ marginTop:10, padding:'6px 14px', borderRadius:7, background:'#FFD93D', color:'#1A1A18', border:'none', cursor:'pointer', fontFamily:'inherit', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                <Zap size={11} /> Upgrade →
              </button>
            )}
          </div>

          {error && <p style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>{error}</p>}
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={startScan} disabled={starting} className="btn btn-primary">
              {starting ? <Loader size={15} style={{ animation:'spin 0.7s linear infinite' }} /> : <Scan size={15} />}
              {starting ? 'Starting...' : 'Start scan →'}
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
