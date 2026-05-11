import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function testZendesk(connector) {
  const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`
  const base = `https://${connector.subdomain}.zendesk.com`

  const articlesRes = await fetch(`${base}/api/v2/help_center/articles?per_page=1`, {
    headers: { Authorization: authHeader }
  })
  if (!articlesRes.ok) {
    return { ok: false, error: `Authentication failed (${articlesRes.status}) — check your email and API token` }
  }
  const articlesData = await articlesRes.json()
  const article_count = articlesData.count || 0

  const userRes = await fetch(`${base}/api/v2/users/me.json`, { headers: { Authorization: authHeader } })
  let can_write = false
  if (userRes.ok) {
    const userData = await userRes.json()
    const role = userData.user?.role
    if (role === 'admin' || role === 'agent') {
      const pgRes = await fetch(`${base}/api/v2/guide/permission_groups`, { headers: { Authorization: authHeader } })
      can_write = pgRes.ok
    }
  }

  return { ok: true, article_count, can_write }
}

async function testHelpScout(connector) {
  // HelpScout Docs API uses HTTP Basic Auth with API key as username, 'X' as password
  const authHeader = `Basic ${Buffer.from(`${connector.api_key_encrypted}:X`).toString('base64')}`
  const base = 'https://docsapi.helpscout.net/v1'

  const collectionsRes = await fetch(`${base}/collections?pageSize=1`, {
    headers: { Authorization: authHeader }
  })
  if (!collectionsRes.ok) {
    return { ok: false, error: `Authentication failed (${collectionsRes.status}) — check your API key` }
  }
  const collectionsData = await collectionsRes.json()
  const collections = collectionsData.collections?.items || []

  // Count articles across all collections
  let article_count = 0
  if (collections.length > 0) {
    const firstCollection = collections[0]
    const articlesRes = await fetch(`${base}/collections/${firstCollection.id}/articles?pageSize=1`, {
      headers: { Authorization: authHeader }
    })
    if (articlesRes.ok) {
      const articlesData = await articlesRes.json()
      article_count = articlesData.articles?.count || 0
    }
  }

  return { ok: true, article_count, can_write: true } // HelpScout API key always has write access
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let auth
  try { auth = await requireAuth(req) } catch (e) { return res.status(401).json({ error: e.message }) }

  const { connectorId } = req.body
  const { data: connector } = await supabase
    .from('kb_connectors').select('*')
    .eq('id', connectorId).eq('user_id', auth.userId).single()
  if (!connector) return res.status(404).json({ error: 'Connector not found' })

  try {
    const result = connector.platform === 'helpscout'
      ? await testHelpScout(connector)
      : await testZendesk(connector)

    if (!result.ok) return res.status(400).json({ error: result.error })
    return res.status(200).json({ ok: true, article_count: result.article_count, can_write: result.can_write })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
