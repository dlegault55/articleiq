import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useConnector } from '@/hooks/useConnector'
import { useScan } from '@/hooks/useScan'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { runScan } from '@/lib/scanner'
import { Scan, Plug, AlertTriangle, Loader, ChevronRight, Clock, CheckCircle, XCircle, Eye, EyeOff, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const calculateNextSync = (frequency) => {
  const d = new Date()
  if (frequency === 'daily')   d.setDate(d.getDate() + 1)
  if (frequency === 'weekly')  d.setDate(d.getDate() + 7)
  if (frequency === 'monthly') d.setDate(d.getDate() + 30)
  return d.toISOString()
}

const FREQUENCIES = [
  { value: 'daily',   label: 'Daily',   desc: 'Every 24h' },
  { value: 'weekly',  label: 'Weekly',  desc: 'Every 7d'  },
  { value: 'monthly', label: 'Monthly', desc: 'Every 30d' },
]

// ─── Inline connector form ────────────────────────────────────
function ConnectorInline({ onConnected }) {
  const { profile, user } = useAuth()
  const userId = profile?.id || user?.id
  const [form, setForm] = useState({ subdomain: '', email: '', token: '', frequency: 'weekly' })
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async () => {
    console.log('save() called', { userId, subdomain: form.subdomain, email: form.email, hasToken: !!form.token })
    if (!userId) { setError('Not signed in — please refresh and try again.'); return }
    if (!form.subdomain || !form.email || !form.token) { setError('All fields are required.'); return }
    setSaving(true)
    setError(null)
    try {
      console.log('Saving connector...', { userId, subdomain: form.subdomain })
      const result = await supabase.from('zendesk_connectors').upsert({
        user_id: userId,
        subdomain: form.subdomain.trim().toLowerCase(),
        api_key_encrypted: `${form.email}/token:${form.token}`,
        api_key_hint: `...${form.token.slice(-6)}`,
        label: 'Zendesk',
        sync_frequency: form.frequency,
        next_sync_at: calculateNextSync(form.frequency),
      }, { onConflict: 'user_id,subdomain' })
      console.log('Upsert result:', JSON.stringify(result))
      if (result.error) throw new Error(result.error.message || result.error.details || JSON.stringify(result.error))
      recheckConnector()
      onConnected()
    } catch (e) {
      console.error('Save failed:', e)
      setError(e.message || 'Unknown error — check browser console')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="label">Zendesk Subdomain</label>
        <div className="flex items-center">
          <input className="input rounded-r-none" placeholder="yourcompany"
            value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} />
          <div className="px-3 py-2 text-sm rounded-r-md border border-l-0 border-border flex-shrink-0"
            style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>.zendesk.com</div>
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
          <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Find in Zendesk Admin → Apps & Integrations → APIs → Zendesk API → API Tokens
        </p>
      </div>

      {error && <p className="text-sm" style={{ color: '#FC8181' }}>{error}</p>}
      <div className="flex items-center gap-3 pt-1">

        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader size={13} className="animate-spin" /> : <Plug size={13} />}
          {saving ? 'Saving...' : 'Connect & Continue'}
        </button>
      </div>
    </div>
  )
}

const scanName = (scan) => `Scan — ${new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(scan.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`

export default function ScannerPage() {
  const { profile, user } = useAuth()
  const { hasConnector, connector: contextConnector, recheckConnector } = useConnector()
  const { activeScan, recentScans, loadScans } = useScan()
  const toast = useToast()
  const navigate = useNavigate()
  const [connectors, setConnectors] = useState([])
  const [selectedConnector, setSelectedConnector] = useState(null)
  const [scanPreset, setScanPreset] = useState('standard')
  const [error, setError] = useState(null)
  const prevActiveScan = useRef(null)

  // Derive from global context — no local copy needed
  const scanning = !!activeScan
  const progress = activeScan
    ? { phase: 'analyzing', scanned: activeScan.scanned_articles || 0, total: activeScan.total_articles || 0 }
    : { phase: '', scanned: 0, total: 0 }
  const [loading, setLoading] = useState(true)

  const articleLimit = Infinity

  useEffect(() => {
    const load = async () => {
      const uid = profile?.id || user?.id
      if (!uid) { setLoading(false); return }

      const { data: conns } = await supabase
        .from('zendesk_connectors')
        .select('*')
        .eq('user_id', uid)
        .eq('is_active', true)
      
      const allConns = conns?.length ? conns : (contextConnector ? [contextConnector] : [])
      setConnectors(allConns)
      if (allConns.length) setSelectedConnector(allConns[0])

      setLoading(false)
    }
    load()
  }, [profile, user, contextConnector])

  const startScan = async () => {
    const uid = profile?.id || user?.id
    if (!selectedConnector) return
    if (!uid) { setError('Not signed in — please refresh and try again.'); return }
    setError(null)

    try {
      const { data: job, error: jobErr } = await supabase
        .from('scan_jobs')
        .insert({ user_id: uid, connector_id: selectedConnector.id, status: 'pending' })
        .select()
        .single()
      if (jobErr) throw jobErr

      await runScan({
        scanJobId: job.id,
        userId: uid,
        connector: selectedConnector,
        articleLimit,
        preset: scanPreset,
        onProgress: (p) => loadScans(),
      })

      loadScans()
      navigate(`/scanner/results/${job.id}`)
    } catch (e) {
      setError(e.message)
      loadScans()
    }
  }

  const cancelScan = async () => {
    const uid = profile?.id || user?.id
    if (!uid) return
    // Find the running scan and mark it failed
    const running = recentScans.find(s => s.status === 'running' || s.status === 'pending')
    if (running) {
      await supabase.from('scan_jobs').update({
        status: 'failed',
        error_message: 'Cancelled by user',
        completed_at: new Date().toISOString(),
      }).eq('id', running.id)
    }
    setScanning(false)
    setProgress({ phase: '', scanned: 0, total: 0 })
    // Refresh list
    const { data } = await supabase.from('scan_jobs').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10)
    setPastScans(data || [])
  }

  const deleteScan = async (scanId) => {
    const ok = await toast.confirm('Delete this scan and all its results?', 'Delete', 'Cancel')
    if (!ok) return
    await supabase.from('scan_jobs').delete().eq('id', scanId)
    toast.success('Scan deleted')
    loadScans()
  }

  const progressPct = progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <p className="section-header">Analysis Engine</p>
        <h1 className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>
          Article Scanner
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Scan your Zendesk knowledge base for issues across all articles.
        </p>
      </div>

      {/* No connector — inline setup, don't make them hunt */}
      {!loading && connectors.length === 0 && (
        <div className="card-glow p-8">
          <div className="flex items-start gap-5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(16,124,16,0.15)', border: '1px solid rgba(16,124,16,0.3)' }}>
              <Plug size={22} style={{ color: 'var(--xbox)' }} />
            </div>
            <div className="flex-1">
              <p className="section-header mb-1">Step 1 of 2 — Connect Zendesk</p>
              <h2 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Connect your Zendesk account
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                Enter your Zendesk subdomain and API token to start scanning. Read-only access — we never modify anything without your say-so.
              </p>
              <ConnectorInline onConnected={() => window.location.reload()} />
            </div>
          </div>
        </div>
      )}

      {/* Scan launcher */}
      {!loading && connectors.length > 0 && (
        <div className="card-glow p-6 mb-6">
          <p className="section-header mb-4">Launch Scan</p>

          {/* Connector selector */}
          {connectors.length > 1 && (
            <div className="mb-4">
              <label className="label">Select Connector</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {connectors.map((c) => (
                  <button key={c.id}
                    onClick={() => setSelectedConnector(c)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-left transition-all ${
                      selectedConnector?.id === c.id
                        ? 'bg-xbox/15 border border-xbox/30 text-xbox-light'
                        : 'border border-border bg-surface-3 hover:border-border-bright'
                    }`} style={{ color: selectedConnector?.id === c.id ? undefined : 'var(--text-secondary)' }}>
                    <Plug size={13} />
                    <div>
                      <div className="font-medium">{c.label}</div>
                      <div className="text-xs opacity-70">{c.subdomain}.zendesk.com</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedConnector && !scanning && (
            <div className="mb-4">
              {/* Connected connector pill */}
              <div className="flex items-center gap-2 p-3 rounded-md mb-4"
                style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)' }}>
                <Plug size={13} style={{ color: 'var(--xbox)' }} />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{selectedConnector.subdomain}.zendesk.com</span>
                </span>
              </div>

              {/* Preset selector */}
              <p className="section-header mb-3">Scan preset</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { value: 'fast', label: 'Fast', desc: 'Word count & outdated only', icon: '⚡', checks: 2 },
                  { value: 'standard', label: 'Standard', desc: 'All quality checks', icon: '🔍', checks: 5 },
                  { value: 'full', label: 'Full', desc: 'All checks + AI scoring', icon: '🤖', checks: 8, paid: true },
                ].map(({ value, label, desc, icon, checks, paid }) => (
                  <button key={value} type="button"
                    onClick={() => setScanPreset(value)}
                    style={{
                      padding: '14px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                      background: scanPreset === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                      border: `1px solid ${scanPreset === value ? 'var(--xbox-border)' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      {paid && <span style={{ fontSize: 9, padding: '1px 5px', background: 'var(--xbox-subtle)', color: 'var(--xbox)', border: '1px solid var(--xbox-border)', borderRadius: 3, fontFamily: 'Fira Code, monospace' }}>PRO</span>}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: scanPreset === value ? 'var(--xbox)' : 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{desc}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Fira Code, monospace' }}>{checks} checks</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Scan in progress */}
          {scanning && (
            <div className="mb-4 p-4 rounded-lg" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--xbox-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--xbox)', boxShadow: '0 0 6px var(--xbox)', animation: 'aiq-pulse 1.5s ease-in-out infinite' }} />
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {progress.phase === 'fetching' ? 'Fetching articles from Zendesk' : 'Analyzing articles'}
                  </span>
                </div>
                <span className="text-xs font-mono px-2 py-1 rounded" style={{ background: 'var(--xbox-subtle)', color: 'var(--xbox)', border: '1px solid var(--xbox-border)' }}>
                  RUNNING
                </span>
              </div>

              {/* Progress bar — CSS transition smooths out jumpy updates */}
              <div className="progress-bar h-2 mb-2">
                <div className="progress-fill" style={{ width: `${Math.max(progressPct, 2)}%`, transition: 'width 1.2s ease-out' }} />
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {progress.total > 0 ? `${progress.scanned} of ${progress.total} articles` : 'Connecting to Zendesk...'}
                </span>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--xbox)' }}>
                  {progress.total > 0 ? `${progressPct}%` : '...'}
                </span>
              </div>

              {progress.total > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Scanned', value: progress.scanned, color: 'var(--xbox)' },
                    { label: 'Remaining', value: Math.max(0, progress.total - progress.scanned), color: 'var(--text-secondary)' },
                    { label: 'Total', value: progress.total, color: 'var(--text-primary)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center p-2 rounded" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Loader size={10} className="animate-spin flex-shrink-0" />
                  Safe to navigate away — scan continues in the background
                </div>
                <button onClick={cancelScan} className="btn-ghost text-xs py-1 px-2" style={{ color: 'var(--badge-critical-color)' }}>
                  Stop scan
                </button>
              </div>
            </div>
          )}
          <style>{`@keyframes aiq-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-md text-sm flex items-start gap-2"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FC8181' }}>
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={startScan} disabled={scanning || !selectedConnector} className="btn-primary">
              {scanning ? <Loader size={14} className="animate-spin" /> : <Scan size={14} />}
              {scanning ? 'Scanning...' : 'Start Scan'}
            </button>
            {profile?.plan === 'free' && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Free plan: up to {articleLimit} articles ·{' '}
                <Link to="/billing" style={{ color: 'var(--xbox-light)' }}>Upgrade for unlimited</Link>
              </span>
            )}
          </div>
        </div>
      )}

      {/* What gets checked */}
      <div className="card p-5 mb-6">
        <p className="section-header mb-4">Checks included — <span style={{ textTransform: 'none', fontFamily: 'Inter, sans-serif', letterSpacing: 0 }}>{scanPreset} preset</span></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Last Updated Date', desc: 'Flags articles not updated in 180+ days', presets: ['fast','standard','full'] },
            { label: 'Word Count', desc: 'Warns on articles under 150 words', presets: ['fast','standard','full'] },
            { label: 'Broken Links', desc: 'Detects dead or invalid hyperlinks', presets: ['standard','full'] },
            { label: 'Missing Metadata', desc: 'Checks for missing labels and sections', presets: ['standard','full'] },
            { label: 'Readability Score', desc: 'Flesch-Kincaid readability analysis', presets: ['standard','full'] },
            { label: 'AI Grammar Fix', desc: 'AI-powered grammar and clarity', presets: ['full'], paid: true },
            { label: 'AI Quality Score', desc: 'AI scores clarity, completeness, structure', presets: ['full'], paid: true },
          ].map(({ label, desc, presets, paid }) => {
            const included = presets.includes(scanPreset)
            return (
              <div key={label} className="flex items-start gap-2.5" style={{ opacity: included ? 1 : 0.3 }}>
                <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: included ? 'var(--xbox-subtle)' : 'var(--bg-overlay)', border: `1px solid ${included ? 'var(--xbox-border)' : 'var(--border)'}` }}>
                  {included
                    ? <CheckCircle size={11} style={{ color: 'var(--xbox)' }} />
                    : <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>—</span>}
                </div>
                <div>
                  <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                    {label}
                    {paid && <span style={{ fontSize: 9, padding: '1px 4px', background: 'var(--xbox-subtle)', color: 'var(--xbox)', border: '1px solid var(--xbox-border)', borderRadius: 3, fontFamily: 'Fira Code, monospace' }}>PRO</span>}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Past scans */}
      {recentScans.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-border">
            <p className="section-header mb-0">Scan History</p>
          </div>
          <div className="divide-y divide-border">
            {recentScans.map((scan) => (
              <div key={scan.id} className="flex items-center gap-2 px-5 py-3.5 hover:bg-surface-3 transition-colors group" style={{ borderBottom: '1px solid var(--border)' }}>
                <Link to={`/scanner/results/${scan.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div>
                    {scan.status === 'completed' && <CheckCircle size={16} style={{ color: 'var(--xbox)' }} />}
                    {scan.status === 'running' && <Loader size={16} className="animate-spin" style={{ color: '#FCD34D' }} />}
                    {scan.status === 'failed' && <XCircle size={16} style={{ color: '#FC8181' }} />}
                    {scan.status === 'pending' && <Clock size={16} style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {scanName(scan)}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })} · {scan.scanned_articles || 0} articles
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {scan.critical_count > 0 && <span style={{ color: '#FC8181' }}>{scan.critical_count}C</span>}
                    {scan.warning_count > 0 && <span style={{ color: '#FCD34D' }}>{scan.warning_count}W</span>}
                    {scan.info_count > 0 && <span style={{ color: '#93C5FD' }}>{scan.info_count}I</span>}
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} className="group-hover:text-xbox transition-colors" />
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); deleteScan(scan.id) }}
                  className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  style={{ color: 'var(--badge-critical-color)' }}
                  title="Delete scan"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
