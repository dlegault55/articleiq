import { createClient } from '@supabase/supabase-js'
import { requireAuth, sanitizeHtml } from './_auth.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  let auth
  try {
    auth = await requireAuth(req)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { connectorId, articleId, html, title, locale = 'en-us' } = req.body
  if (!connectorId || !articleId || !html) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  if (html.length > 500000) {
    return res.status(400).json({ error: 'Content too large' })
  }

  try {
    const { data: connector } = await supabase
      .from('zendesk_connectors').select('*')
      .eq('id', connectorId).eq('user_id', auth.userId).single()
    if (!connector) return res.status(404).json({ error: 'Connector not found' })

    const safeHtml = sanitizeHtml(html)

    // api_key_encrypted is stored as "email/token:apikey"
    // Basic auth needs this base64 encoded
    const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`
    const base = `https://${connector.subdomain}.zendesk.com`

    // Step 1: fetch article to get actual locale
    const articleRes = await fetch(`${base}/api/v2/help_center/articles/${articleId}`, {
      headers: { Authorization: authHeader }
    })

    if (!articleRes.ok) {
      const txt = await articleRes.text()
      return res.status(500).json({ error: `Could not fetch article: ${articleRes.status} ${txt.slice(0,200)}` })
    }

    const articleData = await articleRes.json()
    const actualLocale = articleData.article?.locale || locale
    const sourceLocale = articleData.article?.source_locale || actualLocale

    console.log('Article locale:', actualLocale, 'Source locale:', sourceLocale)

    // Step 2: update via translations endpoint using source locale
    const translationRes = await fetch(
      `${base}/api/v2/help_center/articles/${articleId}/translations/${sourceLocale}`,
      {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ translation: { title: title || undefined, body: safeHtml } }),
      }
    )

    if (translationRes.ok) {
      return res.status(200).json({ success: true, method: 'translations', locale: sourceLocale })
    }

    const translationErr = await translationRes.text()
    console.log('Translations endpoint failed:', translationRes.status, translationErr)

    // Step 3: try the locale-based article update endpoint
    const localeRes = await fetch(
      `${base}/api/v2/help_center/${sourceLocale}/articles/${articleId}`,
      {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: { title: title || undefined, body: safeHtml } }),
      }
    )

    if (localeRes.ok) {
      return res.status(200).json({ success: true, method: 'locale', locale: sourceLocale })
    }

    const localeErr = await localeRes.text()
    console.log('Locale endpoint failed:', localeRes.status, localeErr)

    // Return detailed error so we can see what Zendesk is actually saying
    return res.status(500).json({
      error: `Zendesk® rejected both endpoints`,
      translationsStatus: translationRes.status,
      translationsBody: translationErr.slice(0, 500),
      localeStatus: localeRes.status,
      localeBody: localeErr.slice(0, 500),
      articleLocale: actualLocale,
      sourceLocale,
    })

  } catch (err) {
    console.error('publish-article error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
