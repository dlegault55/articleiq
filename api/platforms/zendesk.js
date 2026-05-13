// Zendesk platform adapter
// Handles all Zendesk-specific API calls for ArticleIQ

const authHeader = (apiKey) => `Basic ${Buffer.from(apiKey).toString('base64')}`
const baseUrl    = (subdomain) => `https://${subdomain}.zendesk.com`

export async function testConnection(connector) {
  const auth = authHeader(connector.api_key_encrypted)
  const base = baseUrl(connector.subdomain)

  const res = await fetch(`${base}/api/v2/help_center/articles?per_page=1`, {
    headers: { Authorization: auth }
  })
  if (!res.ok) return { ok: false, error: `Authentication failed (${res.status}) — check your email and API token` }

  const data = await res.json()
  const article_count = data.count || 0

  const userRes = await fetch(`${base}/api/v2/users/me.json`, { headers: { Authorization: auth } })
  let can_write = false
  if (userRes.ok) {
    const userData = await userRes.json()
    const role = userData.user?.role
    if (role === 'admin' || role === 'agent') {
      const pgRes = await fetch(`${base}/api/v2/guide/permission_groups`, { headers: { Authorization: auth } })
      can_write = pgRes.ok
    }
  }

  return { ok: true, article_count, can_write }
}

export async function fetchArticles(connector) {
  const auth = authHeader(connector.api_key_encrypted)
  const base = baseUrl(connector.subdomain)
  const draftFilter = connector.published_only !== false ? '&draft=false' : ''
  let page = 1, all = [], hasMore = true

  while (hasMore) {
    const res = await fetch(`${base}/api/v2/help_center/articles?per_page=100&page=${page}${draftFilter}`, {
      headers: { Authorization: auth }
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.description || `Zendesk API error ${res.status}`)
    }
    const data = await res.json()
    all = [...all, ...(data.articles || [])]
    hasMore = !!data.next_page
    page++
  }
  return all
}

export async function fetchArticlesChunk(connector, page, perPage = 100) {
  const auth = authHeader(connector.api_key_encrypted)
  const base = baseUrl(connector.subdomain)
  const draftFilter = connector.published_only !== false ? '&draft=false' : ''

  const res = await fetch(`${base}/api/v2/help_center/articles?per_page=${perPage}&page=${page}${draftFilter}`, {
    headers: { Authorization: auth }
  })
  if (!res.ok) throw new Error(`Zendesk API error ${res.status}`)

  const data = await res.json()
  return {
    articles: data.articles || [],
    totalCount: data.count || 0,
    hasMore: !!data.next_page,
  }
}

export async function publishArticle(connector, articleId, title, html) {
  const auth = authHeader(connector.api_key_encrypted)
  const base = baseUrl(connector.subdomain)

  // Try translations endpoint first
  const localeRes = await fetch(`${base}/api/v2/help_center/articles/${articleId}`, {
    headers: { Authorization: auth }
  })
  const sourceLocale = localeRes.ok ? (await localeRes.json()).article?.source_locale || 'en-us' : 'en-us'

  const transRes = await fetch(`${base}/api/v2/help_center/articles/${articleId}/translations/${sourceLocale}`, {
    method: 'PUT',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ translation: { title, body: html } }),
  })
  if (transRes.ok) return { success: true, method: 'translations' }

  // Fallback to locale endpoint
  const locRes = await fetch(`${base}/api/v2/help_center/${sourceLocale}/articles/${articleId}`, {
    method: 'PUT',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ article: { title, body: html } }),
  })
  if (locRes.ok) return { success: true, method: 'locale' }

  return { success: false, error: `Zendesk® rejected both endpoints (${transRes.status}/${locRes.status})` }
}

export async function publishLabels(connector, articleId, labels) {
  const auth = authHeader(connector.api_key_encrypted)
  const base = baseUrl(connector.subdomain)

  const existing = await fetch(`${base}/api/v2/help_center/articles/${articleId}/labels`, {
    headers: { Authorization: auth }
  })
  const existingData = existing.ok ? await existing.json() : { labels: [] }
  const existingNames = (existingData.labels || []).map(l => l.name)
  const toAdd = labels.filter(l => !existingNames.includes(l))

  const results = await Promise.all(toAdd.map(name =>
    fetch(`${base}/api/v2/help_center/articles/${articleId}/labels`, {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: { name } }),
    })
  ))
  return { added: toAdd, existing: existingNames }
}

export async function fetchArticleBody(connector, articleId) {
  const auth = authHeader(connector.api_key_encrypted)
  const res = await fetch(`${baseUrl(connector.subdomain)}/api/v2/help_center/articles/${articleId}`, {
    headers: { Authorization: auth }
  })
  if (!res.ok) throw new Error(`Zendesk API error ${res.status}`)
  const data = await res.json()
  return data.article?.body || ''
}
