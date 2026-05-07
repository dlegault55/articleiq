import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { supabase, signOut } from '@/lib/supabase'
import { Bell, Scan, Trash2, CheckCircle, Loader, AlertOctagon } from 'lucide-react'

const DEFAULT_SCAN = { outdated: true, wordCount: true, readability: true, labels: true, duplicates: false, links: false }

const SCAN_CHECKS = [
  { key: 'outdated',    label: 'Outdated articles',  desc: 'Not updated in 180+ days' },
  { key: 'wordCount',   label: 'Thin content',        desc: 'Under 150 words' },
  { key: 'readability', label: 'Readability score',   desc: 'Flesch-Kincaid scoring' },
  { key: 'labels',      label: 'Missing labels',      desc: 'No tags or category assigned' },
  { key: 'duplicates',  label: 'Duplicate detection', desc: 'Similar articles in your KB' },
  { key: 'links',       label: 'Broken links',        desc: 'Dead hyperlinks inside articles' },
]

function Section({ title, desc, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{title}</h2>
        {desc && <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{desc}</p>}
      </div>
      <div className="card" style={{ overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, desc, children, border = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 20px', borderBottom: border ? '1px solid var(--border)' : 'none' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{desc}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'background 0.2s', position: 'relative',
        background: value ? 'var(--green)' : 'var(--border-md)' }}>
      <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </button>
  )
}

export default function SettingsPage() {
  const { profile, userId, user } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  const [emailNotifs, setEmailNotifs] = useState(true)
  const [scanDefaults, setScanDefaults] = useState(DEFAULT_SCAN)
  const [saving,   setSaving]   = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Load from profile
  useEffect(() => {
    if (!profile) return
    setEmailNotifs(profile.email_notifications !== false)
    setScanDefaults(profile.scan_defaults || DEFAULT_SCAN)
  }, [profile])

  const save = async (field, value) => {
    setSaving(field)
    try {
      const { error } = await supabase.from('profiles').update({ [field]: value }).eq('id', userId)
      if (error) throw new Error(error.message)
      toast.success('Saved')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(null)
    }
  }

  const toggleEmail = async (val) => {
    setEmailNotifs(val)
    await save('email_notifications', val)
  }

  const toggleScanDefault = async (key, val) => {
    const updated = { ...scanDefaults, [key]: val }
    setScanDefaults(updated)
    await save('scan_defaults', updated)
  }

  const handleDeleteAccount = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', userId)
      await signOut()
      navigate('/')
    } catch (e) {
      toast.error(e.message)
      setDeleting(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: -0.3 }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>Manage your account preferences</p>
      </div>

      {/* ── Account info ── */}
      <Section title="Account" desc="Your account details from Google">
        <Row label="Name" desc="Managed by your Google account" border>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{profile?.full_name || '—'}</span>
        </Row>
        <Row label="Email" desc="Used for scan notifications" border>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.email || '—'}</span>
        </Row>
        <Row label="Plan" border={false}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100,
            background: profile?.plan === 'paid' ? 'var(--green-light)' : 'var(--bg)',
            color: profile?.plan === 'paid' ? 'var(--green)' : 'var(--text-3)',
            border: `1px solid ${profile?.plan === 'paid' ? 'var(--green-border)' : 'var(--border-md)'}`,
          }}>
            {profile?.plan === 'paid' ? '★ Pro' : 'Free plan'}
          </span>
        </Row>
      </Section>

      {/* ── Notifications ── */}
      <Section title="Notifications" desc="Control when and how ArticleIQ contacts you">
        <Row label="Scan completion email"
          desc="Receive an email when a scan finishes with a link to your report"
          border={false}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saving === 'email_notifications' && <Loader size={13} style={{ color: 'var(--green)', animation: 'spin 0.7s linear infinite' }} />}
            <Toggle value={emailNotifs} onChange={toggleEmail} />
          </div>
        </Row>
      </Section>

      {/* ── Scan defaults ── */}
      <Section title="Default scan checks" desc="These checks will be pre-selected every time you start a new scan">
        {SCAN_CHECKS.map(({ key, label, desc }, i) => (
          <Row key={key} label={label} desc={desc} border={i < SCAN_CHECKS.length - 1}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {saving === 'scan_defaults' && <Loader size={13} style={{ color: 'var(--green)', animation: 'spin 0.7s linear infinite' }} />}
              <Toggle value={!!scanDefaults[key]} onChange={(val) => toggleScanDefault(key, val)} />
            </div>
          </Row>
        ))}
      </Section>

      {/* ── Sign out ── */}
      <Section title="Session" desc="Manage your current session">
        <Row label="Sign out" desc="Sign out of your account on this device" border={false}>
          <button onClick={() => signOut()} className="btn btn-secondary btn-sm">
            Sign out
          </button>
        </Row>
      </Section>

      {/* ── Danger zone ── */}
      <Section title="Danger zone" desc="Permanent actions that cannot be undone">
        <Row label="Delete account" desc="Permanently delete your account and all scan data" border={false}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="btn btn-danger btn-sm">
              <Trash2 size={13} /> Delete account
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>
                <AlertOctagon size={13} /> Are you sure?
              </div>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="btn btn-danger btn-sm">
                {deleting ? <Loader size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Trash2 size={13} />}
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          )}
        </Row>
      </Section>
    </div>
  )
}
