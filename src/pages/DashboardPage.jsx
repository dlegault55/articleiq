import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useConnector } from '@/hooks/useConnector'
import { useScan } from '@/hooks/useScan'
import { PageShell, StatCard, EmptyState, InfoBanner } from '@/components/ui'
import {
  Scan, AlertOctagon, AlertTriangle, Info, ArrowRight,
  Plug, Zap, BarChart3, CheckCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

const scanName = (scan) =>
  `${new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(scan.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`

const scanName2 = (scan) => `Scan — ${new Date(scan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${new Date(scan.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`

export default function DashboardPage() {
  const { profile } = useAuth()
  const { hasConnector } = useConnector()
  const { activeScan, recentScans } = useScan()

  const stats = recentScans.reduce((acc, s) => ({
    scans:    acc.scans    + 1,
    articles: acc.articles + (s.scanned_articles || 0),
    critical: acc.critical + (s.critical_count   || 0),
    warning:  acc.warning  + (s.warning_count    || 0),
    info:     acc.info     + (s.info_count       || 0),
  }), { scans: 0, articles: 0, critical: 0, warning: 0, info: 0 })

  const chartData = recentScans.slice().reverse().map((s, i) => ({
    name: `S${i + 1}`,
    critical: s.critical_count || 0,
    warning:  s.warning_count  || 0,
    info:     s.info_count     || 0,
  }))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <PageShell
      eyebrow="Mission Control"
      title={firstName ? `${greeting}, ${firstName}` : greeting}
      subtitle="Here's how your knowledge base is doing."
      action={
        hasConnector
          ? <Link to="/scanner" className="btn-primary"><Scan size={14} />New Scan</Link>
          : <Link to="/connector" className="btn-primary"><Plug size={14} />Connect Zendesk</Link>
      }
    >
      {activeScan && (
        <InfoBanner
          icon={<Scan size={15} />}
          title="Scan in progress"
          description={`${activeScan.scanned_articles || 0} of ${activeScan.total_articles || '?'} articles analyzed`}
          action={<Link to="/scanner" className="btn-secondary" style={{ fontSize: 12 }}>View <ArrowRight size={11} /></Link>}
        />
      )}

      {hasConnector === false && (
        <InfoBanner
          icon={<Plug size={15} />}
          title="Connect your Zendesk account"
          description="Add your subdomain and API token to start scanning."
          action={<Link to="/connector" className="btn-primary" style={{ fontSize: 12 }}>Connect <ArrowRight size={11} /></Link>}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Scans"      value={stats.scans}    sub="all time"                 icon={Scan}          color="var(--xbox)" />
        <StatCard label="Critical Issues"  value={stats.critical} sub="need attention"           icon={AlertOctagon}  color="var(--badge-critical-color)" />
        <StatCard label="Warnings"         value={stats.warning}  sub="should be reviewed"       icon={AlertTriangle} color="var(--badge-warning-color)" />
        <StatCard label="Articles Scanned" value={stats.articles} sub="across all scans"         icon={BarChart3}     color="var(--badge-info-color)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5">
          <p className="section-header mb-4">Issue breakdown</p>
          {stats.scans > 0 ? (
            <div className="space-y-3">
              {[
                { label: 'Critical', count: stats.critical, color: 'var(--badge-critical-color)' },
                { label: 'Warning',  count: stats.warning,  color: 'var(--badge-warning-color)'  },
                { label: 'Info',     count: stats.info,     color: 'var(--badge-info-color)'     },
              ].map(({ label, count, color }) => {
                const total = stats.critical + stats.warning + stats.info
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 52, fontFamily: 'Fira Code, monospace' }}>{label}</span>
                    <div className="progress-bar flex-1">
                      <div className="progress-fill" style={{ width: total ? `${(count / total) * 100}%` : '0%', background: color }} />
                    </div>
                    <span style={{ fontSize: 12, fontFamily: 'Fira Code, monospace', color, width: 24, textAlign: 'right' }}>{count}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState icon={CheckCircle} title="No issues yet" description="Run a scan to see results" />
          )}
        </div>

        <div className="card p-5 lg:col-span-2">
          <p className="section-header mb-4">Issues per scan</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} barGap={2} barSize={14}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'Fira Code' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11 }} cursor={{ fill: 'var(--xbox-subtle)' }} />
                <Bar dataKey="critical" name="Critical" radius={[3,3,0,0]} fill="var(--badge-critical-color)" fillOpacity={0.85} />
                <Bar dataKey="warning"  name="Warning"  radius={[3,3,0,0]} fill="var(--badge-warning-color)"  fillOpacity={0.85} />
                <Bar dataKey="info"     name="Info"     radius={[3,3,0,0]} fill="var(--badge-info-color)"     fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} title="No scan data yet" description="Run your first scan to see trends" />
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
          <p className="section-header" style={{ marginBottom: 0 }}>Recent scans</p>
          <Link to="/scanner" className="btn-ghost" style={{ fontSize: 12 }}>View all <ArrowRight size={11} /></Link>
        </div>
        {recentScans.length === 0 ? (
          <EmptyState
            icon={Scan}
            title="No scans yet"
            description="Connect Zendesk and run your first scan."
            action={hasConnector
              ? <Link to="/scanner" className="btn-primary" style={{ fontSize: 12 }}>Start scan</Link>
              : <Link to="/connector" className="btn-primary" style={{ fontSize: 12 }}><Plug size={12} />Connect Zendesk</Link>
            }
          />
        ) : (
          recentScans.slice(0, 5).map(scan => (
            <Link key={scan.id} to={`/scanner/results/${scan.id}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: scan.status === 'completed' ? 'var(--xbox)' : scan.status === 'running' ? '#FCD34D' : scan.status === 'failed' ? 'var(--badge-critical-color)' : 'var(--text-muted)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 1 }}>{scanName2(scan)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })} · {scan.scanned_articles || 0} articles
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                {scan.critical_count > 0 && <span className="badge-critical"><AlertOctagon size={9} />{scan.critical_count}</span>}
                {scan.warning_count  > 0 && <span className="badge-warning"><AlertTriangle size={9} />{scan.warning_count}</span>}
                {scan.info_count     > 0 && <span className="badge-info"><Info size={9} />{scan.info_count}</span>}
                <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} />
              </div>
            </Link>
          ))
        )}
      </div>

      {profile?.plan !== 'paid' && (
        <div className="card-glow p-5 mt-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={15} style={{ color: 'var(--xbox)' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Unlock AI features with Pro</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Grammar fix, rewrites, quality scores, push to Zendesk.</p>
            </div>
          </div>
          <Link to="/billing" className="btn-primary" style={{ fontSize: 12, flexShrink: 0 }}>Upgrade <ArrowRight size={12} /></Link>
        </div>
      )}
    </PageShell>
  )
}
