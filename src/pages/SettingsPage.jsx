import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Save, LogOut, Loader, CheckCircle, Sun, Moon, Monitor } from 'lucide-react'

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ full_name: name }).eq('id', profile.id)
    await refreshProfile()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <p className="section-header">Configuration</p>
        <h1 className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>Settings</h1>
      </div>

      {/* Profile */}
      <div className="card p-6 mb-4">
        <p className="section-header mb-4">Profile</p>
        <div className="flex items-center gap-4 mb-6">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full border-2 border-border" />
          ) : (
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: 'var(--surface-4)', color: 'var(--xbox-light)' }}>
              {name?.[0] || '?'}
            </div>
          )}
          <div>
            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{profile?.email}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Google account · Cannot change email</div>
          </div>
        </div>
        <div className="mb-4">
          <label className="label">Display Name</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Theme */}
      <div className="card p-6 mb-4">
        <p className="section-header mb-4">Appearance</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', icon: Sun,     label: 'Light' },
            { value: 'dark',  icon: Moon,    label: 'Dark'  },
            { value: 'system',icon: Monitor, label: 'System'},
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => {
                if (value === 'system') {
                  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                  setTheme(prefersDark ? 'dark' : 'light')
                } else {
                  setTheme(value)
                }
              }}
              className="flex flex-col items-center gap-2 py-4 rounded-lg border transition-all cursor-pointer"
              style={{
                background: theme === value || (value === 'system') ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                borderColor: theme === value ? 'var(--xbox-border)' : 'var(--border)',
                color: theme === value ? 'var(--xbox)' : 'var(--text-secondary)',
              }}
            >
              <Icon size={18} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Account info */}
      <div className="card p-6 mb-4">
        <p className="section-header mb-4">Account Info</p>
        <div className="space-y-3 text-sm">
          {[
            ['User ID', profile?.id?.slice(0, 16) + '...'],
            ['Plan', profile?.plan === 'paid' ? '⚡ Pro' : 'Free'],
            ['Articles scanned this month', profile?.articles_scanned_this_month || 0],
            ['AI calls this month', profile?.ai_calls_this_month || 0],
            ['Member since', profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
        <p className="section-header mb-4" style={{ color: '#FC8181' }}>Danger Zone</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sign out</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sign out of your ArticleIQ account.</p>
          </div>
          <button onClick={handleSignOut} className="btn-secondary text-xs border-red-800/40 hover:border-red-600/50 text-red-400">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
