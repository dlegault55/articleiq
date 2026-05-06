import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useConnector } from '@/hooks/useConnector'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { sendScanCompleteEmail } from '@/lib/email'
import { PageShell, PageSkeleton, EmptyState } from '@/components/ui'
import {
  Scan, Plug, AlertTriangle, Loader, ChevronRight,
  Clock, CheckCircle, XCircle, Eye, EyeOff, Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────
const calculateNextSync = (frequency) => {
  const d = new Date()
  if (frequency === 'daily')   d.setDate(d.getDate() + 1)
  if (frequency === 'weekly')  d.setDate(d.getDate() + 7)
  if (frequency === 'monthly') d.setDate(d.getDate() + 30)
  return d.toISOString()
}

const scanLabel = (scan) => {
  const date = `${new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(scan.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
  const preset = scan.preset ? ` · ${scan.preset.charAt(0).toUpperCase() + scan.preset.slice(1)}` : ''
  return date + preset
}

const FREQUENCIES = [
  { value: 'daily',   label: 'Daily',   desc: 'Every 24h' },
  { value: 'weekly',  label: 'Weekly',  desc: 'Every 7d'  },
  { value: 'monthly', label: 'Monthly', desc: 'Every 30d' },
]

const PRESETS = [
  { value: 'fast',     label: 'Fast',     desc: 'Outdated + word count', icon: '⚡', checks: 2 },
  { value: 'standard', label: 'Standard', desc: 'All quality checks',    icon: '🔍', checks: 5 },
  { value: 'full',     label: 'Full',     desc: 'All checks + AI',       icon: '🤖', checks: 8, paid: true },
]

const CHECKS = [
  { label: 'Last Updated Date', desc: 'Flags articles not updated in 180+ days', presets: ['fast','standard','full'] },
  { label: 'Word Count',        desc: 'Warns on articles under 150 words',       presets: ['fast','standard','full'] },
  { label: 'Broken Links',      desc: 'Detects dead or invalid hyperlinks',       presets: ['standard','full'] },
  { label: 'Missing Metadata',  desc: 'Checks for missing labels and sections',   presets: ['standard','full'] },
  { label: 'Readability Score', desc: 'Flesch-Kincaid readability analysis',      presets: ['standard','full'] },
  { label: 'AI Grammar Fix',    desc: 'AI-powered grammar and clarity',           presets: ['full'], paid: true },
  { label: 'AI Quality Score',  desc: 'AI scores clarity, completeness, structure', presets: ['full'], paid: true },
  { label: 'Duplicate Detection', desc: 'Flags articles with similar titles or content', presets: ['standard','full'] },
]

// ─── ConnectorForm — shown when no connector exists ───────────
function ConnectorForm({ onSaved }) {
  const { userId } = useAuth()
  const [form, setForm]       = useState({ subdomain: '', email: '', token: '', frequency: 'weekly' })
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  const save = async () => {
    if (!userId)                                   { setError('Not signed in. Please refresh.'); return }
    if (!form.subdomain || !form.email || !form.token) { setError('All three fields are required.'); return }
    setSaving(true)
    setError(null)
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
      if (dbErr) throw new Error(dbErr.message || JSON.stringify(dbErr))
      onSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Subdomain */}
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

      {/* Email */}
      <div>
        <label className="label">Zendesk Email</label>
        <input className="input" type="email" placeholder="you@yourcompany.com"
          value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      </div>

      {/* Token */}
      <div>
        <label className="label">API Token</label>
        <div className="relative">
          <input className="input pr-10" type={showKey ? 'text' : 'password'}
            placeholder="your-zendesk-api-token"
            value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} />
          <button onClick={() => setShowKey(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Zendesk Admin → Apps & Integrations → APIs → Zendesk API → API Tokens
        </p>
      </div>

      {/* Frequency */}
      <div>
        <label className="label">Sync Frequency</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {FREQUENCIES.map(({ value, label, desc }) => (
            <button key={value} type="button" onClick={() => setForm(f => ({ ...f, frequency: value }))}
              style={{
                padding: '10px 8px', borderRadius: 7, cursor: 'pointer', textAlign: 'center',
                background: form.frequency === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                border: `1px solid ${form.frequency === value ? 'var(--xbox-border)' : 'var(--border)'}`,
                color:  form.frequency === value ? 'var(--xbox)' : 'var(--text-secondary)',
              }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm" style={{ color: 'var(--badge-critical-color)' }}>{error}</p>
      )}

      <button onClick={save} disabled={saving} className="btn-primary">
        {saving ? <Loader size={13} className="animate-spin" /> : <Plug size={13} />}
        {saving ? 'Saving...' : 'Connect & Continue'}
      </button>
    </div>
  )
}

// ─── ActiveScanPanel ──────────────────────────────────────────
function ActiveScanPanel({ activeScan, onCancel }) {
  const scanned = activeScan.scanned_articles || 0
  const total   = activeScan.total_articles   || 0
  const pct     = total > 0 ? Math.round((scanned / total) * 100) : 0

  return (
    <div className="card-glow p-5 mb-6">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--xbox)', boxShadow: '0 0 6px var(--xbox)', animation: 'aiq-pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Scan in progress</span>
        </div>
        <span style={{ fontSize: 11, fontFamily: 'Fira Code, monospace', padding: '2px 8px', borderRadius: 4, background: 'var(--xbox-subtle)', color: 'var(--xbox)', border: '1px solid var(--xbox-border)' }}>
          RUNNING
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar h-2 mb-2">
        <div className="progress-fill" style={{ width: `${Math.max(pct, 2)}%`, transition: 'width 1.2s ease-out' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {total > 0 ? `${scanned} of ${total} articles` : 'Connecting to Zendesk...'}
        </span>
        <span style={{ fontSize: 12, fontFamily: 'Fira Code, monospace', fontWeight: 700, color: 'var(--xbox)' }}>
          {total > 0 ? `${pct}%` : '...'}
        </span>
      </div>

      {total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
          {[
            { label: 'Scanned',   value: scanned,              color: 'var(--xbox)' },
            { label: 'Remaining', value: Math.max(0, total - scanned), color: 'var(--text-secondary)' },
            { label: 'Total',     value: total,                color: 'var(--text-primary)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center', padding: '8px', borderRadius: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 700, fontSize: 20, fontFamily: 'Inter, sans-serif', color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          <Loader size={11} className="animate-spin" />
          Safe to navigate away — scan continues in the background
        </div>
        <button onClick={onCancel} className="btn-ghost"
          style={{ fontSize: 12, color: 'var(--badge-critical-color)', padding: '4px 10px' }}>
          Stop scan
        </button>
      </div>
      <style>{`@keyframes aiq-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  )
}

// ─── ScannerPage ──────────────────────────────────────────────
export default function ScannerPage() {
  const { userId }                                       = useAuth()
  const { hasConnector, connector, reload: reloadConnector } = useConnector()
  const { activeScan, recentScans, reload: reloadScans } = useScan()
  const toast                                            = useToast()
  const navigate                                         = useNavigate()

  const [connectors,       setConnectors]       = useState([])
  const [selectedConnector,setSelectedConnector]= useState(null)
  const [scanPreset,       setScanPreset]       = useState('standard')
  const [error,            setError]            = useState(null)
  const [loading,          setLoading]          = useState(true)
  const prevActiveScan = useRef(null)

  // ── Load connectors ────────────────────────────────────────
  useEffect(() => {
    if (!userId) { setLoading(false); return }
    const load = async () => {
      const { data } = await supabase
        .from('zendesk_connectors')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
      const all = data?.length ? data : (connector ? [connector] : [])
      setConnectors(all)
      if (all.length) setSelectedConnector(all[0])
      setLoading(false)
    }
    load()
  }, [userId, connector])

  // ── Auto-navigate when scan finishes ──────────────────────
  useEffect(() => {
    if (prevActiveScan.current && !activeScan) {
      const completed = recentScans.find(s => s.status === 'completed')
      if (completed) navigate(`/scanner/results/${completed.id}`)
    }
    prevActiveScan.current = activeScan
  }, [activeScan, recentScans])

  // ── Start scan (chunked server-side) ───────────────────────
  const startScan = async () => {
    if (!userId)            { setError('Not signed in. Please refresh.'); return }
    if (!selectedConnector) { setError('No connector selected.'); return }
    setError(null)
    try {
      // Create scan job
      const { data: job, error: jobErr } = await supabase
        .from('scan_jobs')
        .insert({ user_id: userId, connector_id: selectedConnector.id, status: 'pending', preset: scanPreset })
        .select().single()
      if (jobErr) throw new Error(jobErr.message)

      // Navigate to results immediately — scan runs via chunked API calls
      navigate(`/scanner/results/${job.id}`)

      // Kick off first chunk (subsequent chunks called from results page polling)
      fetch('/api/scan-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanJobId:   job.id,
          userId,
          connectorId: selectedConnector.id,
          preset:      scanPreset,
          page:        1,
        }),
      }).catch(e => console.error('Scan chunk error:', e))

    } catch (e) {
      setError(e.message)
    }
  }

  // ── Cancel scan ────────────────────────────────────────────
  const cancelScan = async () => {
    if (!userId) return
    const running = recentScans.find(s => s.status === 'running' || s.status === 'pending')
    if (running) {
      await supabase.from('scan_jobs').update({
        status: 'failed',
        error_message: 'Cancelled by user',
        completed_at: new Date().toISOString(),
      }).eq('id', running.id)
    }
    reloadScans()
  }

  // ── Delete scan ────────────────────────────────────────────
  const deleteScan = async (scanId) => {
    const ok = await toast.confirm('Delete this scan and all its results?', 'Delete', 'Cancel')
    if (!ok) return
    await supabase.from('scan_jobs').delete().eq('id', scanId)
    toast.success('Scan deleted')
    reloadScans()
  }

  if (loading) return <PageSkeleton />

  return (
    <PageShell
      eyebrow="Analysis Engine"
      title="Article Scanner"
      subtitle="Scan your Zendesk knowledge base for issues across all articles."
    >
      {/* ── Active scan (always visible) ── */}
      {activeScan && <ActiveScanPanel activeScan={activeScan} onCancel={cancelScan} />}

      {/* ── No connector: show setup form ── */}
      {!activeScan && hasConnector === false && (
        <div className="card-glow p-8 mb-6">
          <div className="flex items-start gap-5">
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Plug size={20} style={{ color: 'var(--xbox)' }} />
            </div>
            <div className="flex-1">
              <p className="section-header mb-1">Step 1 of 2 — Connect Zendesk</p>
              <h2 style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                Connect your Zendesk account
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                Enter your subdomain and API token. Read-only access — we never modify anything without your say-so.
              </p>
              <ConnectorForm onSaved={() => { reloadConnector(); setLoading(true); }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Connector exists: show scan launcher ── */}
      {!activeScan && hasConnector && (
        <div className="card-glow p-6 mb-6">
          <p className="section-header mb-4">Launch Scan</p>

          {/* Connected indicator */}
          {selectedConnector && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 7, background: 'var(--bg-sunken)', border: '1px solid var(--border)', marginBottom: 16 }}>
              <Plug size={13} style={{ color: 'var(--xbox)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedConnector.subdomain}.zendesk.com</span>
              </span>
            </div>
          )}

          {/* Preset selector */}
          <p className="section-header mb-3">Scan preset</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
            {PRESETS.map(({ value, label, desc, icon, checks, paid }) => (
              <button key={value} type="button" onClick={() => setScanPreset(value)}
                style={{
                  padding: '14px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  background: scanPreset === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                  border: `1px solid ${scanPreset === value ? 'var(--xbox-border)' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {paid && <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--xbox-subtle)', color: 'var(--xbox)', border: '1px solid var(--xbox-border)', borderRadius: 3, fontFamily: 'Fira Code, monospace' }}>PRO</span>}
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: scanPreset === value ? 'var(--xbox)' : 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{desc}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>{checks} checks</div>
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--badge-critical-color)', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={startScan} className="btn-primary">
              <Scan size={14} /> Start Scan
            </button>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {scanPreset === 'fast'     && '~10 min per 1,000 articles · keep tab open'}
              {scanPreset === 'standard' && '~20 min per 1,000 articles · keep tab open'}
              {scanPreset === 'full'     && '~30+ min per 1,000 articles · keep tab open'}
            </span>
          </div>
        </div>
      )}

      {/* ── Checks included in this preset ── */}
      {!activeScan && hasConnector && (
        <div className="card p-5 mb-6">
          <p className="section-header mb-3">
            Checks included — <span style={{ textTransform: 'none', fontFamily: 'Inter, sans-serif', letterSpacing: 0 }}>{scanPreset} preset</span>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {CHECKS.map(({ label, desc, presets, paid }) => {
              const included = presets.includes(scanPreset)
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: included ? 1 : 0.3 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: included ? 'var(--xbox-subtle)' : 'var(--bg-overlay)', border: `1px solid ${included ? 'var(--xbox-border)' : 'var(--border)'}` }}>
                    {included && <CheckCircle size={10} style={{ color: 'var(--xbox)' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {paid && <span style={{ fontSize: 8, padding: '1px 4px', background: 'var(--xbox-subtle)', color: 'var(--xbox)', border: '1px solid var(--xbox-border)', borderRadius: 3, fontFamily: 'Fira Code, monospace' }}>PRO</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Scan history ── */}
      {recentScans.length > 0 && (
        <div className="card">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="section-header" style={{ marginBottom: 0 }}>Scan History</p>
          </div>
          <div>
            {recentScans.map(scan => (
              <div key={scan.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Link to={`/scanner/results/${scan.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                  <div style={{ flexShrink: 0 }}>
                    {scan.status === 'completed' && <CheckCircle size={15} style={{ color: 'var(--xbox)' }} />}
                    {scan.status === 'running'   && <Loader size={15} className="animate-spin" style={{ color: '#FCD34D' }} />}
                    {scan.status === 'failed'    && <XCircle size={15} style={{ color: 'var(--badge-critical-color)' }} />}
                    {scan.status === 'pending'   && <Clock size={15} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{scanLabel(scan)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })} · {scan.scanned_articles || 0} articles
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {scan.critical_count > 0 && <span className="badge-critical">{scan.critical_count} critical</span>}
                    {scan.warning_count  > 0 && <span className="badge-warning">{scan.warning_count} warnings</span>}
                    <ChevronRight size={13} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </Link>
                <button
                  onClick={() => deleteScan(scan.id)}
                  className="btn-ghost"
                  style={{ padding: '4px 6px', color: 'var(--text-muted)', flexShrink: 0, opacity: 0 }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--badge-critical-color)' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentScans.length === 0 && hasConnector && !activeScan && (
        <EmptyState
          icon={Scan}
          title="No scans yet"
          description="Choose a preset above and hit Start Scan to analyze your knowledge base."
        />
      )}
    </PageShell>
  )
}
