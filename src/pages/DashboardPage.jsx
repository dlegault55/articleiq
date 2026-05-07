import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import {
  AlertOctagon, AlertTriangle, CheckCircle, Scan, Plug, ArrowRight,
  Trash2, ChevronRight, Loader, TrendingUp, TrendingDown, Clock,
  Zap, Target, BookOpen
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const calcHealth = (scan) => {
  if (!scan?.scanned_articles) return null
  const penalty = ((scan.critical_count||0)*3 + (scan.warning_count||0) + (scan.info_count||0)*0.2) / scan.scanned_articles
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}
const healthColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'
const healthLabel = (s) => s >= 80 ? 'Healthy' : s >= 60 ? 'Needs attention' : 'Critical'

const SCAN_CHECKS = [
  { key: 'outdated',    label: 'Outdated articles',   desc: 'Not updated in 180+ days — customers may be following stale instructions', time: 'Fast' },
  { key: 'wordCount',   label: 'Thin content',         desc: 'Under 150 words — likely not detailed enough to genuinely help anyone', time: 'Fast' },
  { key: 'readability', label: 'Readability score',    desc: 'How easy articles are to read — low scores mean customers struggle and call support instead', time: 'Moderate' },
  { key: 'labels',      label: 'Missing labels',       desc: 'No tags or category — harder for customers to find, harder for your team to manage', time: 'Fast' },
  { key: 'duplicates',  label: 'Duplicate detection',  desc: 'Articles covering the same topic — confuses customers and splits search results', time: 'Moderate' },
  { key: 'links',       label: 'Broken links',         desc: 'Dead hyperlinks inside articles — customers hit a 404 and lose trust in your content', time: 'Moderate' },
  { key: 'ai',          label: 'AI analysis',          desc: 'Grammar fixes, rewrites, and quality scoring powered by Claude', time: 'Pro only', proOnly: true },
]

const DEFAULT_CHECKS = { outdated: true, wordCount: true, readability: true, labels: true, duplicates: false, links: false, ai: false }

// Time saved calculation: ~18s per issue to manually find
const timeSaved = (total) => {
  const minutes = Math.round((total * 18) / 60)
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.round(minutes / 60 * 10) / 10
  return `${hours} hours`
}

// Points needed to reach next tier
const pointsToHealthy = (score) => score >= 80 ? 0 : 80 - score

export default function DashboardPage() {
  const { userId, profile } = useAuth()
  const { activeScan, recentScans, reload: reloadScans } = useScan()
  const toast   = useToast()
  const navigate = useNavigate()

  const [connector,    setConnector]    = useState(null)
  const [hasConn,      setHasConn]      = useState(null)
  const [checks,  setChecks]  = useState(DEFAULT_CHECKS)
  const [starting,     setStarting]     = useState(false)
  const [lastCounts,   setLastCounts]   = useState(null)
  const [quickWins,    setQuickWins]    = useState([])
  const [error,        setError]        = useState(null)

  useEffect(() => {
    if (!userId) return
    supabase.from('zendesk_connectors').select('*').eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => { setConnector(data?.[0]||null); setHasConn(!!data?.length) })
  }, [userId])

  const completed = recentScans.filter(s => s.status === 'completed')
  const lastScan  = completed[0]
  const prevScan  = completed[1]

  useEffect(() => {
    if (!lastScan) return
    // Load real counts + quick wins
    Promise.all([
      supabase.from('article_issues').select('severity').eq('scan_job_id', lastScan.id),
      supabase.from('article_issues')
        .select('*, scanned_articles(title, url)')
        .eq('scan_job_id', lastScan.id)
        .eq('resolved', false)
        .in('severity', ['critical', 'warning'])
        .order('severity', { ascending: true })
        .limit(3),
    ]).then(([{ data: counts }, { data: wins }]) => {
      if (counts) setLastCounts({
        critical: counts.filter(i => i.severity==='critical').length,
        warning:  counts.filter(i => i.severity==='warning').length,
        info:     counts.filter(i => i.severity==='info').length,
      })
      if (wins) setQuickWins(wins)
    })
  }, [lastScan?.id])

  const counts  = lastCounts || { critical: lastScan?.critical_count||0, warning: lastScan?.warning_count||0, info: lastScan?.info_count||0 }
  const total   = counts.critical + counts.warning + counts.info
  const lastH   = lastScan ? calcHealth({...lastScan, ...counts}) : null
  const prevH   = prevScan ? calcHealth(prevScan) : null
  const trend   = lastH!=null && prevH!=null ? lastH - prevH : null
  const needed  = lastH != null ? pointsToHealthy(lastH) : null

  const startScan = async () => {
    if (!userId || !connector) return
    setStarting(true); setError(null)
    try {
      const { data: job, error: jobErr } = await supabase.from('scan_jobs')
        .insert({ user_id: userId, connector_id: connector.id, status: 'pending', preset: Object.entries(checks).filter(([,v])=>v).map(([k])=>k).join(',') })
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

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>

      {/* ── Active scan banner ── */}
      {activeScan && (
        <Link to={`/scanner/results/${activeScan.id}`} style={{ display:'block', textDecoration:'none', marginBottom: 20 }}>
          <div style={{ borderRadius: 'var(--radius-xl)', background: 'var(--green)', overflow: 'hidden' }} className="animate-in">
            <div style={{ padding: '18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', gap: 16 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'white', opacity:0.9, animation:'pulse-dot 1.5s ease-in-out infinite' }} />
                <div>
                  <p style={{ fontSize:15, fontWeight:700, color:'white', margin:0 }}>Scan in progress — keep this tab open</p>
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.75)', margin:0 }}>
                    {activeScan.scanned_articles||0} of {activeScan.total_articles||'?'} articles analyzed
                  </p>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
                <span style={{ fontSize:24, fontWeight:800, color:'white' }}>
                  {activeScan.total_articles ? `${Math.round((activeScan.scanned_articles/activeScan.total_articles)*100)}%` : '...'}
                </span>
                <ArrowRight size={18} color="white" />
              </div>
            </div>
            <div className="progress-track" style={{ borderRadius:0, background:'rgba(0,0,0,0.2)' }}>
              <div className="progress-fill" style={{ width: activeScan.total_articles ? `${Math.round((activeScan.scanned_articles/activeScan.total_articles)*100)}%` : '2%', background:'rgba(255,255,255,0.8)' }} />
            </div>
          </div>
        </Link>
      )}

      {/* ── Onboarding: no connector ── */}
      {!activeScan && hasConn === false && (
        <div className="animate-in">
          <div style={{ borderRadius:'var(--radius-xl)', background:'var(--green)', padding:'32px', marginBottom:16, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:8 }}>Welcome to ArticleIQ</p>
            <h1 style={{ fontSize:26, fontWeight:800, color:'white', marginBottom:8, letterSpacing:-0.5 }}>Let's score your knowledge base</h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.75)', maxWidth:480, lineHeight:1.6 }}>
              Connect Zendesk in 2 minutes and we'll tell you exactly what's hurting your customer experience — and what to fix first.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
            {[
              { step:1, icon:<Plug size={18} style={{ color:'var(--green)' }} />, title:'Connect Zendesk', desc:'Add your subdomain and API token. Read-only — we never touch your articles.', action: true },
              { step:2, icon:<Scan size={18} style={{ color:'var(--text-3)' }} />, title:'Run a scan', desc:"We analyze every article for readability, freshness, duplicates, and more.", action: false },
              { step:3, icon:<Target size={18} style={{ color:'var(--text-3)' }} />, title:'Fix what matters', desc:'Get a health score, see the top issues, and use AI to fix them in one click.', action: false },
            ].map(({ step, icon, title, desc, action }) => (
              <div key={step} className="card" style={{ padding:'20px', borderTop: `3px solid ${action ? 'var(--green)' : 'var(--border)'}` }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background: action ? 'var(--green-light)' : 'var(--bg)', border:`1px solid ${action ? 'var(--green-border)' : 'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
                  <span style={{ fontSize:11, fontWeight:700, color: action ? 'var(--green)' : 'var(--text-3)' }}>Step {step}</span>
                </div>
                <p style={{ fontSize:14, fontWeight:700, color: action ? 'var(--text)' : 'var(--text-3)', marginBottom:5 }}>{title}</p>
                <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.6, marginBottom: action ? 14 : 0 }}>{desc}</p>
                {action && <Link to="/connector" className="btn btn-primary btn-sm" style={{ width:'100%', justifyContent:'center' }}><Plug size={13} /> Connect Zendesk →</Link>}
              </div>
            ))}
          </div>
          <p style={{ fontSize:12, color:'var(--text-3)', textAlign:'center' }}>
            Need help finding your API token?{' '}
            <a href="https://support.zendesk.com/hc/en-us/articles/4408889192858" target="_blank" rel="noreferrer" style={{ color:'var(--green)', fontWeight:600 }}>View Zendesk guide →</a>
          </p>
        </div>
      )}

      {/* ── First scan teaser: connected but no scans yet ── */}
      {!activeScan && hasConn && !lastScan && (
        <div className="animate-in">
          <div style={{ borderRadius:'var(--radius-xl)', background:'var(--green)', padding:'32px', marginBottom:16, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
            <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:8 }}>You're connected ✓</p>
            <h1 style={{ fontSize:26, fontWeight:800, color:'white', marginBottom:10, letterSpacing:-0.5 }}>Ready to score your knowledge base?</h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.75)', lineHeight:1.6, marginBottom:20, maxWidth:500 }}>
              Most knowledge bases have issues their teams don't know about — outdated articles, poor readability, and hidden duplicates. Your first scan will show you exactly what's there.
            </p>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              {[
                { icon:'📅', text:'Outdated articles flagged automatically' },
                { icon:'📖', text:'Readability scored for every article' },
                { icon:'🔍', text:'Duplicates detected without AI' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', background:'rgba(255,255,255,0.15)', borderRadius:100, fontSize:12, color:'white', fontWeight:500 }}>
                  {icon} {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Scan launcher — full width, 1/3 each ── */}
      {!activeScan && hasConn && (
        <div className="card animate-in" style={{ padding:'28px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <div>
              <p style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>Run a new scan</p>
              <p style={{ fontSize:13, color:'var(--text-2)' }}>Choose how deep to scan your knowledge base</p>
            </div>
            {connector && (
              <span style={{ fontSize:12, color:'var(--text-3)', display:'flex', alignItems:'center', gap:5, padding:'6px 12px', background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:100 }}>
                <CheckCircle size={12} style={{ color:'var(--green)' }} /> {connector.subdomain}.zendesk.com
              </span>
            )}
          </div>

          {/* Checkbox check picker */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
            {SCAN_CHECKS.map(({ key, label, desc, time, proOnly }) => {
              const isChecked = checks[key]
              const locked = proOnly && profile?.plan !== 'paid'
              return (
                <button key={key}
                  onClick={() => !locked && setChecks(c => ({ ...c, [key]: !c[key] }))}
                  style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 16px', borderRadius:10, cursor: locked ? 'not-allowed' : 'pointer', textAlign:'left', border:'none', transition:'all 0.12s', opacity: locked ? 0.6 : 1,
                    background: isChecked && !locked ? 'var(--green-light)' : 'var(--bg)',
                    outline: `1.5px solid ${isChecked && !locked ? 'var(--green-border)' : 'var(--border-md)'}`,
                  }}>
                  {/* Checkbox */}
                  <div style={{ width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.12s',
                    background: isChecked && !locked ? 'var(--green)' : 'white',
                    border: `2px solid ${isChecked && !locked ? 'var(--green)' : 'var(--border-md)'}`,
                  }}>
                    {isChecked && !locked && <CheckCircle size={11} color="white" />}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                      <span style={{ fontSize:13, fontWeight:700, color: isChecked && !locked ? 'var(--green)' : 'var(--text)' }}>{label}</span>
                      <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:100,
                        background: proOnly ? 'var(--amber-light)' : 'var(--bg)',
                        color: proOnly ? 'var(--amber)' : 'var(--text-3)',
                        border: `1px solid ${proOnly ? 'var(--amber-border)' : 'var(--border)'}`,
                      }}>
                        {proOnly ? '★ Pro' : time}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.5 }}>{desc}</p>
                    {locked && <p style={{ fontSize:11, color:'var(--amber)', margin:'4px 0 0', fontWeight:600 }}>Upgrade to Pro to unlock</p>}
                  </div>
                </button>
              )
            })}
          </div>

          {error && <p style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>{error}</p>}
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <button onClick={startScan} disabled={starting} className="btn btn-primary btn-lg">
              {starting ? <Loader size={16} className="spin" /> : <Scan size={16} />}
              {starting ? 'Starting...' : 'Start Scan'}
            </button>
            <p style={{ fontSize:12, color:'var(--text-3)', margin:0 }}>Keep this tab open while the scan runs</p>
          </div>
        </div>
      )}

      {/* ── Health score — full width below scan launcher ── */}
      {!activeScan && hasConn && (
        <div style={{ borderRadius:'var(--radius-xl)', background:'var(--green)', padding:'24px 28px', marginBottom:16, position:'relative', overflow:'hidden' }} className="animate-in">
          <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
          <div style={{ position:'absolute', bottom:-60, right:80, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:6 }}>
            Knowledge Base Health {lastScan ? `· ${formatDistanceToNow(new Date(lastScan.created_at), { addSuffix: true })}` : ''}
          </p>
          {lastScan ? (
            <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:32, alignItems:'center' }}>
              <div>
                <div style={{ fontSize:88, fontWeight:800, color:'white', lineHeight:1, letterSpacing:-3 }}>{lastH}</div>
                <div style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.85)', marginTop:4 }}>{healthLabel(lastH)}</div>
                {trend !== null && (
                  <div style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, padding:'3px 10px', borderRadius:100, background:'rgba(255,255,255,0.15)', color:'white', marginTop:8 }}>
                    {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trend > 0 ? '+' : ''}{trend} vs previous scan
                  </div>
                )}
              </div>
              <div>
                {needed > 0 && (
                  <div style={{ marginBottom:16, padding:'12px 16px', background:'rgba(255,255,255,0.12)', borderRadius:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <span style={{ fontSize:13, color:'rgba(255,255,255,0.85)', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                        <Target size={12} /> {needed} points to Healthy
                      </span>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>{lastH} / 80</span>
                    </div>
                    <div style={{ height:6, background:'rgba(255,255,255,0.2)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(lastH/80)*100}%`, background:'rgba(255,255,255,0.75)', borderRadius:3 }} />
                    </div>
                  </div>
                )}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  {counts.critical > 0 && <div style={{ padding:'6px 14px', borderRadius:100, background:'#FF4444', color:'white', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><AlertOctagon size={12} /> {counts.critical} Critical</div>}
                  {counts.warning  > 0 && <div style={{ padding:'6px 14px', borderRadius:100, background:'#FFD93D', color:'#1A1A00', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}><AlertTriangle size={12} /> {counts.warning} Warnings</div>}
                  <div style={{ padding:'6px 14px', borderRadius:100, background:'rgba(255,255,255,0.2)', color:'white', fontSize:13, fontWeight:500 }}>
                    {(lastScan.scanned_articles||0) - counts.critical - counts.warning} Clean
                  </div>
                  <Link to={`/scanner/results/${lastScan.id}`}
                    style={{ padding:'6px 14px', borderRadius:100, background:'rgba(255,255,255,0.15)', color:'white', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:5, marginLeft:'auto', textDecoration:'none' }}>
                    View full report <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:24 }}>
              <div style={{ fontSize:88, fontWeight:800, color:'rgba(255,255,255,0.2)', lineHeight:1, letterSpacing:-3 }}>—</div>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:15, lineHeight:1.6, maxWidth:400 }}>
                Your health score will appear here after your first scan. Run a scan above to get started.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Insight card: what this means ── */}
      {!activeScan && lastScan && total > 0 && (
        <div className="card animate-in" style={{ padding:'20px 22px', marginBottom:16, borderLeft:'4px solid var(--green)' }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16 }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
                <Zap size={14} style={{ color:'var(--green)' }} /> What this means for your team
              </p>
              <p style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.6 }}>
                You have <strong style={{ color: counts.critical > 0 ? 'var(--red)' : 'var(--amber)' }}>
                  {counts.critical > 0 ? `${counts.critical} critical issue${counts.critical !== 1 ? 's' : ''}` : `${counts.warning} warnings`}
                </strong> that are likely causing customers to struggle or contact support unnecessarily.
                {needed > 0 && <span> Fix <strong>{Math.min(counts.critical, Math.ceil(needed / 3))}</strong> critical issues to reach a Healthy score.</span>}
              </p>
            </div>
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:22, fontWeight:800, color:'var(--green)' }}>{timeSaved(total)}</div>
              <div style={{ fontSize:11, color:'var(--text-3)' }}>saved vs manual audit</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick wins ── */}
      {!activeScan && lastScan && quickWins.length > 0 && (
        <div className="card animate-in" style={{ marginBottom:16, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:1 }}>Fix these first</p>
              <p style={{ fontSize:12, color:'var(--text-3)' }}>Top issues to resolve from your last scan</p>
            </div>
            <Link to={`/scanner/results/${lastScan.id}`} className="btn btn-secondary btn-sm">
              See all issues <ArrowRight size={13} />
            </Link>
          </div>
          {quickWins.map((issue, i) => (
            <div key={issue.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 20px', borderBottom: i < quickWins.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background: issue.severity === 'critical' ? 'var(--red)' : 'var(--amber)' }} />
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {issue.scanned_articles?.title || 'Untitled article'}
                </p>
                <p style={{ fontSize:12, color:'var(--text-2)' }}>{issue.description}</p>
              </div>
              <span className={`badge badge-${issue.severity === 'critical' ? 'critical' : 'warning'}`} style={{ flexShrink:0 }}>
                {issue.severity}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Stats row ── */}
      {!activeScan && lastScan && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }} className="animate-in">
          {[
            { icon:<BookOpen size={16} style={{ color:'var(--green)' }} />, label:'Articles scanned', value: lastScan.scanned_articles?.toLocaleString() || 0, sub: `across ${recentScans.length} scan${recentScans.length !== 1 ? 's' : ''}` },
            { icon:<Clock size={16} style={{ color:'var(--amber)' }} />, label:'Time saved', value: timeSaved(total), sub: 'vs finding issues manually' },
            { icon:<CheckCircle size={16} style={{ color:'var(--green)' }} />, label:'Scans this month', value: recentScans.filter(s => new Date(s.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length, sub: 'last 30 days' },
          ].map(({ icon, label, value, sub }) => (
            <div key={label} className="card" style={{ padding:'16px 18px', display:'flex', gap:12, alignItems:'flex-start' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'var(--bg)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{icon}</div>
              <div>
                <p style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, marginBottom:3 }}>{label}</p>
                <p style={{ fontSize:22, fontWeight:800, color:'var(--text)', lineHeight:1, marginBottom:2 }}>{value}</p>
                <p style={{ fontSize:11, color:'var(--text-3)' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Scan history ── */}
      {recentScans.length > 0 && (
        <div className="card animate-in">
          <div style={{ padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:14, fontWeight:700 }}>Scan history</p>
            <span style={{ fontSize:12, color:'var(--text-3)' }}>{recentScans.length} total</span>
          </div>
          {recentScans.map(scan => {
            const h = calcHealth(scan)
            const isActive = scan.status==='running'||scan.status==='pending'
            return (
              <div key={scan.id}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--bg-hover)'; const d=e.currentTarget.querySelector('.del'); if(d) d.style.opacity='1' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; const d=e.currentTarget.querySelector('.del'); if(d) d.style.opacity='0' }}>
                <div style={{ width:40, height:40, borderRadius:10, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:800,
                  background: isActive ? 'var(--green-light)' : h>=80 ? 'var(--green-light)' : h>=60 ? 'var(--amber-light)' : 'var(--red-light)',
                  color: isActive ? 'var(--green)' : healthColor(h||0),
                }}>
                  {isActive ? <Loader size={15} className="spin" style={{ color:'var(--green)' }} /> : h ?? '—'}
                </div>
                <Link to={`/scanner/results/${scan.id}`} style={{ flex:1, minWidth:0, textDecoration:'none' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    {format(new Date(scan.created_at), 'MMM d, yyyy — h:mm a')}
                    {scan.preset && <span style={{ fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:100, background:'var(--green-light)', color:'var(--green)', border:'1px solid var(--green-border)' }}>{scan.preset}</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>
                    {isActive ? `${scan.scanned_articles||0} of ${scan.total_articles||'?'} articles · in progress`
                      : `${formatDistanceToNow(new Date(scan.created_at), { addSuffix:true })} · ${scan.scanned_articles?.toLocaleString()||0} articles`}
                  </div>
                </Link>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  {scan.critical_count > 0 && <span className="badge badge-critical"><AlertOctagon size={9} />{scan.critical_count}</span>}
                  {scan.warning_count  > 0 && <span className="badge badge-warning"><AlertTriangle size={9} />{scan.warning_count}</span>}
                  <ChevronRight size={14} style={{ color:'var(--text-3)' }} />
                </div>
                <button className="del btn btn-ghost btn-sm" onClick={() => deleteScan(scan.id)}
                  style={{ opacity:0, transition:'opacity 0.1s', color:'var(--text-3)', flexShrink:0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
