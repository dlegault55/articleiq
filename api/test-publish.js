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

  const base    = `https://${connector.subdomain}.zendesk.com`
  const headers = { Authorization: `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}` }

  // Check the permission group
  const pgRes  = await fetch(`${base}/api/v2/guide/permission_groups/20663`, { headers })
  const pgData = await pgRes.json().catch(() => ({}))

  // Check the section
  const secRes  = await fetch(`${base}/api/v2/help_center/sections/20332919484052`, { headers })
  const secData = await secRes.json().catch(() => ({}))

  // Check current user's Guide role
  const userRes  = await fetch(`${base}/api/v2/users/me`, { headers: { ...headers, 'Content-Type': 'application/json' } })
  const userData = await userRes.json().catch(() => ({}))

  // Try updating a different article that might have a different permission group
  // First find all sections
  const sectionsRes  = await fetch(`${base}/api/v2/help_center/sections?per_page=5`, { headers })
  const sectionsData = await sectionsRes.json().catch(() => ({}))

  return res.status(200).json({
    permission_group: { status: pgRes.status, data: pgData },
    section:          { status: secRes.status, name: secData.section?.name, locale: secData.section?.locale },
    current_user:     { status: userRes.status, role: userData.user?.role, name: userData.user?.name, email: userData.user?.email, restricted_agent: userData.user?.restricted_agent },
    sections_sample:  sectionsData.sections?.slice(0,3).map(s => ({ id: s.id, name: s.name })),
  })
}
