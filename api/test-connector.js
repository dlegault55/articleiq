import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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
    const platform = await import(`./platforms/${connector.platform || 'zendesk'}.js`)
    const result = await platform.testConnection(connector)
    if (!result.ok) return res.status(400).json({ error: result.error })
    return res.status(200).json({ ok: true, article_count: result.article_count, can_write: result.can_write })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
