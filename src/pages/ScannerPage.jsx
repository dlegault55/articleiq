import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { getArticleLimit } from '@/lib/stripe'
import { runScan } from '@/lib/scanner'
import { Scan, Plug, AlertTriangle, Loader, ChevronRight, Clock, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function ScannerPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [connectors, setConnectors] = useState([])
  const [selectedConnector, setSelectedConnector] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState({ phase: '', scanned: 0, total: 0 })
  const [pastScans, setPastScans] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  const articleLimit = getArticleLimit(profile?.plan || 'free')

  useEffect(() => {
    if (!profile) return
    const load = async () => {
      const { data: conns } = await supabase
        .from('zendesk_connectors')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true)
      setConnectors(conns || [])
      if (conns?.length) setSelectedConnector(conns[0])

      const { data: scans } = await supabase
        .from('scan_jobs')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setPastScans(scans || [])
      setLoading(false)
    }
    load()
  }, [profile])

  const startScan = async () => {
    if (!selectedConnector) return
    setScanning(true)
    setError(null)
    setProgress({ phase: 'starting', scanned: 0, total: 0 })

    try {
      // Create scan job
      const { data: job, error: jobErr } = await supabase
        .from('scan_jobs')
        .insert({ user_id: profile.id, connector_id: selectedConnector.id, status: 'pending' })
        .select()
        .single()
      if (jobErr) throw jobErr

      await runScan({
        scanJobId: job.id,
        userId: profile.id,
        connector: selectedConnector,
        articleLimit,
        onProgress: (p) => setProgress(p),
      })

      navigate(`/scanner/results/${job.id}`)
    } catch (e) {
      setError(e.message)
      setScanning(false)
    }
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
          Scan your Zendesk knowledge base for issues across {articleLimit === Infinity ? 'unlimited' : `up to ${articleLimit}`} articles.
        </p>
      </div>

      {/* No connector */}
      {!loading && connectors.length === 0 && (
        <div className="card p-10 text-center">
          <Plug size={36} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <p className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No Zendesk connector configured</p>
          <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Connect your Zendesk account before running a scan.</p>
          <Link to="/connector" className="btn-primary">
            <Plug size={14} /> Set Up Connector
          </Link>
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
            <div className="flex items-center gap-3 p-3 rounded-md mb-4"
              style={{ background: 'var(--surface-3)', border: '1px solid var(--border)' }}>
              <Plug size={14} style={{ color: 'var(--xbox)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Scanning <span style={{ color: 'var(--text-primary)' }}>{selectedConnector.subdomain}.zendesk.com</span>
                {' '}· Limit: <span style={{ color: 'var(--xbox-light)' }}>{articleLimit === Infinity ? 'Unlimited' : `${articleLimit} articles`}</span>
              </span>
            </div>
          )}

          {/* Scan in progress */}
          {scanning && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {progress.phase === 'fetching' ? '⚡ Fetching articles...' : '🔍 Analyzing...'}
                  {progress.total > 0 && ` ${progress.scanned}/${progress.total}`}
                </span>
                <span className="text-sm font-mono" style={{ color: 'var(--xbox-light)' }}>{progressPct}%</span>
              </div>
              <div className="progress-bar h-2">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Loader size={11} className="animate-spin" />
                This may take a few minutes for large knowledge bases
              </div>
            </div>
          )}

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
        <p className="section-header mb-4">What gets checked</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Broken Links', desc: 'Detects all dead or invalid hyperlinks', tier: 'free' },
            { label: 'Last Updated Date', desc: 'Flags articles not updated in 180+ days', tier: 'free' },
            { label: 'Word Count', desc: 'Warns on articles under 150 words', tier: 'free' },
            { label: 'Missing Metadata', desc: 'Checks for missing labels and sections', tier: 'free' },
            { label: 'Readability Score', desc: 'Flesch-Kincaid readability analysis', tier: 'free' },
            { label: 'Grammar Fix', desc: 'AI-powered grammar and clarity improvements', tier: 'paid' },
            { label: 'Full Rewrite', desc: 'AI rewrites article for clarity and tone', tier: 'paid' },
            { label: 'Quality Score', desc: 'AI scores clarity, completeness, structure', tier: 'paid' },
          ].map(({ label, desc, tier }) => (
            <div key={label} className="flex items-start gap-2.5">
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                tier === 'free' || profile?.plan === 'paid'
                  ? 'bg-xbox/15 border border-xbox/30'
                  : 'bg-surface-3 border border-border'
              }`}>
                {tier === 'free' || profile?.plan === 'paid' ? (
                  <CheckCircle size={11} style={{ color: 'var(--xbox-light)' }} />
                ) : (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⚡</span>
                )}
              </div>
              <div>
                <div className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  {label}
                  {tier === 'paid' && profile?.plan !== 'paid' && (
                    <span className="px-1 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(16,124,16,0.15)', color: 'var(--xbox-light)', fontSize: '9px' }}>PRO</span>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past scans */}
      {pastScans.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-border">
            <p className="section-header mb-0">Scan History</p>
          </div>
          <div className="divide-y divide-border">
            {pastScans.map((scan) => (
              <Link key={scan.id} to={`/scanner/results/${scan.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-3 transition-colors group">
                <div>
                  {scan.status === 'completed' && <CheckCircle size={16} style={{ color: 'var(--xbox)' }} />}
                  {scan.status === 'running' && <Loader size={16} className="animate-spin" style={{ color: '#FCD34D' }} />}
                  {scan.status === 'failed' && <XCircle size={16} style={{ color: '#FC8181' }} />}
                  {scan.status === 'pending' && <Clock size={16} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    #{scan.id.slice(-8).toUpperCase()}
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
