import { useAuth } from '@/hooks/useAuth'

export default function SettingsPage() {
  const { profile, user } = useAuth()

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px' }}>
      <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 2 }}>Account settings</p>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>Your account details</p>

      <div className="card" style={{ padding: '20px 22px' }}>
        {[
          { label: 'Name',  value: profile?.full_name || '—' },
          { label: 'Email', value: user?.email || '—' },
          { label: 'Plan',  value: profile?.plan ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1) : 'Free' },
        ].map(({ label, value }, i, arr) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: i < arr.length - 1 ? 12 : 0, marginBottom: i < arr.length - 1 ? 12 : 0, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
