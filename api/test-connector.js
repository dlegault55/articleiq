import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let auth
  try { auth = await requireAuth(req) } catch (e) { return res.status(401).json({ error: e.message }) }

  const { connectorId } = req.body
  const { data: connector } = await supabase
    .from('zendesk_connectors').select('*')
    .eq('id', connectorId).eq('user_id', auth.userId).single()
  if (!connector) return res.status(404).json({ error: 'Connector not found' })

  const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`
  const base = `https://${connector.subdomain}.zendesk.com`

  try {
    // Test read access — fetch article count
    const articlesRes = await fetch(`${base}/api/v2/help_center/articles?per_page=1`, {
      headers: { Authorization: authHeader }
    })
    if (!articlesRes.ok) {
      const err = await articlesRes.json().catch(() => ({}))
      return res.status(400).json({ error: `Authentication failed (${articlesRes.status}) — check your email and API token` })
    }
    const articlesData = await articlesRes.json()
    const article_count = articlesData.count || 0

    // Test write access — check if token user has Guide Admin role
    // We do this by attempting to fetch the current user's Guide role
    const userRes  = await fetch(`${base}/api/v2/users/me.json`, {
      headers: { Authorization: authHeader }
    })
    let can_write = false
    if (userRes.ok) {
      const userData = await userRes.json()
      const role = userData.user?.role
      // Guide Admin check — try a no-op PUT to see if we have write access
      if (role === 'admin' || role === 'agent') {
        // Try fetching the permission groups — only Guide Admins can do this
        const pgRes = await fetch(`${base}/api/v2/guide/permission_groups`, {
          headers: { Authorization: authHeader }
        })
        can_write = pgRes.ok
      }
    }

    return res.status(200).json({ ok: true, article_count, can_write })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
