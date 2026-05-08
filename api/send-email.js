// api/send-email.js
// Vercel serverless function — auto-deployed from GitHub
// Called from the frontend, runs server-side so no CORS issues

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' })
  }

  const { to, firstName, scanId, articles, critical, warning, scanDate } = req.body

  if (!to || !scanId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const reportUrl = `https://articleiq.app/scanner/results/${scanId}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F4;font-family:Inter,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #E2E2DE;overflow:hidden">
    <div style="background:#107C10;padding:24px 32px">
      <span style="font-family:Inter,sans-serif;font-weight:700;font-size:18px;letter-spacing:3px;color:#fff">ARTICLEIQ</span>
    </div>
    <div style="padding:32px">
      <h1 style="font-size:22px;font-weight:700;color:#1A1A18;margin:0 0 8px 0">Your scan is complete${firstName ? `, ${firstName}` : ''}</h1>
      <p style="font-size:14px;color:#5C5C58;margin:0 0 24px 0">${scanDate} · ${articles} articles scanned</p>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
        <div style="text-align:center;padding:16px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE">
          <div style="font-size:28px;font-weight:700;color:${critical > 0 ? '#B91C1C' : '#107C10'}">${critical}</div>
          <div style="font-size:12px;color:#9B9B96;margin-top:2px">Critical</div>
        </div>
        <div style="text-align:center;padding:16px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE">
          <div style="font-size:28px;font-weight:700;color:${warning > 0 ? '#92600A' : '#107C10'}">${warning}</div>
          <div style="font-size:12px;color:#9B9B96;margin-top:2px">Warnings</div>
        </div>
        <div style="text-align:center;padding:16px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE">
          <div style="font-size:28px;font-weight:700;color:#107C10">${articles}</div>
          <div style="font-size:12px;color:#9B9B96;margin-top:2px">Articles</div>
        </div>
      </div>

      <p style="font-size:14px;color:#5C5C58;margin:0 0 24px 0">
        ${critical > 0
          ? `You have <strong style="color:#B91C1C">${critical} critical issue${critical !== 1 ? 's' : ''}</strong> that need immediate attention.`
          : 'No critical issues found — your knowledge base is looking good!'}
      </p>

      <a href="${reportUrl}" style="display:inline-block;padding:12px 24px;background:#107C10;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        View full report →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #E2E2DE;background:#F5F5F4">
      <p style="font-size:12px;color:#9B9B96;margin:0">ArticleIQ · <a href="https://articleiq.app" style="color:#107C10;text-decoration:none">articleiq.app</a></p>
    </div>
  </div>
</body>
</html>`

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ArticleIQ <onboarding@resend.dev>',
        to: [to],
        subject: `Scan complete — ${critical > 0 ? `${critical} critical issue${critical !== 1 ? 's' : ''} found` : 'No critical issues'} · ${articles} articles`,
        html,
      }),
    })

    const result = await emailRes.json()

    if (!emailRes.ok) {
      console.error('[Email] Resend error:', result)
      return res.status(500).json({ error: result })
    }

    return res.status(200).json({ success: true, id: result.id })
  } catch (e) {
    console.error('[Email] Failed:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
