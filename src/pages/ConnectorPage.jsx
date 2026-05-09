import { usePageTitle } from '@/hooks/usePageTitle'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { supabase } from '@/lib/supabase'
import { Plug, Trash2, CheckCircle, Loader, ExternalLink, AlertTriangle } from 'lucide-react'

export default function ConnectorPage() {
  const { userId } = useAuth()
  const toast      = useToast()

  const [connectors, setConnectors] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [form,       setForm]       = useState({ subdomain:'', email:'', api_key:'' })

  usePageTitle('Connectors')

  const load = async () => {
    if (!userId) return
    const { data } = await supabase.from('zendesk_connectors').select('*').eq('user_id', userId).order('created_at')
    setConnectors(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  const add = async () => {
    const { subdomain, email, api_key } = form
    if (!subdomain || !email || !api_key) { toast.error('All fields required'); return }
    setSaving(true)
    try {
      const cred = `${email}/token:${api_key}`
      const { error } = await supabase.from('zendesk_connectors').insert({
        user_id: userId, subdomain: subdomain.replace(/\.zendesk\.com$/, '').trim(),
        api_key_encrypted: cred, is_active: true,
      })
      if (error) throw new Error(error.message)
      setForm({ subdomain:'', email:'', api_key:'' })
      toast.success('Connector added')
      load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    const ok = await toast.confirm('Remove this connector?', 'Remove', 'Cancel')
    if (!ok) return
    await supabase.from('zendesk_connectors').delete().eq('id', id).eq('user_id', userId)
    toast.success('Connector removed')
    load()
  }

  return (
    <div style={{ maxWidth:580, margin:'0 auto', padding:'28px 24px' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:3, letterSpacing:-0.3 }}>Zendesk® Connector</h1>
        <p style={{ fontSize:13, color:'var(--text-3)', margin:0 }}>Connect your Zendesk® account to start scanning</p>
      </div>

      {/* Existing connectors */}
      {!loading && connectors.length > 0 && (
        <div style={{ marginBottom:24 }}>
          {connectors.map(c => (
            <div key={c.id} className="card" style={{ padding:'16px 18px', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:'var(--navy-light)', border:'1px solid var(--navy-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Plug size={16} style={{ color:'var(--navy)' }} />
                </div>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:0 }}>{c.subdomain}.zendesk.com</p>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)' }} title="Active" />
                  </div>
                  <a href={`https://${c.subdomain}.zendesk.com`} target="_blank" rel="noreferrer"
                    style={{ fontSize:11, color:'var(--text-3)', display:'flex', alignItems:'center', gap:3 }}>
                    <ExternalLink size={10} /> Open Zendesk®
                  </a>
                </div>
              </div>
              <button onClick={() => remove(c.id)} className="btn btn-ghost btn-sm" style={{ color:'var(--text-3)' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {!loading && connectors.length === 0 && (
        <div style={{ marginBottom:20, padding:'14px 16px', borderRadius:10, background:'var(--navy-light)', border:'1px solid var(--navy-border)', display:'flex', alignItems:'flex-start', gap:10 }}>
          <AlertTriangle size={14} style={{ color:'var(--navy)', marginTop:1, flexShrink:0 }} />
          <p style={{ fontSize:13, color:'var(--navy)', margin:0, lineHeight:1.6 }}>
            You need a Zendesk® connector to run scans. Add your subdomain, admin email, and API token below.
          </p>
        </div>
      )}

      {connectors.length === 0 && (
        <div className="card" style={{ padding:'20px' }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', marginBottom:14 }}>
            {connectors.length > 0 ? 'Add another connector' : 'Connect Zendesk®'}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
            {[
              { key:'subdomain', label:'Subdomain', placeholder:'yourcompany (from yourcompany.zendesk.com)', type:'text' },
              { key:'email',     label:'Admin email', placeholder:'admin@yourcompany.com', type:'email' },
              { key:'api_key',   label:'API token', placeholder:'Paste your Zendesk® API token', type:'password' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--text-2)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</p>
                <input type={type} value={form[key]} placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="input" />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <button onClick={add} disabled={saving} className="btn btn-primary">
              {saving ? <Loader size={14} style={{ animation:'spin 0.7s linear infinite' }} /> : <Plug size={14} />}
              {saving ? 'Connecting...' : 'Connect'}
            </button>
            <a href="https://support.zendesk.com/hc/en-us/articles/4408889192858" target="_blank" rel="noreferrer"
              style={{ fontSize:12, color:'var(--text-3)' }}>
              How to get an API token →
            </a>
          </div>
        </div>
      )}

      {/* Help note */}
      <div style={{ marginTop:20, padding:'12px 14px', borderRadius:9, background:'var(--bg)', border:'1px solid var(--border-md)' }}>
        <p style={{ fontSize:12, color:'var(--text-3)', margin:0, lineHeight:1.7, marginBottom:8 }}>
          ArticleIQ uses read-only access for scanning. To use the <strong>Publish to Zendesk®</strong> feature, your API token must belong to a user with <strong>Guide Admin</strong> role — a regular admin token won't have write access to Help Center articles.
        </p>
        <p style={{ fontSize:12, color:'var(--text-3)', margin:0, lineHeight:1.7 }}>
          To create a token: Zendesk® Admin Center → Apps & Integrations → APIs → Zendesk® API → API Tokens → Add token. Use your Guide Admin account email when connecting.
        </p>
      </div>
    </div>
  )
}
