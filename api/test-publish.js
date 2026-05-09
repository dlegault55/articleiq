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

  const base = `https://${connector.subdomain}.zendesk.com`

  // Test both auth header formats
  const authV1 = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`

  // Also try without /token suffix in case it's being double-applied
  const credParts = connector.api_key_encrypted.split(':')
  const apiKey    = credParts[credParts.length - 1]
  const emailPart = credParts[0].replace('/token', '')
  const authV2    = `Basic ${Buffer.from(`${emailPart}/token:${apiKey}`).toString('base64')}`
  const authV3    = `Basic ${Buffer.from(`${emailPart}:${apiKey}`).toString('base64')}`

  const results = {}

  // Test GET with each auth format
  for (const [name, header] of [['stored', authV1], ['rebuilt', authV2], ['no-token', authV3]]) {
    const r = await fetch(`${base}/api/v2/help_center/articles/${articleId}`, {
      headers: { Authorization: header }
    })
    results[`get_${name}`] = r.status
  }

  // Test PUT with stored auth — minimal body
  const putR = await fetch(`${base}/api/v2/help_center/articles/${articleId}/translations/en-us`, {
    method: 'PUT',
    headers: { Authorization: authV1, 'Content-Type': 'application/json' },
    body: JSON.stringify({ translation: { body: '<p>test</p>' } }),
  })
  const putBody = await putR.text()
  results.put_stored = { status: putR.status, body: putBody.slice(0, 500) }

  // Test PUT with rebuilt auth
  const putR2 = await fetch(`${base}/api/v2/help_center/articles/${articleId}/translations/en-us`, {
    method: 'PUT',
    headers: { Authorization: authV2, 'Content-Type': 'application/json' },
    body: JSON.stringify({ translation: { body: '<p>test</p>' } }),
  })
  const putBody2 = await putR2.text()
  results.put_rebuilt = { status: putR2.status, body: putBody2.slice(0, 500) }

  // Check if article is a draft — drafts can't be updated via API sometimes
  const articleR = await fetch(`${base}/api/v2/help_center/articles/${articleId}`, {
    headers: { Authorization: authV1 }
  })
  const articleData = await articleR.json().catch(() => ({}))
  results.article_info = {
    draft: articleData.article?.draft,
    managed_by: articleData.article?.user_segment_id,
    permission_group: articleData.article?.permission_group_id,
    section_id: articleData.article?.section_id,
  }

  return res.status(200).json(results)
}
