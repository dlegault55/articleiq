// Freshdesk platform adapter
// API docs: https://developers.freshdesk.com/api/#solution_article_attributes
// Auth: HTTP Basic with API key as username, 'X' as password

const authHeader = (apiKey) => `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`
const baseUrl    = (subdomain) => {
  // Strip any accidental full domain entries
  const clean = subdomain.replace(/https?:\/\//, '').replace(/\.freshdesk\.com.*/, '').trim()
  return `https://${clean}.freshdesk.com`
}

async function getCategories(subdomain, apiKey) {
  const res = await fetch(`${baseUrl(subdomain)}/api/v2/solutions/categories`, {
    headers: { Authorization: authHeader(apiKey), 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`Freshdesk API error ${res.status}`)
  return await res.json()
}

async function getFolders(subdomain, apiKey, categoryId) {
  const res = await fetch(`${baseUrl(subdomain)}/api/v2/solutions/categories/${categoryId}/folders`, {
    headers: { Authorization: authHeader(apiKey), 'Content-Type': 'application/json' }
  })
  if (!res.ok) return []
  return await res.json()
}

function mapArticle(a, folderId, subdomain) {
  const body = a.description || a.description_text || ''
  return {
    id:          String(a.id),
    title:       a.title || 'Untitled',
    body,
    html_url:    a.url || a.article_url || (a.id && subdomain ? `https://${subdomain}.freshdesk.com/support/solutions/articles/${a.id}` : '') || '',
    updated_at:  a.updated_at,
    label_names: a.tags || [],
    locale:      'en',
    section_id:  String(folderId),
    author_id:   String(a.author_id || ''),
    draft:       a.status !== 2, // 2 = published in Freshdesk
    word_count:  body ? body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length : 0,
  }
}

export async function testConnection(connector) {
  try {
    const auth = authHeader(connector.api_key_encrypted)
    const res = await fetch(`${baseUrl(connector.subdomain)}/api/v2/solutions/categories`, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' }
    })
    if (!res.ok) return { ok: false, error: `Authentication failed (${res.status}) — check your API key and subdomain` }

    const categories = await res.json()
    // Count articles across all folders
    let article_count = 0
    for (const cat of categories.slice(0, 3)) { // sample first 3 categories
      const folders = await getFolders(connector.subdomain, connector.api_key_encrypted, cat.id)
      for (const folder of folders) {
        article_count += folder.articles_count || 0
      }
    }
    return { ok: true, article_count, can_write: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export async function fetchArticles(connector) {
  const auth = authHeader(connector.api_key_encrypted)
  const base = baseUrl(connector.subdomain)
  const publishedOnly = connector.published_only !== false
  const categories = await getCategories(connector.subdomain, connector.api_key_encrypted)
  let all = []

  for (const cat of categories) {
    const folders = await getFolders(connector.subdomain, connector.api_key_encrypted, cat.id)
    for (const folder of folders) {
      let page = 1, hasMore = true
      while (hasMore) {
        const res = await fetch(`${base}/api/v2/solutions/folders/${folder.id}/articles?page=${page}&per_page=30`, {
          headers: { Authorization: auth, 'Content-Type': 'application/json' }
        })
        if (!res.ok) break
        const articles = await res.json()
        const filtered = publishedOnly ? articles.filter(a => a.status === 2) : articles
        all = [...all, ...filtered.map(a => mapArticle(a, folder.id, connector.subdomain))]
        hasMore = articles.length === 30
        page++
      }
    }
  }
  return all
}

export async function fetchArticlesChunk(connector, page, perPage = 50) {
  // Freshdesk: page = folder index (1-based across all folders)
  const auth = authHeader(connector.api_key_encrypted)
  const base = baseUrl(connector.subdomain)
  const publishedOnly = connector.published_only !== false

  const categories = await getCategories(connector.subdomain, connector.api_key_encrypted)
  let allFolders = []
  for (const cat of categories) {
    const folders = await getFolders(connector.subdomain, connector.api_key_encrypted, cat.id)
    allFolders = [...allFolders, ...folders]
  }

  const folderIndex = page - 1
  const folder = allFolders[folderIndex]
  if (!folder) return { articles: [], totalCount: 0, hasMore: false }

  const res = await fetch(`${base}/api/v2/solutions/folders/${folder.id}/articles?page=1&per_page=100`, {
    headers: { Authorization: auth, 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`Freshdesk articles error ${res.status}`)

  const articles = await res.json()
  const filtered = publishedOnly ? articles.filter(a => a.status === 2) : articles
  const totalCount = allFolders.reduce((sum, f) => sum + (f.articles_count || 0), 0)

  return {
    articles: filtered.map(a => mapArticle(a, folder.id, connector.subdomain)),
    totalCount,
    hasMore: folderIndex < allFolders.length - 1,
  }
}

export async function publishArticle(connector, articleId, title, html) {
  const res = await fetch(`${baseUrl(connector.subdomain)}/api/v2/solutions/articles/${articleId}`, {
    method: 'PUT',
    headers: { Authorization: authHeader(connector.api_key_encrypted), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description: html, status: 2 }),
  })
  if (!res.ok) {
    let errText = ''
    try { errText = await res.text() } catch {}
    return { success: false, error: `Freshdesk publish failed (${res.status})${errText ? ': ' + errText.slice(0, 200) : ''}` }
  }
  return { success: true, method: 'freshdesk' }
}

export async function publishLabels(connector, articleId, labels) {
  const res = await fetch(`${baseUrl(connector.subdomain)}/api/v2/solutions/articles/${articleId}`, {
    method: 'PUT',
    headers: { Authorization: authHeader(connector.api_key_encrypted), 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: labels }),
  })
  if (!res.ok) return { added: [], existing: [] }
  return { added: labels, existing: [] }
}

export async function fetchArticleBody(connector, articleId) {
  const res = await fetch(`${baseUrl(connector.subdomain)}/api/v2/solutions/articles/${articleId}`, {
    headers: { Authorization: authHeader(connector.api_key_encrypted), 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`Freshdesk API error ${res.status}`)
  const data = await res.json()
  return data.description || ''
}
