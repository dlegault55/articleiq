// ─── ArticleIQ — Email via Vercel serverless function ─────────
// Routes through /api/send-email to avoid CORS and keep key server-side

export const sendScanCompleteEmail = async ({ to, firstName, scanId, articles, critical, warning, scanDate }) => {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, firstName, scanId, articles, critical, warning, scanDate }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[Email] Failed:', data)
    } else {
      console.log('[Email] Sent successfully')
    }
  } catch (e) {
    console.error('[Email] Error:', e.message)
  }
}
