import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { usePageTitle } from '@/hooks/usePageTitle'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import { Plug, Trash2, ExternalLink, Loader, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Clock } from 'lucide-react'

const PLATFORMS = [
  {
    id: 'helpscout',
    name: 'HelpScout',
    logo: '🔵',
    available: true,
    description: 'Connect your HelpScout Docs knowledge base',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Paste your HelpScout API key', hint: 'HelpScout → Your Profile → API Keys → Generate an API key', type: 'password' },
    ],
    helpUrl: 'https://developer.helpscout.com/docs-api/',
    helpLabel: 'How to get your API key →',
  },
  {
    id: 'zendesk',
    name: 'Zendesk®',
    logo: '🎫',
    description: 'Scan your Help Center knowledge base',
    available: true,
    fields: [
      { key: 'subdomain', label: 'Subdomain', placeholder: 'yourcompany', hint: 'The part before .zendesk.com', type: 'text' },
      { key: 'email',     label: 'Admin email', placeholder: 'admin@yourcompany.com', hint: 'Must belong to a user with Guide Admin role', type: 'email' },
      { key: 'api_key',   label: 'API token', placeholder: 'Paste your API token here', hint: 'Admin Center → Apps & Integrations → APIs → Zendesk® API → API Tokens', type: 'password' },
    ],
  },
  { id: 'notion',    name: 'Notion',     description: 'Scan your Notion wiki', available: false },
  { id: 'confluence',name: 'Confluence', description: 'Scan your Confluence space', available: false },
  { id: 'intercom',  name: 'Intercom',   description: 'Scan your Articles', available: false },
]

function TokenGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border-md)', overflow: 'hidden', marginBottom: 16 }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>How to get your Zendesk® API token</span>
        </div>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />}
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginTop: 14 }}>
            {[
              { step: '01', title: 'Open Admin Center', desc: 'In Zendesk®, click the grid icon (⚙️) in the left sidebar to open Admin Center.' },
              { step: '02', title: 'Navigate to API settings', desc: 'Go to Apps & Integrations → APIs → Zendesk® API.' },
              { step: '03', title: 'Enable token access', desc: 'Make sure "Token access" is toggled ON.' },
              { step: '04', title: 'Create a new token', desc: 'Click "Add API token", give it a name like "ArticleIQ", and copy the token immediately — you won\'t see it again.' },
              { step: '05', title: 'Use your Guide Admin email', desc: 'The email you enter must belong to a user with Guide Admin role, otherwise publishing improvements back to Zendesk® won\'t work.' },
            ].map(({ step, title, desc }, i, arr) => (
              <div key={step} style={{ display: 'flex', gap: 12, paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 700, color: 'var(--navy)', fontFamily: 'monospace' }}>{step}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>{desc}</p>
                </div>
              </div>
            ))}
            <a href="https://support.zendesk.com/hc/en-us/articles/4408889192858" target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 14, fontSize: 12, color: 'var(--navy)', fontWeight: 600 }}>
              <ExternalLink size={12} /> Official Zendesk® guide
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

function ConnectorCard({ connector, onRemove, onRemoveWithHistory }) {
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState(null)
  const navigate = useNavigate()

  const testConnection = async () => {
    setTesting(true); setTestResult(null)
    try {
      const res = await apiFetch('/api/test-connector', {
        method: 'POST',
        body: JSON.stringify({ connectorId: connector.id }),
      })
      const data = await res.json()
      setTestResult(res.ok ? { ok: true, articles: data.article_count, canWrite: data.can_write } : { ok: false, message: data.error })
    } catch (e) {
      setTestResult({ ok: false, message: e.message })
    } finally { setTesting(false) }
  }

  return (
    <div className="card" style={{ padding: '16px 18px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plug size={16} style={{ color: 'var(--navy)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{connector.platform === 'helpscout' ? 'HelpScout Docs' : `${connector.subdomain}.zendesk.com`}</p>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
              Connected {connector.created_at ? new Date(connector.created_at).toLocaleDateString() : ''} ·{' '}
              <span style={{ color: connector.published_only !== false ? 'var(--green)' : 'var(--amber)', fontWeight:600 }}>
                {connector.published_only !== false ? 'Published only' : 'All articles'}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={testConnection} disabled={testing} className="btn btn-secondary btn-xs">
            {testing ? <Loader size={11} style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
            {testing ? 'Testing...' : 'Test connection'}
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary btn-xs">
              Run a scan →
            </button>
            <button onClick={() => onRemove(connector.id)} className="btn btn-secondary btn-xs">
              Remove
            </button>
            <button onClick={() => onRemoveWithHistory(connector.id)} className="btn btn-ghost btn-xs" style={{ color:'var(--text-3)' }} title="Remove and delete all scan history">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8,
          background: testResult.ok ? 'var(--green-light)' : 'var(--red-light)',
          border: `1px solid ${testResult.ok ? 'var(--green-border)' : 'var(--red-border)'}`,
        }}>
          {testResult.ok
            ? <CheckCircle size={13} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle size={13} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
          }
          <div>
            {testResult.ok ? (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--green)', margin: '0 0 2px' }}>Connection successful</p>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0 }}>
                  {testResult.articles?.toLocaleString()} articles found ·{' '}
                  {testResult.canWrite
                    ? '✓ Guide Admin — publishing enabled'
                    : '⚠ Not Guide Admin — scanning works but publishing to Zendesk® requires a Guide Admin token'}
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', margin: '0 0 2px' }}>Connection failed</p>
                <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0 }}>{testResult.message}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConnectorPage() {
  usePageTitle('Connectors')
  const { userId } = useAuth()
  const toast      = useToast()

  const [connectors,    setConnectors]    = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(false)
  const [selectedPlat,  setSelectedPlat]  = useState(null)
  const [form,          setForm]          = useState({ published_only: true })

  const load = async () => {
    if (!userId) return
    const { data } = await supabase.from('kb_connectors').select('*').eq('user_id', userId).order('created_at')
    setConnectors(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  const save = async () => {
    const { subdomain, email, api_key } = form
    if (!subdomain || !email || !api_key) { toast.error('All fields required'); return }
    setSaving(true)
    try {
      const cred = `${email}/token:${api_key}`
      const { error } = await supabase.from('kb_connectors').insert({
        user_id: userId,
        subdomain: subdomain.replace(/\.zendesk\.com$/, '').trim().toLowerCase(),
        api_key_encrypted: cred,
        is_active: true,
        published_only: form.published_only !== false,
      })
      if (error) throw new Error(error.message)
      setForm({})
      setSelectedPlat(null)
      toast.success('Connector added')
      load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    const ok = await toast.confirm(
      'Remove this connector?\n\nScan history will be preserved unless you also check "Delete scan history" below.',
      'Remove connector',
      'Cancel'
    )
    if (!ok) return
    await supabase.from('kb_connectors').delete().eq('id', id).eq('user_id', userId)
    toast.success('Connector removed — scan history preserved')
    load()
  }

  const removeWithHistory = async (id) => {
    const ok = await toast.confirm(
      'Remove this connector and permanently delete all scan history? This cannot be undone.',
      'Delete everything',
      'Cancel'
    )
    if (!ok) return
    const { data: jobs } = await supabase.from('scan_jobs').select('id').eq('connector_id', id)
    if (jobs?.length) {
      const jobIds = jobs.map(j => j.id)
      await supabase.from('article_issues').delete().in('scan_job_id', jobIds)
      await supabase.from('scanned_articles').delete().in('scan_job_id', jobIds)
      await supabase.from('scan_jobs').delete().in('id', jobIds)
    }
    await supabase.from('kb_connectors').delete().eq('id', id).eq('user_id', userId)
    toast.success('Connector and all scan history deleted')
    load()
  }

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: 'clamp(16px,4vw,28px) clamp(16px,4vw,24px)' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 3, letterSpacing: -0.3 }}>Connectors</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Connect your knowledge base platforms to start scanning</p>
      </div>

      {/* Existing connectors */}
      {!loading && connectors.map(c => (
        <ConnectorCard key={c.id} connector={c} onRemove={remove} onRemoveWithHistory={removeWithHistory} />
      ))}

      {/* CTA after connecting */}
      {!loading && connectors.length > 0 && (
        <div style={{ padding:'16px 18px', borderRadius:12, background:'var(--navy)', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'white', margin:'0 0 3px' }}>Ready to scan your knowledge base</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', margin:0 }}>Go to the dashboard to run your first scan and find issues across your articles.</p>
          </div>
          <Link to="/dashboard" className="btn btn-sm" style={{ background:'white', color:'var(--navy)', fontWeight:700, flexShrink:0 }}>
            Run a scan →
          </Link>
        </div>
      )}

      {/* Platform picker */}
      {!selectedPlat && (
        <>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)', marginBottom: 10 }}>
            {connectors.length > 0 ? 'Add another platform' : 'Choose a platform'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => p.available && setSelectedPlat(p.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border-md)', background: 'white', cursor: p.available ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit', opacity: p.available ? 1 : 0.5, transition: 'all 0.12s',
                  outline: selectedPlat === p.id ? '2px solid var(--navy)' : 'none',
                }}
                onMouseEnter={e => p.available && (e.currentTarget.style.borderColor = 'var(--navy-border)')}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-md)'}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: p.available ? 'var(--navy-light)' : 'var(--bg)', border: `1px solid ${p.available ? 'var(--navy-border)' : 'var(--border-md)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plug size={15} style={{ color: p.available ? 'var(--navy)' : 'var(--text-3)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 1px' }}>{p.name}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>
                </div>
                {!p.available && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'var(--bg)', color: 'var(--text-3)', border: '1px solid var(--border-md)', flexShrink: 0 }}>Soon</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Zendesk® connection form */}
      {selectedPlat === 'zendesk' && (
        <div className="animate-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plug size={13} style={{ color: 'var(--navy)' }} /></div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Connect Zendesk®</p>
            </div>
            <button onClick={() => { setSelectedPlat(null); setForm({}) }} className="btn btn-ghost btn-xs" style={{ color: 'var(--text-3)' }}>Cancel</button>
          </div>

          <TokenGuide />

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {PLATFORMS[0].fields.map(({ key, label, placeholder, hint, type }) => (
                <div key={key}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
                  <input type={type} value={form[key] || ''} placeholder={placeholder}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="input" />
                  {hint && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>{hint}</p>}
                </div>
              ))}
            </div>

            {/* Published only toggle */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, padding:'12px 14px', borderRadius:9, border:'1px solid var(--border-md)', background:'var(--bg)', marginBottom:4 }}>
              <div>
                <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>Published articles only</p>
                <p style={{ fontSize:11, color:'var(--text-3)', margin:0, lineHeight:1.5 }}>Skip internal and draft articles. Recommended — private articles have auth-protected images and links that trigger false positives in the broken link checker.</p>
              </div>
              <button onClick={() => setForm(f => ({ ...f, published_only: !f.published_only }))}
                style={{ width:40, height:22, borderRadius:11, border:'none', cursor:'pointer', flexShrink:0, transition:'background 0.2s', position:'relative', marginTop:2,
                  background: form.published_only !== false ? 'var(--navy)' : 'var(--border-md)' }}>
                <div style={{ position:'absolute', top:2, left: form.published_only !== false ? 20 : 2, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
              </button>
            </div>

            {/* Warning about Guide Admin */}
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--amber-light)', border: '1px solid var(--amber-border)', display: 'flex', gap: 8, marginBottom: 14 }}>
              <AlertTriangle size={13} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                For publishing improvements directly to Zendesk®, use the email and token of a <strong>Guide Admin</strong> user — not just any admin. Scanning works with any admin token.
              </p>
            </div>

            <button onClick={save} disabled={saving} className="btn btn-primary">
              {saving ? <Loader size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Plug size={14} />}
              {saving ? 'Connecting...' : 'Connect Zendesk®'}
            </button>
          </div>
        </div>
      )}

      {/* HelpScout connection form */}
      {selectedPlat === 'helpscout' && (
        <div className="animate-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plug size={13} style={{ color: 'var(--navy)' }} /></div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Connect HelpScout</p>
            </div>
            <button onClick={() => { setSelectedPlat(null); setForm({}) }} className="btn btn-ghost btn-xs" style={{ color: 'var(--text-3)' }}>Cancel</button>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--navy-light)', border: '1px solid var(--navy-border)', marginBottom: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', margin: '0 0 3px' }}>How to get your HelpScout API key</p>
            <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
              In HelpScout → Your Profile (top right) → Authentication → API Keys → Generate an API Key. Copy and paste it below.
            </p>
          </div>

          <div className="card" style={{ padding: '18px' }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>API Key</p>
              <input type="password" value={form.api_key || ''} placeholder="Paste your HelpScout API key"
                onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                className="input" />
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Your API key is encrypted and stored securely. We never share it.</p>
            </div>
            <button onClick={save} disabled={saving} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {saving ? 'Connecting...' : 'Connect HelpScout'}
            </button>
          </div>
        </div>
      )}

      {/* Coming soon platforms */}
      <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--border-md)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Clock size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, lineHeight: 1.6 }}>
          Notion, Confluence, Intercom, and Freshdesk connectors are coming soon.{' '}
          <a href="/contact" style={{ color: 'var(--navy)', fontWeight: 600 }}>Let us know</a> which platform you need most.
        </p>
      </div>
    </div>
  )
}
