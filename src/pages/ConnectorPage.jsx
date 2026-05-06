import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { Plug, Eye, EyeOff, CheckCircle, Trash2, ExternalLink } from 'lucide-react'

export default function ConnectorPage() {
  const { userId } = useAuth()
  const toast = useToast()

  const [connectors, setConnectors] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [showKey,    setShowKey]    = useState(false)
  const [error,      setError]      = useState(null)
  const [form,       setForm]       = useState({ subdomain: '', email: '', token: '' })

  const load = async () => {
    if (!userId) return
    const { data } = await supabase.from('zendesk_connectors').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    setConnectors(data || [])
    setLoading(false)
    if (!data?.length) setShowForm(true)
  }

  useEffect(() => { load() }, [userId])

  const save = async () => {
    if (!form.subdomain || !form.email || !form.token) { setError('All fields are required.'); return }
    setSaving(true); setError(null)
    try {
      const { error: dbErr } = await supabase.from('zendesk_connectors').upsert({
        user_id:           userId,
        subdomain:         form.subdomain.trim().toLowerCase(),
        api_key_encrypted: `${form.email.trim()}/token:${form.token.trim()}`,
        api_key_hint:      `...${form.token.slice(-6)}`,
        label:             'Zendesk',
        is_active:         true,
        sync_frequency:    'weekly',
      }, { onConflict: 'user_id,subdomain' })
      if (dbErr) throw new Error(dbErr.message)
      toast.success('Zendesk connected!')
      setForm({ subdomain: '', email: '', token: '' })
      setShowForm(false)
      load()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    const ok = await toast.confirm('Remove this connector?', 'Remove', 'Cancel')
    if (!ok) return
    await supabase.from('zendesk_connectors').delete().eq('id', id)
    toast.success('Connector removed')
    load()
  }

  if (loading) return <div className="page"><p style={{ color: 'var(--text-muted)' }}>Loading...</p></div>

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ marginBottom: 4 }}>Connectors</h1>
          <p style={{ fontSize: 14 }}>Connect your knowledge base platforms to start scanning.</p>
        </div>
        {connectors.length > 0 && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plug size={14} /> Add Connector
          </button>
        )}
      </div>

      {/* Existing connectors */}
      {connectors.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {connectors.map(c => (
            <div key={c.id} className="card" style={{ padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Plug size={16} style={{ color: 'var(--green)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.subdomain}.zendesk.com</span>
                  <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>API key: {c.api_key_hint}</span>
              </div>
              <a href={`https://${c.subdomain}.zendesk.com`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                <ExternalLink size={13} />
              </a>
              <button onClick={() => remove(c.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Connect form */}
      {showForm && (
        <div className="card card-padded animate-in" style={{ maxWidth: 520 }}>
          <h2 style={{ marginBottom: 4, fontSize: '1rem' }}>Connect Zendesk</h2>
          <p style={{ fontSize: 13, marginBottom: 24 }}>Read-only access — we never modify your articles.</p>

          <div className="field">
            <label>Zendesk Subdomain</label>
            <div style={{ display: 'flex' }}>
              <input className="input" style={{ borderRadius: '6px 0 0 6px', borderRight: 'none' }}
                placeholder="yourcompany"
                value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} />
              <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1.5px solid var(--border-dark)', borderLeft: 'none', borderRadius: '0 6px 6px 0', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                .zendesk.com
              </div>
            </div>
          </div>

          <div className="field">
            <label>Admin Email</label>
            <input className="input" type="email" placeholder="you@company.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          <div className="field">
            <label>API Token</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showKey ? 'text' : 'password'}
                style={{ paddingRight: 40 }}
                placeholder="Your Zendesk API token"
                value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))} />
              <button onClick={() => setShowKey(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <span className="field-hint">
              Find in Zendesk Admin → Apps & Integrations → APIs → API Tokens
            </span>
          </div>

          {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? 'Connecting...' : 'Connect Zendesk'}
            </button>
            {connectors.length > 0 && (
              <button onClick={() => { setShowForm(false); setError(null) }} className="btn btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
