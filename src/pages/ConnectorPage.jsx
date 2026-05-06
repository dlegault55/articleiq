import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PageShell, EmptyState, LoadingState } from '@/components/ui'
import { useConnector } from '@/hooks/useConnector'
import { useToast } from '@/hooks/useToast'
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
  const { userId } = useAuth()
  const { reload: reloadConnector } = useConnector()
  const toast = useToast()
  const [connectors, setConnectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ subdomain: '', email: '', token: '', frequency: 'weekly' })

  const loadConnectors = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('zendesk_connectors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setConnectors(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (userId) loadConnectors()
  }, [userId])

  const saveConnector = async () => {
    const uid = userId
    setError(null)
    setSuccess(false)

    if (!uid)             { setError('Not signed in. Please refresh.'); return }
    if (!form.subdomain)  { setError('Subdomain is required.'); return }
    if (!form.email)      { setError('Email is required.'); return }
    if (!form.token)      { setError('API token is required.'); return }

    setSaving(true)

    const payload = {
      user_id: uid,
      subdomain: form.subdomain.trim().toLowerCase(),
      api_key_encrypted: `${form.email}/token:${form.token}`,
      api_key_hint: `...${form.token.slice(-6)}`,
      label: 'Zendesk',
      sync_frequency: form.frequency,
      next_sync_at: calculateNextSync(form.frequency),
    }

    const { error: dbErr } = await supabase
      .from('zendesk_connectors')
      .upsert(payload, { onConflict: 'user_id,subdomain' })

    setSaving(false)

    if (dbErr) {
      setError(dbErr.message || dbErr.details || JSON.stringify(dbErr))
      return
    }

    toast.success('Zendesk connected successfully!')
    setShowForm(false)
    setForm({ subdomain: '', email: '', token: '', frequency: 'weekly' })
    await loadConnectors()
    reload()
  }

  const deleteConnector = async (id) => {
    const ok = await toast.confirm('Remove this Zendesk connector?', 'Remove', 'Cancel')
    if (!ok) return
    await supabase.from('zendesk_connectors').delete().eq('id', id)
    toast.success('Connector removed')
    loadConnectors()
    reload()
  }

  return (
    <PageShell
      eyebrow="Integrations"
      title="Zendesk Connector"
      subtitle="Connect your Zendesk account to start scanning."
      action={connectors.length > 0 ? <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={14} /> Add Connector</button> : null}
    >

      {/* Existing connectors */}
      {!loading && connectors.length > 0 && (
        <div className="space-y-3 mb-6">
          {connectors.map((c) => (
            <div key={c.id} className="card p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md flex items-center justify-center"
                  style={{ background: 'var(--xbox-subtle)', border: '1px solid var(--xbox-border)' }}>
                  <Plug size={16} style={{ color: 'var(--xbox)' }} />
                </div>
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {c.subdomain}.zendesk.com
                    <span className="ml-2 inline-block w-2 h-2 rounded-full" style={{ background: c.is_active ? 'var(--xbox)' : '#9ca3af', verticalAlign: 'middle' }} />
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Key: {c.api_key_hint || '••••••'} · {c.sync_frequency || 'weekly'}
                    {c.next_sync_at && ` · Next sync ${new Date(c.next_sync_at).toLocaleDateString()}`}
                  </div>
                </div>
              </div>
              <button onClick={() => deleteConnector(c.id)} className="btn-ghost p-2" style={{ color: '#ef4444' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {(showForm || connectors.length === 0) && (
        <div className="card-glow p-6">
          <p className="section-header mb-5">Add Zendesk Connector</p>

          <div className="space-y-4">
            <div>
              <label className="label">Zendesk Subdomain</label>
              <div className="flex">
                <input className="input rounded-r-none" placeholder="yourcompany"
                  value={form.subdomain}
                  onChange={(e) => setForm(f => ({ ...f, subdomain: e.target.value }))} />
                <div className="px-3 py-2 text-sm border border-l-0 rounded-r-md flex-shrink-0"
                  style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  .zendesk.com
                </div>
              </div>
            </div>

            <div>
              <label className="label">Zendesk Email</label>
              <input className="input" type="email" placeholder="you@yourcompany.com"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>

            <div>
              <label className="label">API Token</label>
              <div className="relative">
                <input className="input pr-10" type={showKey ? 'text' : 'password'}
                  placeholder="your-zendesk-api-token"
                  value={form.token}
                  onChange={(e) => setForm(f => ({ ...f, token: e.target.value }))} />
                <button onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                Zendesk Admin → Apps & Integrations → APIs → Zendesk API → API Tokens
              </p>
            </div>

            <div>
              <label className="label">Sync Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {FREQUENCIES.map(({ value, label, desc }) => (
                  <button key={value} type="button"
                    onClick={() => setForm(f => ({ ...f, frequency: value }))}
                    style={{
                      padding: '10px 8px', borderRadius: 7, cursor: 'pointer', textAlign: 'center',
                      background: form.frequency === value ? 'var(--xbox-subtle)' : 'var(--bg-sunken)',
                      border: `1px solid ${form.frequency === value ? 'var(--xbox-border)' : 'var(--border)'}`,
                      color: form.frequency === value ? 'var(--xbox)' : 'var(--text-secondary)',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="px-3 py-2.5 rounded-md text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveConnector} disabled={saving} className="btn-primary">
                {saving ? <Loader size={14} className="animate-spin" /> : <Plug size={14} />}
                {saving ? 'Saving...' : 'Save Connector'}
              </button>
              {connectors.length > 0 && (
                <button onClick={() => { setShowForm(false); setError(null) }} className="btn-ghost">Cancel</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 px-4 py-3 rounded-md flex items-start gap-2.5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <span>🔒</span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Your API token is stored securely with row-level security. Only you can access it.
        </p>
      </div>
    </PageShell>
  )
}
