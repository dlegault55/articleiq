// HelpScout platform adapter
// Handles all HelpScout Docs API calls for ArticleIQ
// API docs: https://developer.helpscout.com/docs-api/

const authHeader = (apiKey) => `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`
const BASE = 'https://docsapi.helpscout.net/v1'

async function getCollections(apiKey) {
  const res = await fetch(`${BASE}/collections?pageSize=100`, {
    headers: { Authorization: authHeader(apiKey) }
  })
  if (!res.ok) throw new Error(`HelpScout API error ${res.status}`)
  const data = await res.json()
  return data.collections?.items || []
}

export async function testConnection(connector) {
  try {
    const collections = await getCollections(connector.api_key_encrypted)
    const article_count = collections.reduce((sum, c) => sum + (c.articleCount || 0), 0)
    return { ok: true, article_count, can_write: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export async function fetchArticles(connector) {
  const auth = authHeader(connector.api_key_encrypted)
  const status = connector.published_only !== false ? 'published' : 'all'
  const collections = await getCollections(connector.api_key_encrypted)
  let all = []

  for (const col of collections) {
    let page = 1, hasMore = true
    while (hasMore) {
      const res = await fetch(`${BASE}/collections/${col.id}/articles?pageSize=100&page=${page}&status=${status}`, {
        headers: { Authorization: auth }
      })
      if (!res.ok) break
      const data = await res.json()
      const items = (data.articles?.items || []).map(a => mapArticle(a, col.id))
      all = [...all, ...items]
      hasMore = page < (data.articles?.pages || 1)
      page++
    }
  }
  return all
}

export async function fetchArticlesChunk(connector, page) {
  // HelpScout: page = collection index (1-based)
  const auth = authHeader(connector.api_key_encrypted)
  const status = connector.published_only !== false ? 'published' : 'all'
  const collections = await getCollections(connector.api_key_encrypted)

  const colIndex = page - 1
  const col = collections[colIndex]

  if (!col) return { articles: [], totalCount: 0, hasMore: false }

  const res = await fetch(`${BASE}/collections/${col.id}/articles?pageSize=100&status=${status}`, {
    headers: { Authorization: auth }
  })
  if (!res.ok) throw new Error(`HelpScout articles API error ${res.status}`)

  const data = await res.json()
  const items = data.articles?.items || []
  const totalCount = collections.reduce((sum, c) => sum + (c.articleCount || 0), 0)

  // Fetch full article body for each article (list endpoint returns metadata only)
  const fullArticles = await Promise.all(items.map(async (a) => {
    try {
      const artRes = await fetch(`${BASE}/articles/${a.id}`, { headers: { Authorization: auth } })
      if (!artRes.ok) return mapArticle(a, col.id)
      const artData = await artRes.json()
      const full = artData.article || a
      return mapArticle(full, col.id)
    } catch {
      return mapArticle(a, col.id)
    }
  }))

  return {
    articles: fullArticles,
    totalCount,
    hasMore: colIndex < collections.length - 1,
  }
}

export async function publishArticle(connector, articleId, title, html) {
  const res = await fetch(`${BASE}/articles/${articleId}`, {
    method: 'PUT',
    headers: { Authorization: authHeader(connector.api_key_encrypted), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: title, text: html, status: 'published' }),
  })
  if (!res.ok) {
    const err = await res.text()
    return { success: false, error: `HelpScout publish failed (${res.status}): ${err.slice(0, 200)}` }
  }
  return { success: true, method: 'helpscout' }
}

export async function publishLabels(connector, articleId, labels) {
  // HelpScout doesn't support labels/tags via API in the same way
  return { added: [], existing: [], note: 'HelpScout label publishing not supported via API' }
}

function mapArticle(a, collectionId) {
  const body = a.text || a.body || ''
  return {
    id: a.id,
    title: a.name || a.title || 'Untitled',
    body,
    html_url: a.url,
    updated_at: a.updatedAt || a.updated_at,
    label_names: [],
    locale: 'en-us',
    section_id: collectionId,
    author_id: a.createdBy?.id || a.author_id,
    draft: a.status !== 'published',
    word_count: body ? body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length : 0,
  }
}

export async function fetchArticleBody(connector, articleId) {
  const auth = authHeader(connector.api_key_encrypted)
  const res = await fetch(`${BASE}/articles/${articleId}`, { headers: { Authorization: auth } })
  if (!res.ok) throw new Error(`HelpScout API error ${res.status}`)
  const data = await res.json()
  return data.article?.text || ''
}
