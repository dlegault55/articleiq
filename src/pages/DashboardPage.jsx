import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import {
  AlertTriangle, AlertOctagon, Info, CheckCircle,
  Scan, Plug, ArrowRight, Trash2, TrendingUp, TrendingDown,
  ChevronRight, Loader
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────
const healthScore = (scan) => {
  if (!scan?.scanned_articles) return null
  const penalty = ((scan.critical_count || 0) * 3 + (scan.warning_count || 0) + (scan.info_count || 0) * 0.2) / scan.scanned_articles
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}

const healthColor = (s) => s >= 80 ? 'var(--green)' : s >= 60 ? 'var(--amber)' : 'var(--red)'
const healthLabel = (s) => s >= 80 ? 'Healthy' : s >= 60 ? 'Needs attention' : 'Critical'

const PRESETS = [
  { value: 'fast',     label: 'Fast',     desc: 'Outdated + word count checks',           time: '~10 min / 1k articles' },
  { value: 'standard', label: 'Standard', desc: 'All quality checks + duplicates',        time: '~20 min / 1k articles' },
  { value: 'full',     label: 'Full',     desc: 'Everything including broken links',      time: '~30 min / 1k articles' },
]

export default function DashboardPage() {
  const { userId, profile } = useAuth()
  const { activeScan, recentScans, reload: reloadScans } = useScan()
  const toast = useToast()
  const navigate = useNavigate()

  const [connector,   setConnector]   = useState(null)
  const [hasConn,     setHasConn]     = useState(null) // null = loading
  const [preset,      setPreset]      = useState('standard')
  const [starting,    setStarting]    = useState(false)
  const [lastCounts,  setLastCounts]  = useState(null)
  const [error,       setError]       = useState(null)

  // Load connector
  useEffect(() => {
    if (!userId) return
    supabase.from('zendesk_connectors').select('*').eq('user_id', userId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        setConnector(data?.[0] || null)
        setHasConn(!!data?.length)
      })
  }, [userId])

  // Load real issue counts for last scan
  const completed = recentScans.filter(s => s.status === 'completed')
  const lastScan  = completed[0]
  const prevScan  = completed[1]

  useEffect(() => {
    if (!lastScan) return
    supabase.from('article_issues').select('severity').eq('scan_job_id', lastScan.id)
      .then(({ data }) => {
        if (!data) return
        setLastCounts({
          critical: data.filter(i => i.severity === 'critical').length,
          warning:  data.filter(i => i.severity === 'warning').length,
          info:     data.filter(i => i.severity === 'info').length,
        })
      })
  }, [lastScan?.id])

  const counts   = lastCounts || { critical: lastScan?.critical_count || 0, warning: lastScan?.warning_count || 0, info: lastScan?.info_count || 0 }
  const lastH    = lastScan ? healthScore({ ...lastScan, ...counts }) : null
  const prevH    = prevScan ? healthScore(prevScan) : null
  const trend    = lastH != null && prevH != null ? lastH - prevH : null

  const startScan = async () => {
    if (!userId || !connector) return
    setStarting(true); setError(null)
    try {
      const { data: job, error: jobErr } = await supabase
        .from('scan_jobs')
        .insert({ user_id: userId, connector_id: connector.id, status: 'pending', preset })
        .select().single()
      if (jobErr) throw new Error(jobErr.message)
      reloadScans()
      navigate(`/scanner/results/${job.id}`)
    } catch (e) {
      setError(e.message)
      setStarting(false)
    }
  }

  const deleteScan = async (scanId) => {
    const ok = await toast.confirm('Delete this scan and all its results?', 'Delete', 'Cancel')
    if (!ok) return
    await supabase.from('scan_jobs').delete().eq('id', scanId)
    toast.success('Scan deleted')
    reloadScans()
  }

  return (
    <div className="page-wide">

      {/* ── Active scan ── */}
      {activeScan && (
        <Link to={`/scanner/results/${activeScan.id}`}
          className="card animate-in"
          style={{ display: 'block', padding: '16px 20px', marginBottom: 24, textDecoration: 'none', borderColor: 'var(--green-border)', background: 'var(--green-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', margin: 0 }}>Scan in progress — keep this tab open</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  {activeScan.scanned_articles || 0} of {activeScan.total_articles || '?'} articles analyzed
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)', fontFamily: 'DM Mono' }}>
                {activeScan.total_articles ? `${Math.round((activeScan.scanned_articles / activeScan.total_articles) * 100)}%` : '...'}
              </span>
              <ArrowRight size={16} style={{ color: 'var(--green)' }} />
            </div>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: activeScan.total_articles ? `${Math.round((activeScan.scanned_articles / activeScan.total_articles) * 100)}%` : '2%' }} />
          </div>
        </Link>
      )}

      {/* ── No connector prompt ── */}
      {!activeScan && hasConn === false && (
        <div className="card card-padded animate-in" style={{ marginBottom: 24, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ width: 48, height: 48, background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Plug size={22} style={{ color: 'var(--green)' }} />
          </div>
          <h2 style={{ marginBottom: 8 }}>Connect your knowledge base</h2>
          <p style={{ fontSize: 14, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
            Connect your Zendesk account to start scanning your articles for quality issues.
          </p>
          <Link to="/connector" className="btn btn-primary">
            <Plug size={14} /> Connect Zendesk
          </Link>
        </div>
      )}

      {/* ── Main grid ── */}
      {!activeScan && hasConn && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24 }}>

          {/* Health score */}
          <div className="card card-padded animate-in">
            <p className="section-label">Knowledge Base Health</p>
            {lastScan ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 80, fontWeight: 700, color: healthColor(lastH), lineHeight: 1, fontFamily: 'DM Mono', letterSpacing: -2 }}>
                      {lastH}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: healthColor(lastH), marginTop: 4 }}>{healthLabel(lastH)}</div>
                  </div>
                  <div style={{ paddingBottom: 8 }}>
                    {trend !== null && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 20, marginBottom: 8,
                        background: trend > 0 ? 'var(--green-light)' : trend < 0 ? 'var(--red-light)' : 'var(--bg-hover)',
                        color: trend > 0 ? 'var(--green)' : trend < 0 ? 'var(--red)' : 'var(--text-muted)',
                        border: `1px solid ${trend > 0 ? 'var(--green-border)' : trend < 0 ? 'var(--red-border)' : 'var(--border)'}`,
                      }}>
                        {trend > 0 ? <TrendingUp size={12} /> : trend < 0 ? <TrendingDown size={12} /> : null}
                        {trend > 0 ? '+' : ''}{trend} vs previous scan
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                      Scanned {formatDistanceToNow(new Date(lastScan.created_at), { addSuffix: true })}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {lastScan.scanned_articles?.toLocaleString()} articles
                    </p>
                  </div>
                </div>

                {/* Issue breakdown */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Critical', value: counts.critical, color: 'var(--red)',   bg: 'var(--red-light)',   border: 'var(--red-border)',   icon: AlertOctagon },
                    { label: 'Warnings', value: counts.warning,  color: 'var(--amber)', bg: 'var(--amber-light)', border: 'var(--amber-border)', icon: AlertTriangle },
                    { label: 'Info',     value: counts.info,     color: 'var(--blue)',  bg: 'var(--blue-light)',  border: 'var(--blue-border)',  icon: Info },
                  ].map(({ label, value, color, bg, border, icon: Icon }) => (
                    <div key={label} style={{ padding: '12px', borderRadius: 8, background: bg, border: `1px solid ${border}`, textAlign: 'center' }}>
                      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: 'DM Mono', lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 11, color, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, opacity: 0.8 }}>
                        <Icon size={10} />{label}
                      </div>
                    </div>
                  ))}
                </div>

                <Link to={`/scanner/results/${lastScan.id}`} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                  View full report <ArrowRight size={14} />
                </Link>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 64, fontWeight: 700, color: 'var(--border-dark)', fontFamily: 'DM Mono', lineHeight: 1, marginBottom: 12 }}>—</div>
                <p style={{ fontSize: 14 }}>Run your first scan to see your health score</p>
              </div>
            )}
          </div>

          {/* Scan launcher */}
          <div className="card card-padded animate-in" style={{ animationDelay: '0.05s' }}>
            <p className="section-label">New Scan</p>
            {connector && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 6, marginBottom: 16 }}>
                <CheckCircle size={12} style={{ color: 'var(--green)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {connector.subdomain}.zendesk.com
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {PRESETS.map(({ value, label, desc, time }) => (
                <button key={value} onClick={() => setPreset(value)}
                  style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s', border: 'none',
                    background: preset === value ? 'var(--green-light)' : 'var(--bg)',
                    outline: preset === value ? '1.5px solid var(--green-border)' : '1.5px solid var(--border)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: preset === value ? 'var(--green)' : 'var(--text-primary)' }}>{label}</span>
                    {preset === value && <CheckCircle size={13} style={{ color: 'var(--green)' }} />}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'DM Mono' }}>{time}</div>
                </button>
              ))}
            </div>

            {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{error}</p>}

            <button onClick={startScan} disabled={starting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
              {starting ? <Loader size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Scan size={14} />}
              {starting ? 'Starting...' : 'Start Scan'}
            </button>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 10 }}>
              Keep this tab open while scanning
            </p>
          </div>
        </div>
      )}

      {/* ── Scan history ── */}
      {recentScans.length > 0 && (
        <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <p className="section-label" style={{ marginBottom: 0 }}>Scan History</p>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'DM Mono' }}>{recentScans.length} scans</span>
          </div>
          {recentScans.map(scan => {
            const h = healthScore(scan)
            const isActive = scan.status === 'running' || scan.status === 'pending'
            return (
              <div key={scan.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.querySelector('.del')?.style && (e.currentTarget.querySelector('.del').style.opacity = '1') }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.del')?.style && (e.currentTarget.querySelector('.del').style.opacity = '0') }}>
                {/* Status */}
                <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isActive ? 'var(--amber)' : scan.status === 'completed' ? 'var(--green)' : 'var(--red)' }} />

                <Link to={`/scanner/results/${scan.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {format(new Date(scan.created_at), 'MMM d, yyyy — h:mm a')}
                      {scan.preset && (
                        <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--green-light)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: 10, fontFamily: 'DM Mono' }}>
                          {scan.preset}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                      {isActive
                        ? `${scan.scanned_articles || 0} of ${scan.total_articles || '?'} articles — in progress`
                        : `${formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })} · ${scan.scanned_articles?.toLocaleString() || 0} articles`
                      }
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {h != null && !isActive && (
                      <span style={{ fontSize: 16, fontWeight: 700, color: healthColor(h), fontFamily: 'DM Mono', minWidth: 28, textAlign: 'right' }}>{h}</span>
                    )}
                    {scan.critical_count > 0 && <span className="badge badge-critical"><AlertOctagon size={10} />{scan.critical_count}</span>}
                    {scan.warning_count  > 0 && <span className="badge badge-warning"><AlertTriangle size={10} />{scan.warning_count}</span>}
                    <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </Link>

                <button className="del btn btn-ghost btn-sm" onClick={() => deleteScan(scan.id)}
                  style={{ opacity: 0, transition: 'opacity 0.1s', color: 'var(--text-muted)', flexShrink: 0 }}>
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
