import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/lib/supabase'
import { signOut } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Save, LogOut, CheckCircle, Sun, Moon } from 'lucide-react'
import { PageShell } from '@/components/ui'

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.full_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setSaveError(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name })
        .eq('id', profile.id)
      if (error) throw error
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
<PageShell eyebrow="Configuration" title="Settings">

      {/* Profile */}
      <div className="card p-6 mb-4">
        <p className="section-header mb-4">Profile</p>
        <div className="flex items-center gap-4 mb-6">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full" style={{ border: '2px solid var(--border)' }} />
            : <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: 'var(--xbox-subtle)', color: 'var(--xbox)' }}>
                {name?.[0] || '?'}
              </div>}
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{profile?.email}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Google account · Email cannot be changed</div>
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Display Name</label>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        {saveError && (
          <p className="text-xs mb-3" style={{ color: 'var(--badge-critical-color)' }}>{saveError}</p>
        )}

        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving
            ? <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }} />
            : saved
              ? <CheckCircle size={14} />
              : <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Appearance */}
      <div className="card p-6 mb-4">
        <p className="section-header mb-4">Appearance</p>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Choose your preferred colour scheme.</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'light', icon: Sun,  label: 'Light mode' },
            { value: 'dark',  icon: Moon, label: 'Dark mode'  },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                background: theme === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                border: `1px solid ${theme === value ? 'var(--xbox-border)' : 'var(--border)'}`,
                color: theme === value ? 'var(--xbox)' : 'var(--text-secondary)',
                fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              {label}
              {theme === value && <CheckCircle size={13} style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Account info */}
      <div className="card p-6 mb-4">
        <p className="section-header mb-4">Account Info</p>
        <div className="space-y-0 text-sm divide-y" style={{ borderColor: 'var(--border)' }}>
          {[
            ['Plan',                        profile?.plan === 'paid' ? '⚡ Pro' : 'Free'],
            ['Articles scanned this month', profile?.articles_scanned_this_month || 0],
            ['AI calls this month',         profile?.ai_calls_this_month || 0],
            ['Member since',                profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2.5">
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontFamily: 'Fira Code, monospace', fontSize: 12, color: 'var(--text-primary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="card p-6" style={{ borderColor: 'var(--badge-critical-border)' }}>
        <p className="section-header mb-4" style={{ color: 'var(--badge-critical-color)' }}>Danger Zone</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sign out</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Sign out of your ArticleIQ account on this device.</p>
          </div>
          <button onClick={handleSignOut} className="btn-secondary text-xs" style={{ color: 'var(--badge-critical-color)', borderColor: 'var(--badge-critical-border)' }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageShell>
  )
}
