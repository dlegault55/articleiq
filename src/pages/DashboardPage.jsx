import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { AlertOctagon, AlertTriangle, CheckCircle, Scan, Plug, ArrowRight, Trash2, ChevronRight, Loader, TrendingUp, TrendingDown } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

const calcHealth = (scan) => {
  if (!scan?.scanned_articles) return null
  const penalty = ((scan.critical_count||0)*3 + (scan.warning_count||0) + (scan.info_count||0)*0.2) / scan.scanned_articles
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}
const healthColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'
const healthLabel = (s) => s >= 80 ? 'Healthy' : s >= 60 ? 'Needs attention' : 'Critical'

const PRESETS = [
  { value: 'fast',     label: 'Fast',     icon: '⚡', time: '~10 min / 1k' },
  { value: 'standard', label: 'Standard', icon: '🔍', time: '~20 min / 1k' },
  { value: 'full',     label: 'Full',     icon: '🔬', time: '~30 min / 1k' },
]

export default function DashboardPage() {
  const { userId, profile } = useAuth()
  const { activeScan, recentScans, reload: reloadScans } = useScan()
  const toast = useToast()
  const navigate = useNavigate()

  const [connector, setConnector] = useState(null)
  const [hasConn,   setHasConn]   = useState(null)
  const [preset,    setPreset]    = useState('standard')
  const [starting,  setStarting]  = useState(false)
  const [lastCounts,setLastCounts]= useState(null)
  const [error,     setError]     = useState(null)

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
    supabase.from('article_issues').select('severity').eq('scan_job_id', lastScan.id)
      .then(({ data }) => data && setLastCounts({
        critical: data.filter(i => i.severity==='critical').length,
        warning:  data.filter(i => i.severity==='warning').length,
        info:     data.filter(i => i.severity==='info').length,
      }))
  }, [lastScan?.id])

  const counts  = lastCounts || { critical: lastScan?.critical_count||0, warning: lastScan?.warning_count||0, info: lastScan?.info_count||0 }
  const lastH   = lastScan ? calcHealth({...lastScan, ...counts}) : null
  const prevH   = prevScan ? calcHealth(prevScan) : null
  const trend   = lastH!=null && prevH!=null ? lastH - prevH : null

  const startScan = async () => {
    if (!userId || !connector) return
    setStarting(true); setError(null)
    try {
      const { data: job, error: jobErr } = await supabase.from('scan_jobs')
        .insert({ user_id: userId, connector_id: connector.id, status: 'pending', preset })
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
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

      {/* Active scan banner */}
      {activeScan && (
        <Link to={`/scanner/results/${activeScan.id}`}
          style={{ display:'block', textDecoration:'none', marginBottom: 20 }}>
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
                <span style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:800, color:'white' }}>
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

      {/* No connector */}
      {!activeScan && hasConn === false && (
        <div className="card animate-in" style={{ padding:'48px 32px', textAlign:'center', marginBottom: 20 }}>
          <div style={{ width:52, height:52, background:'var(--green-light)', border:'1.5px solid var(--green-border)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Plug size={24} style={{ color:'var(--green)' }} />
          </div>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:700, marginBottom:8 }}>Connect your knowledge base</h2>
          <p style={{ fontSize:14, color:'var(--text-2)', marginBottom:24, maxWidth:340, margin:'0 auto 24px' }}>
            Connect Zendesk to start scanning your articles for quality issues.
          </p>
          <Link to="/connector" className="btn btn-primary btn-lg">
            <Plug size={16} /> Connect Zendesk
          </Link>
        </div>
      )}

      {/* Hero health score */}
      {!activeScan && hasConn && (
        <div style={{ borderRadius:'var(--radius-xl)', background:'var(--green)', padding:'28px 28px 24px', marginBottom:16, position:'relative', overflow:'hidden' }} className="animate-in">
          <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />
          <div style={{ position:'absolute', bottom:-60, right:80, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.04)' }} />

          <p style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', marginBottom:6 }}>
            Knowledge Base Health {lastScan ? `· Last scan ${formatDistanceToNow(new Date(lastScan.created_at), { addSuffix: true })}` : ''}
          </p>

          {lastScan ? (
            <>
              <div style={{ display:'flex', alignItems:'flex-end', gap:16, marginBottom:4 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontSize:96, fontWeight:800, color:'white', lineHeight:1, letterSpacing:-4 }}>{lastH}</div>
                <div style={{ paddingBottom:12 }}>
                  <div style={{ fontSize:18, fontWeight:700, color:'rgba(255,255,255,0.9)', marginBottom:4 }}>{healthLabel(lastH)}</div>
                  {trend !== null && (
                    <div style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:13, fontWeight:600, padding:'4px 12px', borderRadius:100, background:'rgba(255,255,255,0.15)', color:'white' }}>
                      {trend > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                      {trend > 0 ? '+' : ''}{trend} vs previous
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {counts.critical > 0 && (
                  <div style={{ padding:'6px 14px', borderRadius:100, background:'#FF4444', color:'white', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                    <AlertOctagon size={13} /> {counts.critical} Critical
                  </div>
                )}
                {counts.warning > 0 && (
                  <div style={{ padding:'6px 14px', borderRadius:100, background:'#FFD93D', color:'#1A1A00', fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
                    <AlertTriangle size={13} /> {counts.warning} Warnings
                  </div>
                )}
                <div style={{ padding:'6px 14px', borderRadius:100, background:'rgba(255,255,255,0.2)', color:'white', fontSize:13, fontWeight:600 }}>
                  {(lastScan.scanned_articles||0) - counts.critical - counts.warning} Clean
                </div>
                <Link to={`/scanner/results/${lastScan.id}`}
                  style={{ padding:'6px 14px', borderRadius:100, background:'rgba(255,255,255,0.15)', color:'white', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:5, marginLeft:'auto' }}>
                  View report <ArrowRight size={13} />
                </Link>
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontFamily:'Syne,sans-serif', fontSize:96, fontWeight:800, color:'rgba(255,255,255,0.2)', lineHeight:1, letterSpacing:-4 }}>—</div>
              <p style={{ color:'rgba(255,255,255,0.6)', fontSize:15, marginTop:8 }}>Run your first scan to see your health score</p>
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      {!activeScan && hasConn && lastScan && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }} className="animate-in">
          {[
            { label:'Articles scanned', value: lastScan.scanned_articles?.toLocaleString() || 0, sub: `${recentScans.length} total scans` },
            { label:'Scans this month', value: recentScans.filter(s => new Date(s.created_at) > new Date(Date.now() - 30*24*60*60*1000)).length, sub: 'last 30 days' },
            { label:'Issues resolved', value: 0, sub: 'across all scans' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="card" style={{ padding:'18px 20px' }}>
              <p style={{ fontSize:12, color:'var(--text-3)', fontWeight:600, marginBottom:6 }}>{label}</p>
              <p style={{ fontFamily:'Syne,sans-serif', fontSize:28, fontWeight:700, color:'var(--text)', lineHeight:1, marginBottom:4 }}>{value}</p>
              <p style={{ fontSize:11, color:'var(--text-3)' }}>{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Scan launcher */}
      {!activeScan && hasConn && (
        <div className="card animate-in" style={{ padding:'22px 24px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:15, fontWeight:700, color:'var(--text)' }}>Run a new scan</p>
            {connector && (
              <span style={{ fontSize:12, color:'var(--text-3)', display:'flex', alignItems:'center', gap:5 }}>
                <CheckCircle size={12} style={{ color:'var(--green)' }} />
                {connector.subdomain}.zendesk.com
              </span>
            )}
          </div>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            {PRESETS.map(({ value, label, icon, time }) => (
              <button key={value} onClick={() => setPreset(value)}
                style={{ flex:1, padding:'14px 10px', borderRadius:14, cursor:'pointer', textAlign:'center', border:'2px solid transparent', transition:'all 0.12s',
                  background: preset===value ? 'var(--green-light)' : 'var(--bg)',
                  borderColor: preset===value ? 'var(--green-border)' : 'transparent',
                  outline: preset!==value ? '1.5px solid var(--border-md)' : 'none',
                }}>
                <div style={{ fontSize:22, marginBottom:5 }}>{icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color: preset===value ? 'var(--green)' : 'var(--text)', marginBottom:2 }}>{label}</div>
                <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'monospace' }}>{time}</div>
              </button>
            ))}
          </div>
          {error && <p style={{ fontSize:12, color:'var(--red)', marginBottom:12 }}>{error}</p>}
          <button onClick={startScan} disabled={starting} className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }}>
            {starting ? <Loader size={16} className="spin" /> : <Scan size={16} />}
            {starting ? 'Starting...' : `Start ${PRESETS.find(p=>p.value===preset)?.label} Scan`}
          </button>
          <p style={{ fontSize:11, color:'var(--text-3)', textAlign:'center', marginTop:10 }}>Keep this tab open while scanning</p>
        </div>
      )}

      {/* History */}
      {recentScans.length > 0 && (
        <div className="card animate-in">
          <div style={{ padding:'16px 22px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'var(--text)' }}>Recent scans</p>
            <span style={{ fontSize:12, color:'var(--text-3)' }}>{recentScans.length} total</span>
          </div>
          {recentScans.map(scan => {
            const h = calcHealth(scan)
            const isActive = scan.status==='running'||scan.status==='pending'
            return (
              <div key={scan.id}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 22px', borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background='var(--bg-hover)'; const d=e.currentTarget.querySelector('.del'); if(d) d.style.opacity='1' }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; const d=e.currentTarget.querySelector('.del'); if(d) d.style.opacity='0' }}>

                {/* Score box */}
                <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:800,
                  background: isActive ? 'var(--green-light)' : h>=80 ? 'var(--green-light)' : h>=60 ? 'var(--amber-light)' : 'var(--red-light)',
                  color: isActive ? 'var(--green)' : healthColor(h),
                }}>
                  {isActive ? <Loader size={16} className="spin" style={{ color:'var(--green)' }} /> : h ?? '—'}
                </div>

                <Link to={`/scanner/results/${scan.id}`} style={{ flex:1, minWidth:0, textDecoration:'none' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    {format(new Date(scan.created_at), 'MMM d, yyyy — h:mm a')}
                    {scan.preset && <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100, background:'var(--green-light)', color:'var(--green)', border:'1px solid var(--green-border)' }}>{scan.preset}</span>}
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>
                    {isActive ? `${scan.scanned_articles||0} of ${scan.total_articles||'?'} articles · in progress`
                      : `${formatDistanceToNow(new Date(scan.created_at), { addSuffix:true })} · ${scan.scanned_articles?.toLocaleString()||0} articles`}
                  </div>
                </Link>

                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  {scan.critical_count > 0 && <span className="badge badge-critical"><AlertOctagon size={10} />{scan.critical_count}</span>}
                  {scan.warning_count  > 0 && <span className="badge badge-warning"><AlertTriangle size={10} />{scan.warning_count}</span>}
                  <ChevronRight size={15} style={{ color:'var(--text-3)' }} />
                </div>

                <button className="del btn btn-ghost btn-sm" onClick={() => deleteScan(scan.id)}
                  style={{ opacity:0, transition:'opacity 0.1s', color:'var(--text-3)', flexShrink:0 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
