import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { Plug, Eye, EyeOff, CheckCircle, Trash2, ExternalLink } from 'lucide-react'

const W = { maxWidth: 720, margin: '0 auto', padding: '24px 24px' }

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
        user_id: userId, subdomain: form.subdomain.trim().toLowerCase(),
        api_key_encrypted: `${form.email.trim()}/token:${form.token.trim()}`,
        api_key_hint: `...${form.token.slice(-6)}`, label: 'Zendesk', is_active: true, sync_frequency: 'weekly',
      }, { onConflict: 'user_id,subdomain' })
      if (dbErr) throw new Error(dbErr.message)
      toast.success('Zendesk connected!')
      setForm({ subdomain: '', email: '', token: '' }); setShowForm(false); load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const remove = async (id) => {
    const ok = await toast.confirm('Remove this connector?', 'Remove', 'Cancel')
    if (!ok) return
    await supabase.from('zendesk_connectors').delete().eq('id', id)
    toast.success('Removed'); load()
  }

  if (loading) return <div style={W}><p style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading...</p></div>

  return (
    <div style={W}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 2 }}>Connectors</p>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Connect your knowledge base platforms.</p>
        </div>
        {connectors.length > 0 && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary btn-sm"><Plug size={13} /> Add</button>
        )}
      </div>

      {/* Connected list */}
      {connectors.map(c => (
        <div key={c.id} className="card animate-in" style={{ padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plug size={15} style={{ color: 'var(--green)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {c.subdomain}.zendesk.com <CheckCircle size={13} style={{ color: 'var(--green)' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>API key: {c.api_key_hint}</div>
          </div>
          <a href={`https://${c.subdomain}.zendesk.com`} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm"><ExternalLink size={13} /></a>
          <button onClick={() => remove(c.id)} className="btn btn-ghost btn-sm" style={{ color: 'var(--text-3)' }}><Trash2 size={13} /></button>
        </div>
      ))}

      {/* Form */}
      {showForm && (
        <div className="card animate-in" style={{ padding: '20px 22px', maxWidth: 480 }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Connect Zendesk</p>
          <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 18 }}>Read-only — we never modify your articles.</p>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, marginBottom: 4 }}>Subdomain</label>
            <div style={{ display: 'flex' }}>
              <input className="input" style={{ borderRadius: '8px 0 0 8px', borderRight: 'none', fontSize: 13 }}
                placeholder="yourcompany" value={form.subdomain}
                onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} />
              <div style={{ padding: '0 10px', display: 'flex', alignItems: 'center', background: 'var(--bg)', border: '1.5px solid var(--border-md)', borderLeft: 'none', borderRadius: '0 8px 8px 0', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                .zendesk.com
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, marginBottom: 4 }}>Admin Email</label>
            <input className="input" type="email" style={{ fontSize: 13 }} placeholder="you@company.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>

          <div style={{ marginBottom: 4 }}>
            <label style={{ fontSize: 12, marginBottom: 4 }}>API Token</label>
            <div style={{ position: 'relative' }}>
              <input className="input" type={showKey ? 'text' : 'password'} style={{ paddingRight: 38, fontSize: 13 }}
                placeholder="Your Zendesk API token" value={form.token}
                onChange={e => setForm(f => ({ ...f, token: e.target.value }))} />
              <button onClick={() => setShowKey(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 16 }}>
            Zendesk Admin → Apps & Integrations → APIs → API Tokens
          </p>

          {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">
              {saving ? 'Connecting...' : 'Connect Zendesk'}
            </button>
            {connectors.length > 0 && (
              <button onClick={() => { setShowForm(false); setError(null) }} className="btn btn-secondary btn-sm">Cancel</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
