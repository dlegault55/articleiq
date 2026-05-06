import { useAuth } from '@/hooks/useAuth'
import { signOut } from '@/lib/supabase'

export default function SettingsPage() {
  const { profile, user } = useAuth()

  return (
    <div className="page">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 14 }}>Manage your account</p>
      </div>

      <div className="card card-padded" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 20 }}>
          <label>Name</label>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{profile?.full_name || '—'}</p>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Email</label>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{user?.email || '—'}</p>
        </div>
        <div style={{ marginBottom: 24 }}>
          <label>Plan</label>
          <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>{profile?.plan || 'Free'}</p>
        </div>
        <button onClick={() => signOut()} className="btn btn-danger">Sign out</button>
      </div>
    </div>
  )
}
