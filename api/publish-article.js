import { createClient } from '@supabase/supabase-js'
import { requireAuth, sanitizeHtml } from './_auth.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify JWT — userId comes from token, not request body
  let auth
  try {
    auth = await requireAuth(req)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { connectorId, articleId, html, locale = 'en-us' } = req.body
  if (!connectorId || !articleId || !html) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Hard limit on HTML size — prevent abuse
  if (html.length > 500000) {
    return res.status(400).json({ error: 'Content too large' })
  }

  try {
    // Verify connector belongs to authenticated user (not request body userId)
    const { data: connector } = await supabase
      .from('zendesk_connectors').select('*')
      .eq('id', connectorId).eq('user_id', auth.userId).single()
    if (!connector) return res.status(404).json({ error: 'Connector not found' })

    // Sanitize HTML before publishing
    const safeHtml = sanitizeHtml(html)

    const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`

    // Fetch the article's actual locale first — don't assume en-us
    const articleRes = await fetch(
      `https://${connector.subdomain}.zendesk.com/api/v2/help_center/articles/${articleId}`,
      { headers: { Authorization: authHeader } }
    )
    const actualLocale = articleRes.ok
      ? ((await articleRes.json()).article?.locale || locale)
      : locale

    // Try the direct article update endpoint first, fall back to translations
    let zdRes = await fetch(
      `https://${connector.subdomain}.zendesk.com/api/v2/help_center/${actualLocale}/articles/${articleId}`,
      {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: { body: safeHtml } }),
      }
    )

    // If that fails, try the translations endpoint
    if (!zdRes.ok) {
      zdRes = await fetch(
        `https://${connector.subdomain}.zendesk.com/api/v2/help_center/articles/${articleId}/translations/${actualLocale}`,
        {
          method: 'PUT',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ translation: { body: safeHtml } }),
        }
      )
    }

    if (!zdRes.ok) {
      const e = await zdRes.json().catch(() => ({}))
      const detail = e.error || e.description || e.message || JSON.stringify(e)
      throw new Error(`Zendesk® ${zdRes.status}: ${detail}`)
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('publish-article error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
