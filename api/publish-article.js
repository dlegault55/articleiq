import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, connectorId, articleId, html, locale = 'en-us' } = req.body
  if (!userId || !connectorId || !articleId || !html) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Get connector — verify it belongs to this user
    const { data: connector } = await supabase
      .from('zendesk_connectors').select('*')
      .eq('id', connectorId).eq('user_id', userId).single()
    if (!connector) return res.status(404).json({ error: 'Connector not found' })

    // Publish to Zendesk server-side (no CORS issue)
    const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`
    const zdRes = await fetch(
      `https://${connector.subdomain}.zendesk.com/api/v2/help_center/articles/${articleId}/translations/${locale}`,
      {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation: { body: html } }),
      }
    )

    if (!zdRes.ok) {
      const e = await zdRes.json().catch(() => ({}))
      throw new Error(e.error || e.description || `Zendesk error ${zdRes.status}`)
    }

    return res.status(200).json({ success: true })

  } catch (err) {
    console.error('publish-article error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
