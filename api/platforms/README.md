# Platform Adapters

Each file in this directory implements the ArticleIQ platform adapter interface.
Adding a new connector = create a new file here + add it to the connector page UI.

## Required exports

```js
// Test if credentials work and return article count
export async function testConnection(connector) {
  // connector: { api_key_encrypted, subdomain, published_only, platform }
  return { ok: true|false, article_count: Number, can_write: Boolean, error?: String }
}

// Fetch ALL articles (used by run-scan.js for server-side scanning)
export async function fetchArticles(connector) {
  return [ ...articles ] // array of mapped article objects
}

// Fetch a single chunk of articles (used by scan-chunk.js for client-side scanning)
// page is 1-based — for paginated APIs use page directly, for collection-based APIs use as collection index
export async function fetchArticlesChunk(connector, page, perPage = 50) {
  return { articles: [...], totalCount: Number, hasMore: Boolean }
}

// Publish an improved article back to the platform
export async function publishArticle(connector, articleId, title, html) {
  return { success: Boolean, method: String, error?: String }
}

// Publish label/tag suggestions to the platform
export async function publishLabels(connector, articleId, labels) {
  return { added: [...], existing: [...] }
}
```

## Article object shape (standard across all platforms)

```js
{
  id:          String,   // platform article ID (any format — stored as TEXT)
  title:       String,
  body:        String,   // full HTML body
  html_url:    String,   // public URL to the article
  updated_at:  String,   // ISO date string
  label_names: Array,    // string array of tags/labels
  locale:      String,   // e.g. 'en-us'
  section_id:  String,   // collection/category/section ID
  author_id:   String,
  draft:       Boolean,
}
```

## Platforms

| Platform   | File           | Status    | Notes |
|------------|----------------|-----------|-------|
| Zendesk®   | zendesk.js     | ✅ Live   | Guide Admin required for publishing |
| HelpScout  | helpscout.js   | ✅ Live   | Any API key works for all operations |
| Freshdesk  | freshdesk.js   | 🔜 Next   | Similar to Zendesk, REST API |
| Notion     | notion.js      | 🔜 Planned | Different structure — pages not articles |
| Intercom   | intercom.js    | 🔜 Planned | Articles API similar to HelpScout |
| Confluence | confluence.js  | 🔜 Planned | More complex — spaces and pages |
