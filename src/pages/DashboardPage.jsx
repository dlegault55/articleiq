import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useConnector } from '@/hooks/useConnector'
import { useScan } from '@/hooks/useScan'
import { supabase } from '@/lib/supabase'
import { PLANS } from '@/lib/stripe'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Scan, AlertTriangle, AlertOctagon, Info, TrendingUp,
  ArrowRight, Plug, Zap, CheckCircle, Clock
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const StatCard = ({ label, value, sub, icon: Icon, color, glow }) => (
  <div className="card p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="w-8 h-8 rounded-md flex items-center justify-center"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
        <Icon size={15} style={{ color }} />
      </div>
    </div>
    <div>
      <div className="stat-number" style={{ color: glow ? color : undefined }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  </div>
)

const SeverityBar = ({ label, count, total, color, bg }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs w-16 font-mono" style={{ color: 'var(--text-muted)' }}>{label}</span>
    <div className="flex-1 progress-bar h-2">
      <div className="progress-fill h-full rounded-full transition-all duration-700"
        style={{ width: total ? `${(count / total) * 100}%` : '0%', background: color, boxShadow: `0 0 6px ${bg}` }} />
    </div>
    <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--text-primary)' }}>{count}</span>
  </div>
)

const scanName = (scan) => `Scan — ${new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(scan.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ scans: 0, articles: 0, issues: 0, critical: 0, warning: 0, info: 0 })
  const { activeScan, recentScans } = useScan()
  const { hasConnector, recheckConnector } = useConnector()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (recentScans?.length) {
      const totals = recentScans.reduce((acc, s) => ({
        articles: acc.articles + (s.scanned_articles || 0),
        issues:   acc.issues   + (s.issues_found   || 0),
        critical: acc.critical + (s.critical_count || 0),
        warning:  acc.warning  + (s.warning_count  || 0),
        info:     acc.info     + (s.info_count     || 0),
      }), { articles: 0, issues: 0, critical: 0, warning: 0, info: 0 })
      setStats({ scans: recentScans.length, ...totals })
    }
    setLoading(false)
  }, [recentScans])

  const planLimits = PLANS[profile?.plan || 'free']
  const chartData = recentScans.slice().reverse().map((s, i) => ({
    name: `Scan ${i + 1}`,
    critical: s.critical_count || 0,
    warning: s.warning_count || 0,
    info: s.info_count || 0,
  }))

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="section-header">Mission Control</p>
          <h1 className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}.
          </p>
        </div>
        {hasConnector
          ? <Link to="/scanner" className="btn-primary"><Scan size={15} />New Scan</Link>
          : <Link to="/connector" className="btn-primary"><Plug size={15} />Connect Zendesk</Link>}
      </div>

      {/* Setup prompt if no connector */}
      {hasConnector === false && !loading && (
        <div className="card-glow p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(16,124,16,0.15)', border: '1px solid rgba(16,124,16,0.3)' }}>
              <Plug size={16} style={{ color: 'var(--xbox)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Connect your Zendesk account</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Add your subdomain and API key to start scanning articles.</p>
            </div>
          </div>
          <Link to="/connector" className="btn-primary text-xs">
            Connect <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Active scan banner */}
      {activeScan && (
        <Link to="/scanner" className="card p-4 mb-4 flex items-center justify-between gap-4 hover:border-xbox transition-colors" style={{ borderColor: 'var(--xbox-border)', background: 'var(--xbox-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)' }}>
              <Scan size={15} className="animate-pulse" style={{ color: 'var(--xbox)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--xbox)' }}>Scan in progress</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {activeScan.scanned_articles || 0} of {activeScan.total_articles || '?'} articles analyzed
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--xbox)' }}>
            View progress <ArrowRight size={13} />
          </div>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Scans" value={stats.scans} sub="all time" icon={Scan} color="var(--xbox-light)" />
        <StatCard label="Critical Issues" value={stats.critical} sub="need immediate attention" icon={AlertOctagon} color="#FC8181" glow />
        <StatCard label="Warnings" value={stats.warning} sub="should be reviewed" icon={AlertTriangle} color="#FCD34D" />
        <StatCard label="Articles Scanned" value={stats.articles} sub={`limit: ${planLimits.limits.articlesPerScan === Infinity ? '∞' : planLimits.limits.articlesPerScan}`} icon={TrendingUp} color="#93C5FD" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Issue breakdown */}
        <div className="card p-5">
          <p className="section-header mb-4">Issue Breakdown</p>
          {stats.issues > 0 ? (
            <div className="space-y-3">
              <SeverityBar label="Critical" count={stats.critical} total={stats.issues} color="#FC8181" bg="rgba(239,68,68,0.3)" />
              <SeverityBar label="Warning" count={stats.warning} total={stats.issues} color="#FCD34D" bg="rgba(245,158,11,0.3)" />
              <SeverityBar label="Info" count={stats.info} total={stats.issues} color="#93C5FD" bg="rgba(59,130,246,0.3)" />
              <div className="pt-2 border-t border-border">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{stats.issues} total issues across {stats.scans} scan{stats.scans !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle size={28} style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No issues yet. Run a scan!</p>
            </div>
          )}
        </div>

        {/* Chart */}
        <div className="card p-5 lg:col-span-2">
          <p className="section-header mb-4">Scan History — Issues</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-3)', border: '1px solid var(--border-bright)', borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                  cursor={{ fill: 'rgba(16,124,16,0.05)' }}
                />
                <Bar dataKey="critical" name="Critical" radius={[2, 2, 0, 0]} fill="#FC8181" />
                <Bar dataKey="warning" name="Warning" radius={[2, 2, 0, 0]} fill="#FCD34D" />
                <Bar dataKey="info" name="Info" radius={[2, 2, 0, 0]} fill="#93C5FD" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-44 gap-2">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Run your first scan to see history</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent scans table */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="section-header mb-0">Recent Scans</p>
          <Link to="/scanner" className="btn-ghost text-xs py-1">View all <ArrowRight size={11} /></Link>
        </div>
        {recentScans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Scan size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No scans yet</p>
            {hasConnector
              ? <Link to="/scanner" className="btn-primary text-xs">Start your first scan</Link>
              : <Link to="/connector" className="btn-primary text-xs"><Plug size={13} />Connect Zendesk first</Link>}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentScans.map((scan) => (
              <Link key={scan.id} to={`/scanner/results/${scan.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-3 transition-colors group">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  scan.status === 'completed' ? 'bg-xbox' :
                  scan.status === 'running' ? 'bg-yellow-400 animate-pulse' :
                  scan.status === 'failed' ? 'bg-red-400' : 'bg-gray-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {scanName(scan)}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                      scan.status === 'completed' ? 'text-xbox-light bg-xbox/10' :
                      scan.status === 'running' ? 'text-yellow-400 bg-yellow-400/10' :
                      scan.status === 'failed' ? 'text-red-400 bg-red-400/10' :
                      'text-gray-400 bg-gray-400/10'
                    }`}>{scan.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={10} className="inline mr-1" />
                      {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {scan.scanned_articles || 0} articles
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {scan.critical_count > 0 && <span className="badge-critical"><AlertOctagon size={10} />{scan.critical_count}</span>}
                  {scan.warning_count > 0 && <span className="badge-warning"><AlertTriangle size={10} />{scan.warning_count}</span>}
                  {scan.info_count > 0 && <span className="badge-info"><Info size={10} />{scan.info_count}</span>}
                  <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} className="group-hover:text-xbox transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Plan upgrade CTA for free users */}
      {profile?.plan === 'free' && (
        <div className="mt-6 card-glow p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(16,124,16,0.15)', border: '1px solid rgba(16,124,16,0.3)' }}>
              <Zap size={18} style={{ color: 'var(--xbox-light)' }} />
            </div>
            <div>
              <p className="font-display font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                Unlock AI features with Pro
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Grammar fix, full rewrites, quality scores, unlimited articles, push-to-Zendesk.
              </p>
            </div>
          </div>
          <Link to="/billing" className="btn-primary flex-shrink-0">
            Upgrade to Pro <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}
