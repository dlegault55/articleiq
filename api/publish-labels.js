import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let auth
  try { auth = await requireAuth(req) } catch (e) { return res.status(e.status || 401).json({ error: e.message }) }

  const { connectorId, articleId, labels } = req.body
  if (!connectorId || !articleId || !labels?.length) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const { data: connector } = await supabase
      .from('zendesk_connectors').select('*')
      .eq('id', connectorId).eq('user_id', auth.userId).single()
    if (!connector) return res.status(404).json({ error: 'Connector not found' })

    const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`
    const base = `https://${connector.subdomain}.zendesk.com`

    // Fetch existing labels first so we don't overwrite them
    const articleRes = await fetch(`${base}/api/v2/help_center/articles/${articleId}`, {
      headers: { Authorization: authHeader }
    })
    if (!articleRes.ok) throw new Error(`Could not fetch article: ${articleRes.status}`)

    const articleData  = await articleRes.json()
    const existing     = articleData.article?.label_names || []
    const merged       = [...new Set([...existing, ...labels])]

    // Update labels
    const zdRes = await fetch(`${base}/api/v2/help_center/articles/${articleId}`, {
      method: 'PUT',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ article: { label_names: merged } }),
    })

    if (!zdRes.ok) {
      const e = await zdRes.text()
      throw new Error(`Zendesk® ${zdRes.status}: ${e.slice(0, 200)}`)
    }

    return res.status(200).json({ success: true, labels: merged })
  } catch (err) {
    console.error('publish-labels error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
