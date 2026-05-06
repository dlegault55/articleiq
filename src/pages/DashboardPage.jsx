import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useConnector } from '@/hooks/useConnector'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { PageSkeleton } from '@/components/ui'
import {
  Scan, AlertOctagon, AlertTriangle, Info, ArrowRight, Plug,
  Loader, Zap, CheckCircle, TrendingUp, TrendingDown, Minus,
  Trash2, ChevronRight, Clock, XCircle, Eye, EyeOff, ChevronDown
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────
const calcHealth = (scan) => {
  if (!scan?.scanned_articles) return null
  const total   = scan.scanned_articles
  const penalty = ((scan.critical_count || 0) * 3 + (scan.warning_count || 0) + (scan.info_count || 0) * 0.2) / total
  return Math.max(0, Math.min(100, Math.round(100 - penalty * 20)))
}

const healthColor = (s) => {
  if (s == null) return 'var(--text-muted)'
  if (s >= 80) return 'var(--xbox)'
  if (s >= 60) return 'var(--badge-warning-color)'
  if (s >= 40) return '#f97316'
  return 'var(--badge-critical-color)'
}

const healthLabel = (s) => {
  if (s == null) return 'No data yet'
  if (s >= 80) return 'Healthy'
  if (s >= 60) return 'Needs attention'
  if (s >= 40) return 'Poor'
  return 'Critical'
}

const calculateNextSync = (f) => {
  const d = new Date()
  if (f === 'daily')   d.setDate(d.getDate() + 1)
  if (f === 'weekly')  d.setDate(d.getDate() + 7)
  if (f === 'monthly') d.setDate(d.getDate() + 30)
  return d.toISOString()
}

const PRESETS = [
  { value: 'fast',     label: 'Fast',     desc: 'Outdated + word count',   icon: '⚡', time: '~10 min / 1k articles' },
  { value: 'standard', label: 'Standard', desc: 'All quality checks',      icon: '🔍', time: '~20 min / 1k articles' },
  { value: 'full',     label: 'Full',     desc: 'All checks + duplicates', icon: '🔬', time: '~30 min / 1k articles' },
]

// ─── ConnectorForm ─────────────────────────────────────────────
function ConnectorForm({ onSaved }) {
  const { userId } = useAuth()
  const [form, setForm]       = useState({ subdomain: '', email: '', token: '' })
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  const save = async () => {
    if (!userId || !form.subdomain || !form.email || !form.token) {
      setError('All fields are required.')
      return
    }
    setSaving(true); setError(null)
    try {
      const { error: dbErr } = await supabase.from('zendesk_connectors').upsert({
        user_id: userId,
        subdomain: form.subdomain.trim().toLowerCase(),
        api_key_encrypted: `${form.email}/token:${form.token}`,
        api_key_hint: `...${form.token.slice(-6)}`,
        label: 'Zendesk',
        sync_frequency: 'weekly',
        next_sync_at: calculateNextSync('weekly'),
      }, { onConflict: 'user_id,subdomain' })
      if (dbErr) throw new Error(dbErr.message)
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 440 }}>
      <div style={{ display: 'flex' }}>
        <input className="input rounded-r-none" placeholder="yourcompany"
          value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} />
        <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderLeft: 'none', borderRadius: '0 7px 7px 0', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          .zendesk.com
        </div>
      </div>
      <input className="input" type="email" placeholder="your@email.com"
        value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      <div style={{ position: 'relative' }}>
        <input className="input" style={{ paddingRight: 40 }} type={showKey ? 'text' : 'password'}
          placeholder="API token"
          value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} />
        <button onClick={() => setShowKey(v => !v)}
          style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '-4px 0 0' }}>
        Zendesk Admin → Apps & Integrations → APIs → Zendesk API → API Tokens
      </p>
      {error && <p style={{ fontSize: 13, color: 'var(--badge-critical-color)', margin: 0 }}>{error}</p>}
      <button onClick={save} disabled={saving} className="btn-primary" style={{ alignSelf: 'flex-start' }}>
        {saving ? <Loader size={13} className="animate-spin" /> : <Plug size={13} />}
        {saving ? 'Connecting...' : 'Connect Zendesk'}
      </button>
    </div>
  )
}

// ─── Preset picker modal ────────────────────────────────────────
function PresetPicker({ current, onSelect, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, width: 340, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        onClick={e => e.stopPropagation()}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Choose scan depth</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRESETS.map(({ value, label, desc, icon, time }) => (
            <button key={value} onClick={() => { onSelect(value); onClose() }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                background: current === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                border: `1px solid ${current === value ? 'var(--xbox-border)' : 'var(--border)'}`,
              }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: current === value ? 'var(--xbox)' : 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc} · {time}</div>
              </div>
              {current === value && <CheckCircle size={14} style={{ color: 'var(--xbox)', flexShrink: 0 }} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile, userId } = useAuth()
  const { hasConnector, connector, reload: reloadConnector } = useConnector()
  const { activeScan, recentScans, reload: reloadScans } = useScan()
  const toast    = useToast()
  const navigate = useNavigate()

  const [activeConnector, setActiveConnector] = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [starting,        setStarting]        = useState(false)
  const [error,           setError]           = useState(null)
  const [preset,          setPreset]          = useState('standard')
  const [showPresets,     setShowPresets]     = useState(false)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const load = async () => {
      const { data } = await supabase.from('zendesk_connectors').select('*')
        .eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1)
      setActiveConnector(data?.[0] || connector || null)
      setLoading(false)
    }
    load()
  }, [userId, connector])

  const startScan = async () => {
    const conn = activeConnector || connector
    if (!userId || !conn) return
    setStarting(true); setError(null)
    try {
      const { data: job, error: jobErr } = await supabase
        .from('scan_jobs')
        .insert({ user_id: userId, connector_id: conn.id, status: 'pending', preset })
        .select().single()
      if (jobErr) throw new Error(jobErr.message)
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

  if (loading) return <PageSkeleton />

  const completed  = recentScans.filter(s => s.status === 'completed')
  const lastScan   = completed[0]
  const prevScan   = completed[1]
  const lastHealth = calcHealth(lastScan)
  const prevHealth = calcHealth(prevScan)
  const trend      = lastHealth != null && prevHealth != null ? lastHealth - prevHealth : null
  const selectedPreset = PRESETS.find(p => p.value === preset)

  return (
    <div style={{ padding: '32px 40px', maxWidth: 860, margin: '0 auto' }} className="animate-fade-in">
      <style>{`@keyframes aiq-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      {showPresets && <PresetPicker current={preset} onSelect={setPreset} onClose={() => setShowPresets(false)} />}

      {/* ── SECTION 1: STATUS ────────────────────────────────── */}

      {/* Active scan — takes over when running */}
      {activeScan ? (
        <Link to={`/scanner/results/${activeScan.id}`} style={{ display: 'block', textDecoration: 'none', marginBottom: 32 }}>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '2px solid var(--xbox-border)', background: 'var(--xbox-subtle)' }}>
            <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--xbox)', boxShadow: '0 0 8px var(--xbox)', animation: 'aiq-pulse 1.5s infinite', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--xbox)', margin: 0 }}>Scan in progress</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{activeScan.scanned_articles || 0}</strong>
                    {' '}of{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{activeScan.total_articles || '?'}</strong>
                    {' '}articles
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--xbox)', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>
                  {activeScan.total_articles
                    ? `${Math.round((activeScan.scanned_articles / activeScan.total_articles) * 100)}%`
                    : '...'}
                </span>
                <ArrowRight size={18} style={{ color: 'var(--xbox)' }} />
              </div>
            </div>
            {/* Progress bar */}
            <div style={{ height: 4, background: 'var(--bg-overlay)' }}>
              <div style={{ height: '100%', background: 'var(--xbox)', boxShadow: '0 0 6px var(--xbox)', transition: 'width 1s ease',
                width: activeScan.total_articles ? `${Math.round((activeScan.scanned_articles / activeScan.total_articles) * 100)}%` : '2%' }} />
            </div>
            <div style={{ padding: '8px 24px', background: 'rgba(16,124,16,0.04)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--xbox)' }}>⚠ Keep this tab open</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>— closing it will pause the scan</span>
            </div>
          </div>
        </Link>
      ) : (
        /* Health score hero */
        <div style={{ marginBottom: 32 }}>
          {lastScan ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 32 }}>
              {/* Big number */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 96, fontWeight: 900, color: healthColor(lastHealth), lineHeight: 1, fontFamily: 'Inter, sans-serif', letterSpacing: -4 }}>
                  {lastHealth}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Health score</div>
              </div>

              {/* Status details */}
              <div style={{ paddingTop: 12, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: healthColor(lastHealth) }}>{healthLabel(lastHealth)}</span>
                  {trend !== null && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 500,
                      color: trend > 0 ? 'var(--xbox)' : trend < 0 ? 'var(--badge-critical-color)' : 'var(--text-muted)',
                      padding: '2px 8px', borderRadius: 20,
                      background: trend > 0 ? 'var(--xbox-subtle)' : trend < 0 ? 'rgba(239,68,68,0.1)' : 'var(--bg-overlay)',
                      border: `1px solid ${trend > 0 ? 'var(--xbox-border)' : trend < 0 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                    }}>
                      {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                      {trend > 0 ? '+' : ''}{trend} vs last scan
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                  Last scanned {formatDistanceToNow(new Date(lastScan.created_at), { addSuffix: true })} · {lastScan.scanned_articles?.toLocaleString()} articles
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {[
                    { label: 'Critical', value: lastScan.critical_count || 0, color: 'var(--badge-critical-color)', icon: AlertOctagon },
                    { label: 'Warnings', value: lastScan.warning_count  || 0, color: 'var(--badge-warning-color)',  icon: AlertTriangle },
                    { label: 'Info',     value: lastScan.info_count     || 0, color: 'var(--badge-info-color)',     icon: Info },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon size={13} style={{ color }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                  ))}
                  <Link to={`/scanner/results/${lastScan.id}`} className="btn-ghost" style={{ fontSize: 12, marginLeft: 4 }}>
                    View report <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* No scans yet */
            <div style={{ paddingBottom: 8 }}>
              {hasConnector === false ? (
                <>
                  <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 28, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: -0.5 }}>
                    Welcome to ArticleIQ
                  </h1>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Connect your Zendesk account to get started.</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 96, fontWeight: 900, color: 'var(--text-muted)', lineHeight: 1, fontFamily: 'Inter, sans-serif', letterSpacing: -4, opacity: 0.15 }}>—</div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8 }}>Run your first scan to see your knowledge base health score.</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 2: ACTION ────────────────────────────────── */}

      {!activeScan && (
        <div style={{ marginBottom: 40 }}>
          {hasConnector === false ? (
            /* Connect form */
            <div style={{ padding: '28px 32px', borderRadius: 12, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plug size={16} style={{ color: 'var(--xbox)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Connect Zendesk</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Read-only — we never modify your articles</p>
                </div>
              </div>
              <ConnectorForm onSaved={() => { reloadConnector(); setLoading(true) }} />
            </div>
          ) : (
            /* Scan launcher */
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={startScan} disabled={starting} className="btn-primary"
                style={{ fontSize: 14, padding: '10px 24px', height: 44 }}>
                {starting ? <Loader size={15} className="animate-spin" /> : <Scan size={15} />}
                {starting ? 'Starting...' : 'Start Scan'}
              </button>

              {/* Preset selector — compact */}
              <button onClick={() => setShowPresets(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 44, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-elevated)', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--xbox-border)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <span style={{ fontSize: 16 }}>{selectedPreset?.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedPreset?.label}</span>
                <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
              </button>

              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {selectedPreset?.time} · keep tab open
              </span>

              {error && <span style={{ fontSize: 12, color: 'var(--badge-critical-color)' }}>{error}</span>}
            </div>
          )}

          {/* Pro upsell — subtle */}
          {profile?.plan !== 'paid' && hasConnector && (
            <Link to="/billing" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--xbox)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <Zap size={12} />
              Unlock AI features with Pro
            </Link>
          )}
        </div>
      )}

      {/* ── SECTION 3: HISTORY ───────────────────────────────── */}
      {recentScans.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
            Scan History
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentScans.map((scan, i) => {
              const health = calcHealth(scan)
              return (
                <div key={scan.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, transition: 'background 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.querySelector('.del-btn').style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.del-btn').style.opacity = '0' }}>

                  {/* Status dot */}
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: scan.status === 'completed' ? 'var(--xbox)' : scan.status === 'running' ? '#FCD34D' : scan.status === 'failed' ? 'var(--badge-critical-color)' : 'var(--text-muted)'
                  }} />

                  <Link to={`/scanner/results/${scan.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {format(new Date(scan.created_at), 'MMM d, yyyy')}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>
                          {format(new Date(scan.created_at), 'h:mm a')}
                        </span>
                        {scan.preset && (
                          <span style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px', background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'Fira Code, monospace', textTransform: 'capitalize' }}>
                            {scan.preset}
                          </span>
                        )}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 10 }}>
                        {scan.scanned_articles?.toLocaleString() || 0} articles
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      {/* Health score */}
                      {health !== null && (
                        <span style={{ fontSize: 15, fontWeight: 800, color: healthColor(health), fontFamily: 'Inter, sans-serif', minWidth: 28, textAlign: 'right' }}>
                          {health}
                        </span>
                      )}
                      {/* Issue badges */}
                      {scan.critical_count > 0 && (
                        <span className="badge-critical"><AlertOctagon size={9} />{scan.critical_count}</span>
                      )}
                      {scan.warning_count > 0 && (
                        <span className="badge-warning"><AlertTriangle size={9} />{scan.warning_count}</span>
                      )}
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </Link>

                  <button className="del-btn btn-ghost" onClick={() => deleteScan(scan.id)}
                    style={{ padding: '3px 5px', color: 'var(--text-muted)', opacity: 0, transition: 'opacity 0.1s, color 0.1s', flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--badge-critical-color)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
