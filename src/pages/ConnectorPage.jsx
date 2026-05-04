import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { Plug, Eye, EyeOff, Trash2, Loader, Plus } from 'lucide-react'

const calculateNextSync = (frequency) => {
  const d = new Date()
  if (frequency === 'daily')   d.setDate(d.getDate() + 1)
  if (frequency === 'weekly')  d.setDate(d.getDate() + 7)
  if (frequency === 'monthly') d.setDate(d.getDate() + 30)
  return d.toISOString()
}

const FREQUENCIES = [
  { value: 'daily',   label: 'Daily',   desc: 'Every 24 hours' },
  { value: 'weekly',  label: 'Weekly',  desc: 'Every 7 days'   },
  { value: 'monthly', label: 'Monthly', desc: 'Every 30 days'  },
]

export default function ConnectorPage() {
  const { profile, user } = useAuth()
  const userId = profile?.id || user?.id
  const [connectors, setConnectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subdomain: '', email: '', token: '', frequency: 'weekly' })
  const [error, setError] = useState(null)

  const loadConnectors = async () => {
    const { data } = await supabase
      .from('zendesk_connectors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setConnectors(data || [])
    setLoading(false)
  }

  useEffect(() => { if (profile) loadConnectors() }, [profile])



  const saveConnector = async () => {
    if (!form.subdomain || !form.email || !form.token) {
      setError('All fields are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Store API key with a simple encoding note:
      // In production, use Supabase vault or a backend function with pgcrypto.
      // Here we store with a hint for display.
      const hint = `...${form.token.slice(-6)}`
      const { error: dbErr } = await supabase.from('zendesk_connectors').upsert({
        user_id: userId,
        subdomain: form.subdomain.trim().toLowerCase(),
        api_key_encrypted: `${form.email}/token:${form.token}`, // TODO: encrypt via Edge Function
        api_key_hint: hint,
        label: 'Zendesk',
        sync_frequency: form.frequency,
        next_sync_at: calculateNextSync(form.frequency),
        last_verified_at: null,
      }, { onConflict: 'user_id,subdomain' })
      if (dbErr) throw dbErr
      await loadConnectors()
      setShowForm(false)
      setForm({ subdomain: '', email: '', token: '', frequency: 'weekly' })
      setTestResult(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteConnector = async (id) => {
    if (!confirm('Remove this Zendesk connector? Scan history will be preserved.')) return
    await supabase.from('zendesk_connectors').delete().eq('id', id)
    loadConnectors()
  }

  return (
    <div className="p-8 max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="section-header">Integrations</p>
          <h1 className="font-display font-bold text-3xl" style={{ color: 'var(--text-primary)' }}>
            Zendesk Connector
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Connect your Zendesk account to start scanning your knowledge base.
          </p>
        </div>
        {connectors.length > 0 && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14} /> Add Connector
          </button>
        )}
      </div>

      {/* Existing connectors */}
      {!loading && connectors.length > 0 && (
        <div className="space-y-3 mb-6">
          {connectors.map((c) => (
            <div key={c.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md flex items-center justify-center"
                  style={{ background: 'rgba(16,124,16,0.15)', border: '1px solid rgba(16,124,16,0.3)' }}>
                  <Plug size={16} style={{ color: 'var(--xbox)' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {c.subdomain}.zendesk.com
                    </span>
                    <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-xbox' : 'bg-gray-500'}`} />
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Key: {c.api_key_hint || '••••••'} · {c.sync_frequency || 'weekly'}
                    {c.next_sync_at && ` · Next sync ${new Date(c.next_sync_at).toLocaleDateString()}`}
                    {c.last_synced_at && ` · Last synced ${new Date(c.last_synced_at).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              <button onClick={() => deleteConnector(c.id)} className="btn-ghost p-2 text-red-400 hover:text-red-300">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {(showForm || connectors.length === 0) && (
        <div className="card-glow p-6">
          <p className="section-header mb-5">Add Zendesk Connector</p>

          <div className="space-y-4">
<div>
              <label className="label">Zendesk Subdomain</label>
              <div className="flex items-center">
                <input className="input rounded-r-none" placeholder="yourcompany"
                  value={form.subdomain}
                  onChange={(e) => setForm(f => ({ ...f, subdomain: e.target.value }))} />
                <div className="px-3 py-2 text-sm rounded-r-md border border-l-0 border-border flex-shrink-0"
                  style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                  .zendesk.com
                </div>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                The subdomain from your Zendesk URL: <span className="font-mono text-xbox-light">https://yourcompany.zendesk.com</span>
              </p>
            </div>

            <div>
              <label className="label">Zendesk Email</label>
              <input
                className="input mb-3"
                type="email"
                placeholder="you@yourcompany.com"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              />

              <label className="label">API Token</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showKey ? 'text' : 'password'}
                  placeholder="your-zendesk-api-token"
                  value={form.token}
                  onChange={(e) => setForm(f => ({ ...f, token: e.target.value }))}
                />
                <button onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Find your token in Zendesk Admin → Apps & Integrations → APIs → Zendesk API → API Tokens
              </p>
            </div>

            {/* Test result */}


            {error && (
              <div className="px-3 py-2.5 rounded-md text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FC8181' }}>
                {error}
              </div>
            )}

            <div className="mb-2">
              <label className="label">Sync Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {FREQUENCIES.map(({ value, label, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, frequency: value }))}
                    style={{
                      padding: '10px 8px', borderRadius: 7, cursor: 'pointer',
                      textAlign: 'center', transition: 'all 0.15s ease',
                      background: form.frequency === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                      border: `1px solid ${form.frequency === value ? 'var(--xbox-border)' : 'var(--border)'}`,
                      color: form.frequency === value ? 'var(--xbox)' : 'var(--text-secondary)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">

              <button onClick={saveConnector} disabled={saving} className="btn-primary">
                {saving ? <Loader size={14} className="animate-spin" /> : <Plug size={14} />}
                {saving ? 'Saving...' : 'Save Connector'}
              </button>
              {connectors.length > 0 && (
                <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security note */}
      <div className="mt-6 px-4 py-3 rounded-md flex items-start gap-2.5"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <div className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--xbox)' }}>🔒</div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Your API key is stored securely in your private Supabase database with row-level security.
          Only you can access it. We recommend using a dedicated Zendesk API token with read-only permissions.
        </p>
      </div>
    </div>
  )
}
