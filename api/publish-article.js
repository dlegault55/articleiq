import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'
import sanitizeHtml from 'sanitize-html'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let auth
  try { auth = await requireAuth(req) } catch (e) { return res.status(401).json({ error: e.message }) }

  const { connectorId, articleId, title, html } = req.body
  if (!connectorId || !articleId || !html) return res.status(400).json({ error: 'Missing required fields' })

  const { data: connector } = await supabase
    .from('kb_connectors').select('*')
    .eq('id', connectorId).eq('user_id', auth.userId).single()
  if (!connector) return res.status(404).json({ error: 'Connector not found' })

  try {
    const safeHtml = sanitizeHtml(html, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'figure', 'figcaption', 'video', 'source']),
      allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class', 'style', 'id', 'data-*'], img: ['src', 'alt', 'width', 'height'], a: ['href', 'target', 'rel'], video: ['src', 'controls', 'width', 'height'], source: ['src', 'type'] },
    })

    console.log('publish-article: platform=', connector.platform, 'articleId=', articleId)
    const platform = await import(`./platforms/${connector.platform || 'zendesk'}.js`)
    const result = await platform.publishArticle(connector, articleId, title, safeHtml)
    console.log('publish-article: result=', JSON.stringify(result))

    if (!result.success) return res.status(500).json({ error: result.error })
    return res.status(200).json({ success: true, method: result.method })
  } catch (err) {
    console.error('publish-article error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
