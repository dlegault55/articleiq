import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useConnector } from '@/hooks/useConnector'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { PageSkeleton, EmptyState } from '@/components/ui'
import {
  Scan, AlertOctagon, AlertTriangle, Info, ArrowRight, Plug, Loader,
  Zap, CheckCircle, TrendingUp, TrendingDown, Minus, Trash2,
  ChevronRight, Clock, XCircle, Eye, EyeOff, BarChart3
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatDistanceToNow, format } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────
const calcHealth = (scan) => {
  if (!scan?.scanned_articles) return null
  const total   = scan.scanned_articles
  const penalty = ((scan.critical_count || 0) * 3 + (scan.warning_count || 0) * 1 + (scan.info_count || 0) * 0.2) / total
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
  if (s == null) return '—'
  if (s >= 80) return 'Healthy'
  if (s >= 60) return 'Needs attention'
  if (s >= 40) return 'Poor'
  return 'Critical'
}

const calculateNextSync = (frequency) => {
  const d = new Date()
  if (frequency === 'daily')   d.setDate(d.getDate() + 1)
  if (frequency === 'weekly')  d.setDate(d.getDate() + 7)
  if (frequency === 'monthly') d.setDate(d.getDate() + 30)
  return d.toISOString()
}

const PRESETS = [
  { value: 'fast',     label: 'Fast',     desc: 'Outdated + word count',   icon: '⚡', time: '~10 min / 1k articles' },
  { value: 'standard', label: 'Standard', desc: 'All quality checks',      icon: '🔍', time: '~20 min / 1k articles' },
  { value: 'full',     label: 'Full',     desc: 'All checks + duplicates', icon: '🔬', time: '~30 min / 1k articles' },
]

// ─── ConnectorForm ────────────────────────────────────────────
function ConnectorForm({ onSaved }) {
  const { userId } = useAuth()
  const [form, setForm]       = useState({ subdomain: '', email: '', token: '', frequency: 'weekly' })
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  const save = async () => {
    if (!userId)                                         { setError('Not signed in. Please refresh.'); return }
    if (!form.subdomain || !form.email || !form.token)   { setError('All three fields are required.'); return }
    setSaving(true); setError(null)
    try {
      const { error: dbErr } = await supabase.from('zendesk_connectors').upsert({
        user_id:           userId,
        subdomain:         form.subdomain.trim().toLowerCase(),
        api_key_encrypted: `${form.email}/token:${form.token}`,
        api_key_hint:      `...${form.token.slice(-6)}`,
        label:             'Zendesk',
        sync_frequency:    form.frequency,
        next_sync_at:      calculateNextSync(form.frequency),
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
    <div className="space-y-4 max-w-md">
      <div>
        <label className="label">Zendesk Subdomain</label>
        <div className="flex items-center">
          <input className="input rounded-r-none" placeholder="yourcompany"
            value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} />
          <div className="px-3 py-2 text-sm rounded-r-md border border-l-0"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-sunken)', color: 'var(--text-muted)' }}>
            .zendesk.com
          </div>
        </div>
      </div>
      <div>
        <label className="label">Zendesk Email</label>
        <input className="input" type="email" placeholder="you@yourcompany.com"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>
      <div>
        <label className="label">API Token</label>
        <div className="relative">
          <input className="input pr-10" type={showKey ? 'text' : 'password'}
            placeholder="your-zendesk-api-token"
            value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} />
          <button onClick={() => setShowKey(v => !v)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          Zendesk Admin → Apps & Integrations → APIs → Zendesk API → API Tokens
        </p>
      </div>
      {error && <p style={{ fontSize: 13, color: 'var(--badge-critical-color)' }}>{error}</p>}
      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? <Loader size={13} className="animate-spin" /> : <Plug size={13} />}
        {saving ? 'Connecting...' : 'Connect & Continue'}
      </button>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile, userId } = useAuth()
  const { hasConnector, connector, reload: reloadConnector } = useConnector()
  const { activeScan, recentScans, reload: reloadScans } = useScan()
  const toast   = useToast()
  const navigate = useNavigate()

  const [preset,    setPreset]    = useState('standard')
  const [connector2,setConnector2]= useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [chartMode, setChartMode] = useState('health')
  const prevActiveScan = useRef(null)

  // Load connector
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const load = async () => {
      const { data } = await supabase.from('zendesk_connectors').select('*').eq('user_id', userId).eq('is_active', true).order('created_at', { ascending: false }).limit(1)
      setConnector2(data?.[0] || connector || null)
      setLoading(false)
    }
    load()
  }, [userId, connector])

  // Auto-navigate when scan completes
  useEffect(() => {
    if (prevActiveScan.current && !activeScan) {
      const completed = recentScans.find(s => s.status === 'completed')
      if (completed) navigate(`/scanner/results/${completed.id}`)
    }
    prevActiveScan.current = activeScan
  }, [activeScan, recentScans])

  const startScan = async () => {
    const conn = connector2 || connector
    if (!userId) { setError('Not signed in.'); return }
    if (!conn)   { setError('No connector found.'); return }
    setError(null)
    try {
      const { data: job, error: jobErr } = await supabase
        .from('scan_jobs')
        .insert({ user_id: userId, connector_id: conn.id, status: 'pending', preset })
        .select().single()
      if (jobErr) throw new Error(jobErr.message)

      // ScanContext detects pending scan and drives chunks automatically
      navigate(`/scanner/results/${job.id}`)

    } catch (e) {
      setError(e.message)
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

  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName   = profile?.full_name?.split(' ')[0]
  const completed   = recentScans.filter(s => s.status === 'completed')
  const lastScan    = completed[0]
  const prevScan    = completed[1]
  const lastHealth  = calcHealth(lastScan)
  const prevHealth  = calcHealth(prevScan)
  const healthTrend = lastHealth != null && prevHealth != null ? lastHealth - prevHealth : null

  const chartData = completed.slice().reverse().map(s => ({
    name:     format(new Date(s.created_at), 'MMM d'),
    score:    calcHealth(s),
    critical: s.critical_count || 0,
    warning:  s.warning_count  || 0,
  }))

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }} className="animate-fade-in">
      <style>{`@keyframes aiq-pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <p className="section-header">Mission Control</p>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 28, color: 'var(--text-primary)', margin: 0, letterSpacing: -0.5 }}>
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
        </div>
        {hasConnector && !activeScan && (
          <button onClick={startScan} className="btn-primary">
            <Scan size={14} /> New Scan
          </button>
        )}
      </div>

      {/* ── Active scan ── */}
      {activeScan && (
        <Link to={`/scanner/results/${activeScan.id}`}
          style={{ display: 'block', marginBottom: 24, borderRadius: 10, background: 'var(--xbox-subtle)', border: '2px solid var(--xbox-border)', overflow: 'hidden', textDecoration: 'none' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--xbox)', boxShadow: '0 0 8px var(--xbox)', animation: 'aiq-pulse 1.5s ease-in-out infinite' }} />
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--xbox)', margin: 0 }}>Scan in progress</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{activeScan.scanned_articles || 0}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{activeScan.total_articles || '?'}</strong> articles — keep this tab open
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--xbox)', fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>
                {activeScan.total_articles ? `${Math.round((activeScan.scanned_articles / activeScan.total_articles) * 100)}%` : '...'}
              </span>
              <ArrowRight size={16} style={{ color: 'var(--xbox)' }} />
            </div>
          </div>
          <div style={{ height: 5, background: 'var(--bg-overlay)' }}>
            <div style={{ height: '100%', background: 'var(--xbox)', boxShadow: '0 0 8px var(--xbox)', transition: 'width 1s ease', width: activeScan.total_articles ? `${Math.round((activeScan.scanned_articles / activeScan.total_articles) * 100)}%` : '0%' }} />
          </div>
          <div style={{ padding: '7px 20px', background: 'rgba(16,124,16,0.04)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--xbox)' }}>⚠ Keep this tab open</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>— closing it will pause the scan</span>
          </div>
        </Link>
      )}

      {/* ── No connector: setup inline ── */}
      {!activeScan && hasConnector === false && (
        <div className="card-glow p-8 mb-6">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Plug size={20} style={{ color: 'var(--xbox)' }} />
            </div>
            <div className="flex-1">
              <p className="section-header mb-1">Step 1 of 2 — Connect Zendesk</p>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Connect your Zendesk account</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Enter your subdomain and API token. Read-only — we never modify anything without your say-so.
              </p>
              <ConnectorForm onSaved={() => { reloadConnector(); setLoading(true) }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Main content: health + launcher + history ── */}
      {!activeScan && hasConnector && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 20 }}>

          {/* Left: health score + chart */}
          <div>
            {lastScan ? (
              <div className="card p-6 mb-4">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
                  <div>
                    <p className="section-header mb-1">Knowledge Base Health</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800, fontSize: 52, color: healthColor(lastHealth), lineHeight: 1, letterSpacing: -2 }}>
                        {lastHealth ?? '—'}
                      </span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: healthColor(lastHealth) }}>{healthLabel(lastHealth)}</div>
                        {healthTrend !== null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: healthTrend > 0 ? 'var(--xbox)' : healthTrend < 0 ? 'var(--badge-critical-color)' : 'var(--text-muted)' }}>
                            {healthTrend > 0 ? <TrendingUp size={12} /> : healthTrend < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
                            {healthTrend > 0 ? '+' : ''}{healthTrend} vs last scan
                          </div>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '6px 0 0' }}>
                      Last scan {formatDistanceToNow(new Date(lastScan.created_at), { addSuffix: true })} · {lastScan.scanned_articles} articles
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    {[
                      { label: 'Critical', value: lastScan.critical_count || 0, color: 'var(--badge-critical-color)', icon: AlertOctagon },
                      { label: 'Warnings', value: lastScan.warning_count  || 0, color: 'var(--badge-warning-color)',  icon: AlertTriangle },
                      { label: 'Info',     value: lastScan.info_count     || 0, color: 'var(--badge-info-color)',     icon: Info },
                    ].map(({ label, value, color, icon: Icon }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontWeight: 700, fontSize: 14, color, minWidth: 24, textAlign: 'right' }}>{value}</span>
                        <Icon size={12} style={{ color }} />
                      </div>
                    ))}
                    <Link to={`/scanner/results/${lastScan.id}`} className="btn-secondary" style={{ fontSize: 11, marginTop: 4 }}>
                      View report <ArrowRight size={11} />
                    </Link>
                  </div>
                </div>

                {/* Trend chart */}
                {chartData.length > 1 && (
                  <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                      {[{ key: 'health', label: 'Health score' }, { key: 'issues', label: 'Issues' }].map(({ key, label }) => (
                        <button key={key} onClick={() => setChartMode(key)}
                          style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontFamily: 'Fira Code, monospace',
                            background: chartMode === key ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                            color: chartMode === key ? 'var(--xbox)' : 'var(--text-muted)',
                            outline: chartMode === key ? '1px solid var(--xbox-border)' : '1px solid var(--border)',
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={130}>
                      {chartMode === 'health' ? (
                        <LineChart data={chartData}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11 }} />
                          <ReferenceLine y={80} stroke="var(--xbox)" strokeDasharray="3 3" strokeOpacity={0.3} />
                          <Line type="monotone" dataKey="score" name="Health" stroke="var(--xbox)" strokeWidth={2} dot={{ fill: 'var(--xbox)', r: 3 }} />
                        </LineChart>
                      ) : (
                        <LineChart data={chartData}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11 }} />
                          <Line type="monotone" dataKey="critical" name="Critical" stroke="var(--badge-critical-color)" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="warning"  name="Warning"  stroke="var(--badge-warning-color)"  strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            ) : (
              <div className="card p-6 mb-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, textAlign: 'center' }}>
                <BarChart3 size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>No scans yet</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Run your first scan to see your knowledge base health score</p>
              </div>
            )}
          </div>

          {/* Right: scan launcher */}
          <div className="card-glow p-5">
            <p className="section-header mb-3">Launch Scan</p>

            {connector2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 7, background: 'var(--bg-sunken)', border: '1px solid var(--border)', marginBottom: 16 }}>
                <Plug size={13} style={{ color: 'var(--xbox)' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{connector2.subdomain}.zendesk.com</span>
                </span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {PRESETS.map(({ value, label, desc, icon, time }) => (
                <button key={value} onClick={() => setPreset(value)}
                  style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    background: preset === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                    border: `1px solid ${preset === value ? 'var(--xbox-border)' : 'var(--border)'}`,
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: preset === value ? 'var(--xbox)' : 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                  {preset === value && <CheckCircle size={14} style={{ color: 'var(--xbox)', flexShrink: 0 }} />}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'Fira Code, monospace' }}>
              {PRESETS.find(p => p.value === preset)?.time} · keep tab open
            </p>

            {error && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--badge-critical-color)', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button onClick={startScan} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              <Scan size={14} /> Start Scan
            </button>

            {profile?.plan !== 'paid' && (
              <Link to="/billing" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 10px', borderRadius: 7, background: 'var(--bg-sunken)', border: '1px solid var(--border)', textDecoration: 'none' }}>
                <Zap size={13} style={{ color: 'var(--xbox)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Unlock AI features with <span style={{ color: 'var(--xbox)', fontWeight: 600 }}>Pro</span></span>
                <ArrowRight size={11} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Scan History ── */}
      {recentScans.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p className="section-header" style={{ marginBottom: 0 }}>Scan History</p>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>{recentScans.length} scans</span>
          </div>
          {recentScans.map(scan => {
            const health = calcHealth(scan)
            return (
              <div key={scan.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                {/* Status icon */}
                <div style={{ flexShrink: 0 }}>
                  {scan.status === 'completed' && <CheckCircle size={15} style={{ color: 'var(--xbox)' }} />}
                  {scan.status === 'running'   && <Loader size={15} className="animate-spin" style={{ color: '#FCD34D' }} />}
                  {scan.status === 'failed'    && <XCircle size={15} style={{ color: 'var(--badge-critical-color)' }} />}
                  {scan.status === 'pending'   && <Clock size={15} style={{ color: 'var(--text-muted)' }} />}
                </div>

                <Link to={`/scanner/results/${scan.id}`}
                  style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {format(new Date(scan.created_at), 'MMM d, yyyy — h:mm a')}
                    {scan.preset && (
                      <span style={{ marginLeft: 8, fontSize: 10, padding: '1px 6px', background: 'var(--bg-overlay)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'Fira Code, monospace', textTransform: 'capitalize' }}>
                        {scan.preset}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })} · {scan.scanned_articles || 0} articles
                  </div>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {health !== null && (
                    <div style={{ textAlign: 'center', minWidth: 40 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: healthColor(health), fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>{health}</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>health</div>
                    </div>
                  )}
                  {scan.critical_count > 0 && <span className="badge-critical"><AlertOctagon size={9} />{scan.critical_count}</span>}
                  {scan.warning_count  > 0 && <span className="badge-warning"><AlertTriangle size={9} />{scan.warning_count}</span>}
                  <Link to={`/scanner/results/${scan.id}`} style={{ color: 'var(--text-muted)', display: 'flex' }}>
                    <ChevronRight size={15} />
                  </Link>
                  <button onClick={() => deleteScan(scan.id)} className="btn-ghost"
                    style={{ padding: '3px 5px', color: 'var(--text-muted)', opacity: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--badge-critical-color)' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
