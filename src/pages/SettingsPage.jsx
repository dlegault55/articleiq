import { usePageTitle } from '@/hooks/usePageTitle'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { supabase, signOut } from '@/lib/supabase'
import { Loader, AlertOctagon, Trash2, CheckCircle } from 'lucide-react'

const DEFAULT_SCAN = { outdated:true, wordCount:true, readability:false, labels:true, duplicates:true, links:true }
const SCAN_CHECKS  = [
  { key:'outdated',    label:'Outdated articles',   desc:'Not updated in 180+ days' },
  { key:'wordCount',   label:'Thin content',         desc:'Under 150 words' },
  { key:'readability', label:'Readability score',    desc:'Hard to read articles' },
  { key:'labels',      label:'Missing labels',       desc:'No tags assigned' },
  { key:'duplicates',  label:'Duplicate detection',  desc:'Similar articles' },
  { key:'links',       label:'Broken links',         desc:'Dead hyperlinks' },
]

function Section({ title, desc, children }) {
  return (
    <div style={{ marginBottom:28 }}>
      <div style={{ marginBottom:12 }}>
        <h2 style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:2 }}>{title}</h2>
        {desc && <p style={{ fontSize:12, color:'var(--text-3)', margin:0 }}>{desc}</p>}
      </div>
      <div className="card" style={{ overflow:'hidden' }}>{children}</div>
    </div>
  )
}

function Row({ label, desc, children, border=true }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16, padding:'14px 18px', borderBottom: border ? '1px solid var(--border)' : 'none' }}>
      <div>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--text)', marginBottom:1 }}>{label}</p>
        {desc && <p style={{ fontSize:11, color:'var(--text-3)', margin:0 }}>{desc}</p>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ width:40, height:22, borderRadius:11, border:'none', cursor:'pointer', transition:'background 0.2s', position:'relative',
        background: value ? 'var(--navy)' : 'var(--border-md)' }}>
      <div style={{ position:'absolute', top:2, left: value ? 20 : 2, width:18, height:18, borderRadius:'50%', background:'white', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.15)' }} />
    </button>
  )
}

export default function SettingsPage() {
  const { profile, userId, user } = useAuth()
  usePageTitle('Settings')

  const toast    = useToast()
  const navigate = useNavigate()

  const [emailNotifs,    setEmailNotifs]    = useState(true)
  const [scanDefaults,   setScanDefaults]   = useState(DEFAULT_SCAN)
  const [saving,         setSaving]         = useState(null)
  const [deleting,       setDeleting]       = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)

  useEffect(() => {
    if (!profile) return
    setEmailNotifs(profile.email_notifications !== false)
    const saved = profile.scan_defaults || DEFAULT_SCAN
    setScanDefaults({ ...saved, links: true, duplicates: true })
  }, [profile])

  const save = async (field, value) => {
    setSaving(field)
    try {
      const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', userId)
      if (error) throw new Error(error.message)
      toast.success('Saved')
    } catch (e) { toast.error(e.message) }
    finally { setSaving(null) }
  }

  const toggleEmail = async (val) => { setEmailNotifs(val); await save('email_notifications', val) }

  const toggleScanDefault = async (key, val) => {
    const updated = { ...scanDefaults, [key]: val }
    setScanDefaults(updated)
    await save('scan_defaults', updated)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', userId)
      await signOut()
      navigate('/')
    } catch (e) { toast.error(e.message); setDeleting(false) }
  }

  return (
    <div style={{ maxWidth:580, margin:'0 auto', padding:'28px 24px' }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text)', marginBottom:3, letterSpacing:-0.3 }}>Settings</h1>
        <p style={{ fontSize:13, color:'var(--text-3)', margin:0 }}>Manage your account preferences</p>
      </div>

      <Section title="Account" desc="Your account details from Google">
        <Row label="Name" desc="Managed by your Google account" border>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{profile?.full_name || '—'}</span>
        </Row>
        <Row label="Email" desc="Used for scan notifications" border>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{user?.email || '—'}</span>
        </Row>
        <Row label="Plan" border>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100,
              background: ['pack','annual','paid'].includes(profile?.plan) ? 'var(--navy-light)' : 'var(--bg)',
              color: ['pack','annual','paid'].includes(profile?.plan) ? 'var(--navy)' : 'var(--text-3)',
              border: `1px solid ${['pack','annual','paid'].includes(profile?.plan) ? 'var(--navy-border)' : 'var(--border-md)'}`,
            }}>
              {profile?.plan === 'annual' ? '★ Annual Pro'
                : profile?.plan === 'pack' ? '★ Scan Pack'
                : ['paid'].includes(profile?.plan) ? '★ Pro'
                : 'Free plan'}
            </span>
            {!['pack','annual','paid'].includes(profile?.plan) && (
              <a href="/upgrade" style={{ fontSize:11, color:'var(--navy)', fontWeight:600 }}>Upgrade →</a>
            )}
          </div>
        </Row>
        {profile?.plan === 'pack' && (
          <Row label="Scans remaining" border={false} desc="Credits never expire">
            <span style={{ fontSize:13, fontWeight:700, color: profile?.scans_remaining === 0 ? 'var(--red)' : 'var(--navy)' }}>
              {profile?.scans_remaining ?? '—'} of 5
            </span>
          </Row>
        )}
        {profile?.plan === 'annual' && (
          <Row label="Scans" border={false} desc="Resets with your annual renewal">
            <span style={{ fontSize:13, fontWeight:700, color:'var(--navy)' }}>Unlimited</span>
          </Row>
        )}
      </Section>

      <Section title="Notifications" desc="Control when ArticleIQ contacts you">
        <Row label="Scan completion email" desc="Receive an email with a link to your report when a scan finishes" border={false}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {saving==='email_notifications' && <Loader size={12} style={{ color:'var(--navy)', animation:'spin 0.7s linear infinite' }} />}
            <Toggle value={emailNotifs} onChange={toggleEmail} />
          </div>
        </Row>
      </Section>

      <Section title="Default scan checks" desc="Pre-selected every time you start a new scan">
        {SCAN_CHECKS.map(({ key, label, desc }, i) => (
          <Row key={key} label={label} desc={desc} border={i < SCAN_CHECKS.length - 1}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              {saving==='scan_defaults' && <Loader size={12} style={{ color:'var(--navy)', animation:'spin 0.7s linear infinite' }} />}
              <Toggle value={!!scanDefaults[key]} onChange={(val) => toggleScanDefault(key, val)} />
            </div>
          </Row>
        ))}
      </Section>

      <Section title="Session">
        <Row label="Sign out" desc="Sign out of your account on this device" border={false}>
          <button onClick={() => signOut()} className="btn btn-secondary btn-sm">Sign out</button>
        </Row>
      </Section>

      <Section title="Danger zone" desc="Permanent actions that cannot be undone">
        <Row label="Delete account" desc="Permanently delete your account and all scan data" border={false}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="btn btn-danger btn-sm">
              <Trash2 size={12} /> Delete account
            </button>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--red)', fontWeight:600 }}>
                <AlertOctagon size={12} /> Are you sure?
              </div>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn btn-danger btn-sm">
                {deleting ? <Loader size={12} style={{ animation:'spin 0.7s linear infinite' }} /> : <Trash2 size={12} />}
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          )}
        </Row>
      </Section>
    </div>
  )
}
