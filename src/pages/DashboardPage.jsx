import { useEffect, useState } from 'react'
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
  Trash2, ChevronRight, Clock, XCircle, Eye, EyeOff, BarChart3,
  FileText
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { formatDistanceToNow, format } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────
const calcHealth = (counts, articles) => {
  if (!articles) return null
  const penalty = ((counts.critical || 0) * 3 + (counts.warning || 0) + (counts.info || 0) * 0.2) / articles
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
  if (s == null) return 'No scans yet'
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
    if (!userId || !form.subdomain || !form.email || !form.token) { setError('All fields are required.'); return }
    setSaving(true); setError(null)
    try {
      const { error: dbErr } = await supabase.from('zendesk_connectors').upsert({
        user_id: userId, subdomain: form.subdomain.trim().toLowerCase(),
        api_key_encrypted: `${form.email}/token:${form.token}`,
        api_key_hint: `...${form.token.slice(-6)}`, label: 'Zendesk',
        sync_frequency: 'weekly', next_sync_at: calculateNextSync('weekly'),
      }, { onConflict: 'user_id,subdomain' })
      if (dbErr) throw new Error(dbErr.message)
      onSaved()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
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
        <input className="input" style={{ paddingRight: 40 }} type={showKey ? 'text' : 'password'} placeholder="API token"
          value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} />
        <button onClick={() => setShowKey(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
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
  const [lastScanCounts,  setLastScanCounts]  = useState(null)
  const [chartMode,       setChartMode]       = useState('health')

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

  // Load real issue counts for last completed scan
  useEffect(() => {
    const lastCompleted = recentScans.find(s => s.status === 'completed')
    if (!lastCompleted) return
    supabase.from('article_issues').select('severity').eq('scan_job_id', lastCompleted.id)
      .then(({ data }) => {
        if (!data) return
        setLastScanCounts({
          critical: data.filter(i => i.severity === 'critical').length,
          warning:  data.filter(i => i.severity === 'warning').length,
          info:     data.filter(i => i.severity === 'info').length,
        })
      })
  }, [recentScans])

  const startScan = async () => {
    const conn = activeConnector || connector
    if (!userId || !conn) return
    setStarting(true); setError(null)
    try {
      // Create scan job
      const { data: job, error: jobErr } = await supabase
        .from('scan_jobs').insert({ user_id: userId, connector_id: conn.id, status: 'pending', preset })
        .select().single()
      if (jobErr) throw new Error(jobErr.message)

      // Navigate to results — scan runs server-side via Supabase Edge Function
      navigate(`/scanner/results/${job.id}`)

      // Call Edge Function (fire and forget — scan runs independently)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      fetch(`${supabaseUrl}/functions/v1/run-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ scanJobId: job.id, userId, connectorId: conn.id, preset }),
      }).catch(e => console.error('Edge function error:', e))

    } catch (e) { setError(e.message); setStarting(false) }
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

  const lastCounts  = lastScanCounts || { critical: lastScan?.critical_count || 0, warning: lastScan?.warning_count || 0, info: lastScan?.info_count || 0 }
  const lastHealth  = lastScan ? calcHealth(lastCounts, lastScan.scanned_articles) : null
  const prevHealth  = prevScan ? calcHealth({ critical: prevScan.critical_count || 0, warning: prevScan.warning_count || 0, info: prevScan.info_count || 0 }, prevScan.scanned_articles) : null
  const trend       = lastHealth != null && prevHealth != null ? lastHealth - prevHealth : null

  const chartData = completed.slice().reverse().map(s => ({
    name:     format(new Date(s.created_at), 'MMM d'),
    score:    calcHealth({ critical: s.critical_count || 0, warning: s.warning_count || 0, info: s.info_count || 0 }, s.scanned_articles),
    critical: s.critical_count || 0,
    warning:  s.warning_count  || 0,
  }))

  return (
    <div style={{ padding: '32px', maxWidth: 960, margin: '0 auto' }} className="animate-fade-in">
      <style>{`@keyframes aiq-pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="section-header">Mission Control</p>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 26, color: 'var(--text-primary)', margin: 0, letterSpacing: -0.5 }}>
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
        </div>
      </div>

      {/* ── Active scan banner ── */}
      {activeScan && (
        <Link to={`/scanner/results/${activeScan.id}`}
          style={{ display: 'block', textDecoration: 'none', marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '2px solid var(--xbox-border)', background: 'var(--xbox-subtle)' }}>
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--xbox)', boxShadow: '0 0 8px var(--xbox)', animation: 'aiq-pulse 1.5s infinite', flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--xbox)', margin: 0 }}>Scan in progress</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{activeScan.scanned_articles || 0}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{activeScan.total_articles || '?'}</strong> articles
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
          <div style={{ height: 4, background: 'var(--bg-overlay)' }}>
            <div style={{ height: '100%', background: 'var(--xbox)', boxShadow: '0 0 6px var(--xbox)', transition: 'width 1s ease', width: activeScan.total_articles ? `${Math.round((activeScan.scanned_articles / activeScan.total_articles) * 100)}%` : '2%' }} />
          </div>
          <div style={{ padding: '7px 20px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--xbox)' }}>⚠ Keep this tab open</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>— closing it will pause the scan</span>
          </div>
        </Link>
      )}

      {/* ── No connector ── */}
      {!activeScan && hasConnector === false && (
        <div className="card-glow p-8 mb-6">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Plug size={20} style={{ color: 'var(--xbox)' }} />
            </div>
            <div className="flex-1">
              <p className="section-header mb-1">Connect Zendesk</p>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', margin: '0 0 8px' }}>Connect your knowledge base</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Read-only — we never modify your articles.</p>
              <ConnectorForm onSaved={() => { reloadConnector(); setLoading(true) }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Main grid: health + launcher ── */}
      {!activeScan && hasConnector && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

          {/* Health score card */}
          <div className="card p-6">
            <p className="section-header mb-4">Knowledge Base Health</p>
            {lastScan ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 72, fontWeight: 900, color: healthColor(lastHealth), lineHeight: 1, fontFamily: 'Inter, sans-serif', letterSpacing: -3 }}>
                      {lastHealth}
                    </div>
                    <div style={{ fontSize: 13, color: healthColor(lastHealth), fontWeight: 600, marginTop: 4 }}>{healthLabel(lastHealth)}</div>
                  </div>
                  <div style={{ paddingBottom: 8 }}>
                    {trend !== null && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, marginBottom: 8,
                        background: trend > 0 ? 'var(--xbox-subtle)' : trend < 0 ? 'rgba(239,68,68,0.1)' : 'var(--bg-overlay)',
                        color: trend > 0 ? 'var(--xbox)' : trend < 0 ? 'var(--badge-critical-color)' : 'var(--text-muted)',
                        border: `1px solid ${trend > 0 ? 'var(--xbox-border)' : trend < 0 ? 'rgba(239,68,68,0.2)' : 'var(--border)'}`,
                      }}>
                        {trend > 0 ? <TrendingUp size={11} /> : trend < 0 ? <TrendingDown size={11} /> : <Minus size={11} />}
                        {trend > 0 ? '+' : ''}{trend} vs prev
                      </div>
                    )}
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                      {formatDistanceToNow(new Date(lastScan.created_at), { addSuffix: true })}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {lastScan.scanned_articles?.toLocaleString()} articles scanned
                    </p>
                  </div>
                </div>

                {/* Issue counts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: 'Critical', value: lastCounts.critical, color: 'var(--badge-critical-color)', icon: AlertOctagon },
                    { label: 'Warnings', value: lastCounts.warning,  color: 'var(--badge-warning-color)',  icon: AlertTriangle },
                    { label: 'Info',     value: lastCounts.info,     color: 'var(--badge-info-color)',     icon: Info },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-sunken)', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 22, color, fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                        <Icon size={9} />{label}
                      </div>
                    </div>
                  ))}
                </div>

                <Link to={`/scanner/results/${lastScan.id}`} className="btn-secondary" style={{ fontSize: 12, width: '100%', justifyContent: 'center' }}>
                  View last report <ArrowRight size={12} />
                </Link>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: 'var(--text-muted)', opacity: 0.2, fontFamily: 'Inter, sans-serif' }}>—</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Run your first scan to see your health score</p>
              </div>
            )}
          </div>

          {/* Scan launcher card */}
          <div className="card-glow p-6">
            <p className="section-header mb-4">New Scan</p>

            {activeConnector && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, background: 'var(--bg-sunken)', border: '1px solid var(--border)', marginBottom: 16 }}>
                <Plug size={12} style={{ color: 'var(--xbox)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{activeConnector.subdomain}.zendesk.com</span>
              </div>
            )}

            {/* Inline preset picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {PRESETS.map(({ value, label, desc, icon, time }) => (
                <button key={value} onClick={() => setPreset(value)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                    background: preset === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                    border: `1px solid ${preset === value ? 'var(--xbox-border)' : 'var(--border)'}`,
                  }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: preset === value ? 'var(--xbox)' : 'var(--text-primary)' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                  {preset === value
                    ? <CheckCircle size={14} style={{ color: 'var(--xbox)', flexShrink: 0 }} />
                    : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--border)', flexShrink: 0 }} />
                  }
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

            <button onClick={startScan} disabled={starting} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {starting ? <Loader size={14} className="animate-spin" /> : <Scan size={14} />}
              {starting ? 'Starting...' : 'Start Scan'}
            </button>

            {profile?.plan !== 'paid' && (
              <Link to="/billing" style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', justifyContent: 'center' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--xbox)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                <Zap size={11} /> Unlock AI features with Pro
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── Trend chart ── */}
      {chartData.length > 1 && !activeScan && (
        <div className="card p-5 mb-4">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p className="section-header" style={{ marginBottom: 0 }}>Trend</p>
            <div style={{ display: 'flex', gap: 6 }}>
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
          </div>
          <ResponsiveContainer width="100%" height={140}>
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
        </div>
      )}

      {/* ── Scan history ── */}
      {recentScans.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <p className="section-header" style={{ marginBottom: 0 }}>Scan History</p>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>{recentScans.length} scans</span>
          </div>
          {recentScans.map(scan => {
            const health = calcHealth({ critical: scan.critical_count || 0, warning: scan.warning_count || 0, info: scan.info_count || 0 }, scan.scanned_articles)
            return (
              <div key={scan.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.querySelector('.del-btn').style.opacity = '1' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.querySelector('.del-btn').style.opacity = '0' }}>

                {/* Status dot */}
                <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                  background: scan.status === 'completed' ? 'var(--xbox)' : scan.status === 'running' ? '#FCD34D' : scan.status === 'failed' ? 'var(--badge-critical-color)' : 'var(--text-muted)'
                }} />

                <Link to={`/scanner/results/${scan.id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {format(new Date(scan.created_at), 'MMM d, yyyy — h:mm a')}
                      {scan.preset && (
                        <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--xbox-subtle)', color: 'var(--xbox)', border: '1px solid var(--xbox-border)', borderRadius: 4, fontFamily: 'Fira Code, monospace', textTransform: 'capitalize' }}>
                          {scan.preset}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })} · {scan.scanned_articles?.toLocaleString() || 0} articles
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    {health !== null && (
                      <div style={{ textAlign: 'center', minWidth: 36 }}>
                        <div style={{ fontSize: 17, fontWeight: 800, color: healthColor(health), fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>{health}</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>health</div>
                      </div>
                    )}
                    {scan.critical_count > 0 && <span className="badge-critical"><AlertOctagon size={9} />{scan.critical_count}</span>}
                    {scan.warning_count  > 0 && <span className="badge-warning"><AlertTriangle size={9} />{scan.warning_count}</span>}
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
      )}
    </div>
  )
}
