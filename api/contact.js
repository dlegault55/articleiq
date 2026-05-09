const RESEND_KEY   = process.env.RESEND_API_KEY
const CONTACT_TO   = process.env.CONTACT_EMAIL || 'support@articleiq.app'
const RATE_WINDOW  = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT   = 3               // max 3 submissions per IP per hour

const ipLog = new Map() // in-memory, resets on cold start — fine for spam prevention

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Basic rate limiting by IP
  const ip  = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown'
  const now = Date.now()
  const log = ipLog.get(ip) || []
  const recent = log.filter(t => now - t < RATE_WINDOW)

  if (recent.length >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many submissions — please try again later' })
  }
  ipLog.set(ip, [...recent, now])

  const { name, email, message, _honey } = req.body

  // Honeypot — bots fill this, humans don't see it
  if (_honey) return res.status(200).json({ ok: true }) // silently discard

  // Validation
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Please fill in all fields' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' })
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' })
  }

  if (!RESEND_KEY) return res.status(500).json({ error: 'Email not configured' })

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ArticleIQ Contact <onboarding@resend.dev>',
        to:   [CONTACT_TO],
        reply_to: email,
        subject: `ArticleIQ contact: ${name}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto">
            <div style="background:#1B2D5B;padding:16px 24px;border-radius:8px 8px 0 0">
              <span style="color:white;font-weight:800;font-size:15px">ArticleIQ</span>
              <span style="color:rgba(255,255,255,0.5);font-size:13px;margin-left:8px">New contact submission</span>
            </div>
            <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
              <table style="width:100%;margin-bottom:16px;font-size:14px">
                <tr><td style="color:#6b7280;padding:4px 0;width:80px">Name</td><td style="font-weight:600;color:#111827">${name}</td></tr>
                <tr><td style="color:#6b7280;padding:4px 0">Email</td><td><a href="mailto:${email}" style="color:#1B2D5B">${email}</a></td></tr>
              </table>
              <div style="background:#f9fafb;border-radius:8px;padding:16px;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
              <p style="margin-top:16px;font-size:12px;color:#9ca3af">Reply directly to this email to respond to ${name}.</p>
            </div>
          </div>
        `,
      }),
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Contact email error:', err.message)
    return res.status(500).json({ error: 'Failed to send — please try again' })
  }
}
