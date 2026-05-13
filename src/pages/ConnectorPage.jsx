import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '@/hooks/useToast'
import { usePageTitle } from '@/hooks/usePageTitle'
import { supabase } from '@/lib/supabase'
import { apiFetch } from '@/lib/api'
import { Plug, Trash2, ExternalLink, Loader, CheckCircle, AlertTriangle, ChevronDown, ChevronUp, Clock, Eye, EyeOff } from 'lucide-react'

const PLATFORMS = [
  {
    id: 'zendesk', name: 'Zendesk®', available: true,
    description: 'Scan your Help Center knowledge base',
    fields: [
      { key: 'subdomain', label: 'Subdomain', placeholder: 'yourcompany', hint: 'The part before .zendesk.com', type: 'text' },
      { key: 'email',     label: 'Admin email', placeholder: 'admin@yourcompany.com', hint: 'Must belong to a user with Guide Admin role', type: 'email' },
      { key: 'api_key',   label: 'API token', placeholder: 'Paste your API token here', hint: 'Admin Center → Apps & Integrations → APIs → Zendesk® API → API Tokens', type: 'password' },
    ],
    displayUrl:     (c) => `${c.subdomain}.zendesk.com`,
    buildCred:      (f) => `${f.email}/token:${f.api_key}`,
    buildSubdomain: (f) => f.subdomain.replace(/\.zendesk\.com$/, '').trim().toLowerCase(),
    validate:       (f) => !f.subdomain || !f.email || !f.api_key ? 'All fields required' : null,
  },
  {
    id: 'helpscout', name: 'HelpScout', available: true,
    description: 'Connect your HelpScout Docs knowledge base',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'Paste your HelpScout API key', hint: 'HelpScout → Your Profile → API Keys → Generate an API key', type: 'password' },
    ],
    displayUrl:     () => 'HelpScout Docs',
    buildCred:      (f) => f.api_key,
    buildSubdomain: () => 'helpscout',
    validate:       (f) => !f.api_key ? 'API key required' : null,
  },
  {
    id: 'freshdesk', name: 'Freshdesk', available: true,
    description: 'Connect your Freshdesk Solutions knowledge base',
    fields: [
      { key: 'subdomain', label: 'Subdomain', placeholder: 'yourcompany', hint: 'Just the subdomain — not the full URL', type: 'text' },
      { key: 'api_key',   label: 'API Key', placeholder: 'Paste your Freshdesk API key', hint: 'Freshdesk → avatar → Profile Settings → API Key at bottom', type: 'password' },
    ],
    displayUrl:     (c) => `${c.subdomain}.freshdesk.com`,
    buildCred:      (f) => f.api_key,
    buildSubdomain: (f) => f.subdomain.replace(/https?:\/\//, '').replace(/\.freshdesk\.com.*/, '').trim().toLowerCase(),
    validate:       (f) => !f.subdomain || !f.api_key ? 'Subdomain and API key required' : null,
  },
  { id: 'intercom',   name: 'Intercom',   available: false, description: 'Scan your Intercom Articles' },
  { id: 'notion',     name: 'Notion',     available: false, description: 'Scan your Notion wiki' },
  { id: 'confluence', name: 'Confluence', available: false, description: 'Scan your Confluence space' },
]

const PLATFORM_LOGOS = {
  zendesk:   { logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/zendesk.svg',    bg: '#03363D' },
  helpscout: { logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/helpscout.svg',  bg: '#1292EE' },
  freshdesk: { logo: null, bg: '#25C16F', letter: 'f' },
  intercom:  { logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/intercom.svg',   bg: '#1F8DED' },
  notion:    { logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/notion.svg',     bg: '#1A1A18' },
  confluence:{ logo: 'https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@latest/icons/confluence.svg', bg: '#0052CC' },
}

function PlatformLogo({ platform, size = 32 }) {
  const cfg = PLATFORM_LOGOS[platform] || {}
  return (
    <div style={{ width:size, height:size, borderRadius:size*0.25, background:cfg.bg||'var(--navy-light)', display:'flex', alignItems:'center', justifyContent:'center', padding:cfg.logo ? size*0.18 : 0, boxSizing:'border-box', flexShrink:0 }}>
      {cfg.logo
        ? <img src={cfg.logo} alt={platform} style={{ width:'100%', height:'100%', filter:'brightness(0) invert(1)' }} />
        : <span style={{ fontSize:size*0.38, fontWeight:800, color:'white', lineHeight:1 }}>{cfg.letter || (platform||'?')[0].toUpperCase()}</span>
      }
    </div>
  )
}

function ConnectorCard({ connector, onRemove, onRemoveWithHistory }) {
  const [testing, setTesting] = useState(false)
  const [result,  setResult]  = useState(null)
  const navigate = useNavigate()
  const platform = PLATFORMS.find(p => p.id === connector.platform)

  const test = async () => {
    setTesting(true); setResult(null)
    try {
      const res  = await apiFetch('/api/test-connector', { method:'POST', body: JSON.stringify({ connectorId: connector.id }) })
      const data = await res.json()
      setResult(res.ok ? { ok:true, articles:data.article_count, canWrite:data.can_write } : { ok:false, msg:data.error })
    } catch(e) { setResult({ ok:false, msg:e.message }) }
    finally { setTesting(false) }
  }

  return (
    <div style={{ border:'1px solid var(--border-md)', borderRadius:12, background:'white', marginBottom:8, overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
          <PlatformLogo platform={connector.platform || 'zendesk'} size={36} />
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>
                {platform?.displayUrl?.(connector) || `${connector.subdomain}.zendesk.com`}
              </p>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', flexShrink:0 }} />
            </div>
            <p style={{ fontSize:11, color:'var(--text-3)', margin:'2px 0 0' }}>
              Connected {connector.created_at ? new Date(connector.created_at).toLocaleDateString() : ''} ·{' '}
              <span style={{ color:connector.published_only!==false?'var(--green)':'var(--amber)', fontWeight:600 }}>
                {connector.published_only!==false ? 'Published only' : 'All articles'}
              </span>
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <button onClick={test} disabled={testing} className="btn btn-secondary btn-xs">
            {testing ? <Loader size={11} style={{ animation:'spin 0.7s linear infinite' }} /> : null}
            {testing ? 'Testing...' : 'Test connection'}
          </button>
          <button onClick={() => navigate('/dashboard')} className="btn btn-primary btn-xs">Run a scan →</button>
          <button onClick={() => onRemove(connector.id)} className="btn btn-secondary btn-xs">Remove</button>
          <button onClick={() => onRemoveWithHistory(connector.id)} className="btn btn-ghost btn-xs" style={{ color:'var(--text-3)' }} title="Remove and delete scan history">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {result && (
        <div style={{ margin:'0 16px 14px', padding:'10px 12px', borderRadius:8, display:'flex', gap:8, background:result.ok?'var(--green-light)':'var(--red-light)', border:`1px solid ${result.ok?'var(--green-border)':'var(--red-border)'}` }}>
          {result.ok ? <CheckCircle size={13} style={{ color:'var(--green)', flexShrink:0, marginTop:1 }} /> : <AlertTriangle size={13} style={{ color:'var(--red)', flexShrink:0, marginTop:1 }} />}
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:result.ok?'var(--green)':'var(--red)', margin:'0 0 2px' }}>
              {result.ok ? 'Connection successful' : 'Connection failed'}
            </p>
            <p style={{ fontSize:11, color:'var(--text-2)', margin:0 }}>
              {result.ok ? `${result.articles?.toLocaleString()} articles found · ${result.canWrite ? '✓ Publishing enabled' : '⚠ Not Guide Admin — scanning works but publishing requires a Guide Admin token'}` : result.msg}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function ConnectForm({ platform, form, setForm, showKeys, setShowKeys, onSave, onCancel, saving }) {
  return (
    <div style={{ border:'1px solid var(--border-md)', borderRadius:12, background:'white', overflow:'hidden', marginBottom:8 }}>
      {/* Form header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid var(--border-md)', background:'var(--bg)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <PlatformLogo platform={platform.id} size={32} />
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', margin:0 }}>Connect {platform.name}</p>
            <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>{platform.description}</p>
          </div>
        </div>
        <button onClick={onCancel} className="btn btn-ghost btn-xs" style={{ color:'var(--text-3)' }}>Cancel</button>
      </div>

      <div style={{ padding:'16px' }}>
        {/* Fields */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
          {platform.fields.map(({ key, label, placeholder, hint, type }) => (
            <div key={key}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-2)', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</p>
              <div style={{ position:'relative' }}>
                <input
                  type={type === 'password' && !showKeys[key] ? 'password' : 'text'}
                  value={form[key] || ''}
                  placeholder={placeholder}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="input"
                  style={{ paddingRight: type === 'password' ? 36 : undefined }}
                />
                {type === 'password' && (
                  <button type="button" onClick={() => setShowKeys(s => ({ ...s, [key]: !s[key] }))}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', padding:0 }}>
                    {showKeys[key] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
              </div>
              {hint && <p style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>{hint}</p>}
            </div>
          ))}
        </div>

        {/* Published only toggle — shown for all platforms */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, padding:'12px 14px', borderRadius:9, border:'1px solid var(--border-md)', background:'var(--bg)', marginBottom:12 }}>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:2 }}>Published articles only</p>
            <p style={{ fontSize:11, color:'var(--text-3)', margin:0, lineHeight:1.5 }}>Skip internal and draft articles. Recommended — private articles have auth-protected images that trigger false positives in the broken link checker.</p>
          </div>
          <button onClick={() => setForm(f => ({ ...f, published_only: !f.published_only }))}
            style={{ width:40, height:22, borderRadius:11, border:'none', cursor:'pointer', flexShrink:0, transition:'background 0.2s', position:'relative', marginTop:2, background: form.published_only !== false ? 'var(--navy)' : 'var(--border-md)' }}>
            <div style={{ position:'absolute', top:2, left: form.published_only !== false ? 20 : 2, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
          </button>
        </div>

        {/* Zendesk-specific warning */}
        {platform.id === 'zendesk' && (
          <div style={{ padding:'10px 12px', borderRadius:8, background:'var(--amber-light)', border:'1px solid var(--amber-border)', display:'flex', gap:8, marginBottom:12 }}>
            <AlertTriangle size={13} style={{ color:'var(--amber)', flexShrink:0, marginTop:1 }} />
            <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.6 }}>
              For publishing improvements directly to Zendesk®, use the email and token of a <strong>Guide Admin</strong> user. Scanning works with any admin token.
            </p>
          </div>
        )}

        <button onClick={onSave} disabled={saving} className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>
          {saving ? <Loader size={14} style={{ animation:'spin 0.7s linear infinite' }} /> : <Plug size={14} />}
          {saving ? 'Connecting...' : `Connect ${platform.name}`}
        </button>
      </div>
    </div>
  )
}

export default function ConnectorPage() {
  usePageTitle('Connectors')
  const { userId } = useAuth()
  const toast      = useToast()

  const [connectors,   setConnectors]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [selectedPlat, setSelectedPlat] = useState(null)
  const [showKeys,     setShowKeys]     = useState({})
  const [form,         setForm]         = useState({ published_only: true })

  const load = async () => {
    if (!userId) return
    const { data } = await supabase.from('kb_connectors').select('*').eq('user_id', userId).order('created_at')
    setConnectors(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [userId])

  const save = async () => {
    const platform = selectedPlat || 'zendesk'
    const def = PLATFORMS.find(p => p.id === platform)
    const err = def?.validate?.(form)
    if (err) { toast.error(err); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('kb_connectors').insert({
        user_id:           userId,
        subdomain:         def?.buildSubdomain?.(form) || form.subdomain,
        api_key_encrypted: def?.buildCred?.(form) || form.api_key,
        is_active:         true,
        published_only:    form.published_only !== false,
        platform,
      })
      if (error) throw new Error(error.message)
      setForm({ published_only: true })
      setSelectedPlat(null)
      setShowKeys({})
      toast.success('Connector added')
      load()
    } catch(e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    const ok = await toast.confirm('Remove this connector?\n\nScan history will be preserved.', 'Remove connector', 'Cancel')
    if (!ok) return
    await supabase.from('kb_connectors').delete().eq('id', id).eq('user_id', userId)
    toast.success('Connector removed — scan history preserved')
    load()
  }

  const removeWithHistory = async (id) => {
    const ok = await toast.confirm('Remove this connector and permanently delete all scan history? This cannot be undone.', 'Delete everything', 'Cancel')
    if (!ok) return
    const { data: jobs } = await supabase.from('scan_jobs').select('id').eq('connector_id', id)
    if (jobs?.length) {
      const ids = jobs.map(j => j.id)
      await supabase.from('article_issues').delete().in('scan_job_id', ids)
      await supabase.from('scanned_articles').delete().in('scan_job_id', ids)
      await supabase.from('scan_jobs').delete().in('id', ids)
    }
    await supabase.from('kb_connectors').delete().eq('id', id).eq('user_id', userId)
    toast.success('Connector and all scan history deleted')
    load()
  }

  const selectedPlatDef = PLATFORMS.find(p => p.id === selectedPlat)

  return (
    <div style={{ maxWidth:720, margin:'0 auto', padding:'clamp(24px,4vw,40px) clamp(16px,4vw,32px)' }}>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:4, letterSpacing:-0.4 }}>Connectors</h1>
        <p style={{ fontSize:13, color:'var(--text-3)', margin:0 }}>Connect your knowledge base to start scanning</p>
      </div>

      {/* Connected platforms */}
      {!loading && connectors.map(c => (
        <ConnectorCard key={c.id} connector={c} onRemove={remove} onRemoveWithHistory={removeWithHistory} />
      ))}

      {/* Run a scan CTA */}
      {!loading && connectors.length > 0 && !selectedPlat && (
        <Link to="/dashboard" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, padding:'14px 16px', borderRadius:12, background:'var(--navy)', marginBottom:24, textDecoration:'none' }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:'white', margin:'0 0 2px' }}>Ready to scan your knowledge base</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', margin:0 }}>Go to the dashboard to run your first scan</p>
          </div>
          <span className="btn btn-sm" style={{ background:'white', color:'var(--navy)', fontWeight:700, flexShrink:0 }}>Run a scan →</span>
        </Link>
      )}

      {/* Connect form */}
      {selectedPlatDef && (
        <ConnectForm
          platform={selectedPlatDef}
          form={form}
          setForm={setForm}
          showKeys={showKeys}
          setShowKeys={setShowKeys}
          onSave={save}
          onCancel={() => { setSelectedPlat(null); setForm({ published_only: true }); setShowKeys({}) }}
          saving={saving}
        />
      )}

      {/* Platform picker */}
      {!selectedPlat && (
        <div>
          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'var(--text-3)', marginBottom:10 }}>
            {connectors.length > 0 ? 'Add another platform' : 'Choose a platform'}
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
            {PLATFORMS.map(p => (
              <button key={p.id} onClick={() => p.available && setSelectedPlat(p.id)}
                disabled={!p.available}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:10, border:'1px solid var(--border-md)', background:'white', cursor:p.available?'pointer':'default', textAlign:'left', fontFamily:'inherit', opacity:p.available?1:0.45, transition:'border-color 0.12s', width:'100%', boxSizing:'border-box' }}
                onMouseEnter={e => p.available && (e.currentTarget.style.borderColor='var(--navy)')}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border-md)'}>
                <PlatformLogo platform={p.id} size={32} />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', margin:'0 0 1px' }}>{p.name}</p>
                  <p style={{ fontSize:11, color:'var(--text-3)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.description}</p>
                </div>
                {!p.available && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:4, background:'var(--bg)', color:'var(--text-3)', border:'1px solid var(--border-md)', flexShrink:0 }}>Soon</span>}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 14px', borderRadius:10, border:'1px solid var(--border-md)', background:'var(--bg)' }}>
            <Clock size={13} style={{ color:'var(--text-3)', flexShrink:0 }} />
            <p style={{ fontSize:12, color:'var(--text-3)', margin:0 }}>
              Intercom, Notion, and Confluence coming soon.{' '}
              <a href="/contact" style={{ color:'var(--navy)', fontWeight:600 }}>Let us know</a> which you need most.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
