import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let auth
  try { auth = await requireAuth(req) } catch (e) { return res.status(401).json({ error: e.message }) }

  const { connectorId, articleId } = req.body

  const { data: connector } = await supabase
    .from('zendesk_connectors').select('*')
    .eq('id', connectorId).eq('user_id', auth.userId).single()
  if (!connector) return res.status(404).json({ error: 'No connector' })

  const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`
  const base = `https://${connector.subdomain}.zendesk.com`

  // Test 1: can we READ the article?
  const readRes = await fetch(`${base}/api/v2/help_center/articles/${articleId}`, {
    headers: { Authorization: authHeader }
  })
  const readData = await readRes.json().catch(() => ({}))

  // Test 2: can we read the current user's permissions?
  const meRes = await fetch(`${base}/api/v2/users/me.json`, {
    headers: { Authorization: authHeader }
  })
  const meData = await meRes.json().catch(() => ({}))

  // Test 3: try a PATCH on the article (less strict than PUT)
  const patchRes = await fetch(`${base}/api/v2/help_center/articles/${articleId}`, {
    method: 'PATCH',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ article: { draft: false } })
  })
  const patchBody = await patchRes.text()

  return res.status(200).json({
    read: { status: readRes.status, locale: readData.article?.locale, title: readData.article?.title },
    me: {
      status: meRes.status,
      role: meData.user?.role,
      name: meData.user?.name,
      email: meData.user?.email,
    },
    patch: { status: patchRes.status, body: patchBody.slice(0, 300) },
    credential: connector.api_key_encrypted.split(':')[0], // show email/token part only
  })
}
