import { useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Mail, CheckCircle, Loader, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ContactPage() {
  usePageTitle('Contact')
  const [form,     setForm]     = useState({ name: '', email: '', message: '' })
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, _honey: '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setDone(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 'clamp(16px,4vw,32px)' }}>
      <Link to="/help" className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
        <ArrowLeft size={14} /> Back to help
      </Link>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: -0.3 }}>Contact support</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>We'll get back to you within one business day</p>
      </div>

      {done ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--green-light)', border: '1px solid var(--green-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={22} style={{ color: 'var(--green)' }} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Message sent</h2>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.6 }}>
            Thanks for reaching out. We'll get back to you at <strong>{form.email}</strong> within one business day.
          </p>
          <Link to="/help" className="btn btn-secondary btn-sm">Back to help docs</Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 24 }}>
          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--red-light)', border: '1px solid var(--red-border)', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--red)', margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={submit}>
            {/* Honeypot — hidden from humans */}
            <input name="_honey" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Name</p>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name" className="input" required />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Email</p>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@company.com" className="input" required />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Message</p>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Describe your issue or question..." rows={5} required
                  className="input" style={{ resize: 'vertical', lineHeight: 1.6 }} />
                <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, textAlign: 'right' }}>
                  {form.message.length}/2000
                </p>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <Loader size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Mail size={14} />}
              {loading ? 'Sending...' : 'Send message'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
