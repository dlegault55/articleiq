import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { adminSetPlan } from '@/lib/supabase'
import { Users, Zap, Shield, TrendingUp, ChevronDown, Loader, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function AdminPage() {
  const { profile: adminProfile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [overriding, setOverriding] = useState(null)
  const [stats, setStats] = useState({ total: 0, paid: 0, free: 0, scansToday: 0 })

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])

    // Stats
    const total = data?.length || 0
    const paid = data?.filter(u => u.plan === 'paid').length || 0
    setStats({ total, paid, free: total - paid, scansToday: 0 })
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const handlePlanOverride = async (userId, newPlan) => {
    setOverriding(userId)
    try {
      await adminSetPlan(adminProfile.id, userId, newPlan)
      await loadUsers()
    } catch (e) {
      alert('Failed to update plan: ' + e.message)
    } finally {
      setOverriding(null)
    }
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <p className="section-header">Control Center</p>
        <h1 className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>
          Admin Panel
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          User management, usage stats, and plan overrides.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'var(--text-primary)' },
          { label: 'Pro Users', value: stats.paid, icon: Zap, color: 'var(--xbox-light)' },
          { label: 'Free Users', value: stats.free, icon: TrendingUp, color: '#93C5FD' },
          { label: 'Admins', value: users.filter(u => u.is_admin).length, icon: Shield, color: '#FCD34D' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <Icon size={14} style={{ color }} />
            </div>
            <div className="font-display font-bold text-3xl" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <p className="section-header mb-0">All Users</p>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input pl-8 py-1.5 text-xs w-56"
              placeholder="Search users..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader size={20} className="animate-spin" style={{ color: 'var(--xbox)' }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['User', 'Plan', 'Joined', 'Articles Scanned', 'AI Calls', 'Override'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-surface-3 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full border border-border" />
                        ) : (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: 'var(--surface-4)', color: 'var(--xbox-light)' }}>
                            {u.full_name?.[0] || u.email?.[0] || '?'}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                            {u.full_name || '—'}
                            {u.is_admin && <span className="ml-1 px-1 py-0.5 rounded text-xs" style={{ background: 'rgba(245,158,11,0.15)', color: '#FCD34D', fontSize: '9px' }}>ADMIN</span>}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={u.plan === 'paid' ? 'badge-info' : 'badge-warning'}>
                        {u.plan === 'paid' ? '⚡ Pro' : 'Free'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                      {u.articles_scanned_this_month || 0}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                      {u.ai_calls_this_month || 0}
                    </td>
                    <td className="px-5 py-3.5">
                      {u.id !== adminProfile?.id ? (
                        <div className="relative inline-block">
                          <select
                            value={u.plan}
                            onChange={e => handlePlanOverride(u.id, e.target.value)}
                            disabled={overriding === u.id}
                            className="input py-1 pr-7 text-xs appearance-none cursor-pointer"
                            style={{ width: '90px' }}>
                            <option value="free">Free</option>
                            <option value="paid">Pro</option>
                          </select>
                          {overriding === u.id ? (
                            <Loader size={10} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--xbox)' }} />
                          ) : (
                            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>You</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No users found matching "{search}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
