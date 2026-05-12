// api/run-scan.js
// Vercel serverless function — runs the entire scan server-side
// No browser tab needed — survives navigation, background tabs, closed windows
//
// Note: Vercel hobby plan has 10s timeout, Pro has 300s (5 min)
// For large knowledge bases, upgrade to Vercel Pro or use chunked scanning

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Helpers ──────────────────────────────────────────────────
const countSyllables = (word) => {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 1
  const vowelGroups = word.match(/[aeiouy]+/g)
  let count = vowelGroups ? vowelGroups.length : 1
  if (word.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

const fleschKincaid = (text) => {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = clean.split(/\s+/).filter(w => w.length > 0)
  if (!sentences.length || !words.length) return 50
  const syllableCount = words.reduce((acc, w) => acc + countSyllables(w), 0)
  const asl = words.length / sentences.length
  const asw = syllableCount / words.length
  return Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * asl - 84.6 * asw)))
}

const countWords = (html) => {
  const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').filter(Boolean).length : 0
}

const normalizeTitle = (title) =>
  (title || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()

const levenshtein = (a, b) => {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

const titleSimilarity = (a, b) => {
  const na = normalizeTitle(a), nb = normalizeTitle(b)
  if (!na || !nb) return 0
  const maxLen = Math.max(na.length, nb.length)
  return maxLen === 0 ? 1 : 1 - levenshtein(na, nb) / maxLen
}

const PRESETS = {
  fast:     { outdated: true,  wordCount: true,  readability: false, missingMeta: false, brokenLinks: false, duplicates: false },
  standard: { outdated: true,  wordCount: true,  readability: true,  missingMeta: true,  brokenLinks: true,  duplicates: true  },
  full:     { outdated: true,  wordCount: true,  readability: true,  missingMeta: true,  brokenLinks: true,  duplicates: true  },
}

const analyzeArticle = (article, preset, duplicateMap, index) => {
  const checks = PRESETS[preset] || PRESETS.standard
  const issues = []
  const body = article.body || ''
  const wordCount = countWords(body)
  const readabilityScore = (checks.readability && body.length > 0) ? fleschKincaid(body) : null
  const daysSinceUpdate = article.updated_at
    ? (Date.now() - new Date(article.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    : 999

  if (!article.title?.trim())
    issues.push({ severity: 'critical', issue_type: 'missing_title', description: 'Article has no title.' })

  if (checks.wordCount) {
    if (wordCount < 50)
      issues.push({ severity: 'critical', issue_type: 'low_word_count', description: `Article is very short (${wordCount} words).`, metadata: { wordCount } })
    else if (wordCount < 150)
      issues.push({ severity: 'warning', issue_type: 'low_word_count', description: `Article is short (${wordCount} words).`, metadata: { wordCount } })
  }

  if (checks.outdated && daysSinceUpdate > 180)
    issues.push({ severity: 'warning', issue_type: 'outdated', description: `Not updated in ${Math.round(daysSinceUpdate)} days.`, metadata: { days: Math.round(daysSinceUpdate) } })

  if (checks.missingMeta && (!article.label_names || article.label_names.length === 0))
    issues.push({ severity: 'warning', issue_type: 'missing_labels', description: 'No labels or tags assigned.' })

  if (checks.readability && readabilityScore !== null) {
    if (readabilityScore < 30)
      issues.push({ severity: 'critical', issue_type: 'low_readability', description: `Readability very low (${readabilityScore}/100).`, metadata: { readabilityScore } })
    else if (readabilityScore < 50)
      issues.push({ severity: 'warning', issue_type: 'low_readability', description: `Readability below average (${readabilityScore}/100).`, metadata: { readabilityScore } })
  }

  if (checks.missingMeta && !article.section_id)
    issues.push({ severity: 'info', issue_type: 'missing_metadata', description: 'Not assigned to any section.' })

  // Duplicates
  if (checks.duplicates && duplicateMap.has(String(index))) {
    const dup = duplicateMap.get(String(index))
    const pct = Math.round(dup.titleSim * 100)
    issues.push({ severity: 'warning', issue_type: 'duplicate_content', description: `${pct}% title similarity with "${dup.matchTitle}". May be a duplicate.`, metadata: dup })
  }

  return { wordCount, readabilityScore, issues, hasMissingMeta: !article.title?.trim() || !article.section_id }
}

const findDuplicates = (articles) => {
  const map = new Map()
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const a = articles[i], b = articles[j]
      if (!a.title || !b.title) continue
      const titleSim = titleSimilarity(a.title, b.title)
      const wA = a.wordCount || 0, wB = b.wordCount || 0
      const maxW = Math.max(wA, wB)
      const wordCountSim = maxW > 0 ? 1 - Math.abs(wA - wB) / maxW : 1
      const isDuplicate = titleSim > 0.85 || (titleSim > 0.70 && wordCountSim > 0.80)
      if (isDuplicate && !map.has(String(i)) && !map.has(String(j))) {
        map.set(String(i), { matchTitle: b.title, titleSim, wordCountSim })
        map.set(String(j), { matchTitle: a.title, titleSim, wordCountSim })
      }
    }
  }
  return map
}

const fetchZendeskArticles = async (subdomain, apiKey) => {
  const authHeader = `Basic ${Buffer.from(apiKey).toString('base64')}`
  const baseUrl = `https://${subdomain}.zendesk.com/api/v2/help_center`
  let page = 1, all = [], hasMore = true

  while (hasMore) {
    const res = await fetch(`${baseUrl}/articles?per_page=100&page=${page}&include=sections`, {
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' }
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

const fetchHelpScoutArticles = async (apiKey, publishedOnly = true) => {
  const authHeader = `Basic ${Buffer.from(`${apiKey}:X`).toString('base64')}`
  const base = 'https://docsapi.helpscout.net/v1'
  const status = publishedOnly ? 'published' : 'all'

  const colRes = await fetch(`${base}/collections?pageSize=100`, { headers: { Authorization: authHeader } })
  if (!colRes.ok) throw new Error(`HelpScout collections API error ${colRes.status}`)
  const colData = await colRes.json()
  const collections = colData.collections?.items || []

  let all = []
  for (const col of collections) {
    let page = 1, hasMore = true
    while (hasMore) {
      const artRes = await fetch(`${base}/collections/${col.id}/articles?pageSize=100&page=${page}&status=${status}`, {
        headers: { Authorization: authHeader }
      })
      if (!artRes.ok) break
      const artData = await artRes.json()
      const items = (artData.articles?.items || []).map(a => ({
        id: a.id,
        title: a.name,
        body: a.text || '',
        html_url: a.url,
        updated_at: a.updatedAt,
        label_names: [],
        locale: 'en-us',
        section_id: col.id,
        draft: a.status !== 'published',
      }))
      all = [...all, ...items]
      hasMore = page < (artData.articles?.pages || 1)
      page++
    }
  }
  return all
}


export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify the request is from an authenticated user
  let auth
  try {
    const { requireAuth } = await import('./_auth.js')
    auth = await requireAuth(req)
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { scanJobId, userId, connectorId, preset = 'standard' } = req.body
  if (!scanJobId || !userId || !connectorId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Ensure the authenticated user matches the requested userId
  if (auth.userId !== userId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  // Fetch connector
  const { data: connector, error: connErr } = await supabase
    .from('kb_connectors')
    .select('*')
    .eq('id', connectorId)
    .eq('user_id', userId)
    .single()

  if (connErr || !connector) return res.status(404).json({ error: 'Connector not found' })

  // Mark running
  await supabase.from('scan_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', scanJobId)

  // Run async — respond immediately so Vercel doesn't timeout waiting
  // The scan runs in the background
  runScanAsync({ scanJobId, userId, connector, preset }).catch(async (err) => {
    console.error('Scan failed:', err)
    await supabase.from('scan_jobs').update({
      status: 'failed',
      error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq('id', scanJobId)
  })

  return res.status(200).json({ success: true, message: 'Scan started server-side' })
}

async function runScanAsync({ scanJobId, userId, connector, preset }) {
  const { subdomain, api_key_encrypted: apiKey } = connector

  // Fetch articles via platform adapter
  const platformAdapter = await import(`./platforms/${connector.platform || 'zendesk'}.js`)
  const articles = await platformAdapter.fetchArticles(connector)

  await supabase.from('scan_jobs').update({
    total_articles: articles.length,
    scanned_articles: 0,
  }).eq('id', scanJobId)

  // Pre-compute word counts for duplicate detection
  const withWordCounts = articles.map(a => ({ ...a, wordCount: countWords(a.body || '') }))
  const checks = PRESETS[preset] || PRESETS.standard
  const duplicateMap = checks.duplicates ? findDuplicates(withWordCounts) : new Map()

  let totalIssues = 0, criticalCount = 0, warningCount = 0, infoCount = 0

  for (let i = 0; i < articles.length; i++) {
    const zdArticle = articles[i]
    let analysis
    try {
      analysis = analyzeArticle(zdArticle, preset, duplicateMap, i)
    } catch (e) {
      console.warn('Failed to analyze article:', zdArticle?.id, e.message)
      analysis = { wordCount: 0, readabilityScore: null, issues: [], hasMissingMeta: false }
    }

    // Save article
    const { data: savedArticle } = await supabase.from('scanned_articles').insert({
      scan_job_id:          scanJobId,
      user_id:              userId,
      zendesk_article_id:   zdArticle.id,
      title:                zdArticle.title || 'Untitled',
      url:                  zdArticle.html_url,
      section:              zdArticle.section_id?.toString(),
      author:               zdArticle.author_id?.toString(),
      word_count:           analysis.wordCount,
      last_updated:         zdArticle.updated_at,
      locale:               zdArticle.locale,
      label_names:          zdArticle.label_names,
      readability_score:    analysis.readabilityScore,
      has_missing_metadata: analysis.hasMissingMeta,
      broken_links_count:   0,
    }).select().single()

    // Save issues
    if (savedArticle && analysis.issues.length > 0) {
      await supabase.from('article_issues').insert(
        analysis.issues.map(issue => ({
          scan_job_id: scanJobId,
          article_id:  savedArticle.id,
          user_id:     userId,
          severity:    issue.severity,
          issue_type:  issue.issue_type,
          description: issue.description,
          metadata:    issue.metadata || {},
        }))
      )
      analysis.issues.forEach(iss => {
        totalIssues++
        if (iss.severity === 'critical') criticalCount++
        else if (iss.severity === 'warning') warningCount++
        else infoCount++
      })
    }

    // Update progress every 5 articles
    if (i % 5 === 0 || i === articles.length - 1) {
      await supabase.from('scan_jobs').update({ scanned_articles: i + 1 }).eq('id', scanJobId)
    }
  }

  // Finalize
  await supabase.from('scan_jobs').update({
    status:           'completed',
    scanned_articles: articles.length,
    issues_found:     totalIssues,
    critical_count:   criticalCount,
    warning_count:    warningCount,
    info_count:       infoCount,
    completed_at:     new Date().toISOString(),
  }).eq('id', scanJobId)

  // Send completion email
  try {
    const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
    if (profile?.email) {
      const RESEND_KEY = process.env.RESEND_API_KEY
      if (RESEND_KEY) {
        const reportUrl = `${process.env.APP_URL || 'https://articleiq.app'}/scanner/results/${scanJobId}`
        const firstName = profile.full_name?.split(' ')[0]
        const scanDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        const html = `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto">
          <div style="background:#107C10;padding:20px 28px;border-radius:8px 8px 0 0">
            <span style="color:#fff;font-weight:700;font-size:16px;letter-spacing:3px">ARTICLEIQ</span>
          </div>
          <div style="background:#fff;padding:28px;border:1px solid #E2E2DE;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="margin:0 0 8px;color:#1A1A18">Your scan is complete${firstName ? `, ${firstName}` : ''}</h2>
            <p style="color:#5C5C58;margin:0 0 20px">${scanDate} · ${articles.length} articles scanned</p>
            <table style="width:100%;margin-bottom:20px"><tr>
              <td style="text-align:center;padding:14px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE"><div style="font-size:26px;font-weight:700;color:${criticalCount>0?'#B91C1C':'#107C10'}">${criticalCount}</div><div style="font-size:12px;color:#9B9B96">Critical</div></td>
              <td style="width:12px"></td>
              <td style="text-align:center;padding:14px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE"><div style="font-size:26px;font-weight:700;color:${warningCount>0?'#92600A':'#107C10'}">${warningCount}</div><div style="font-size:12px;color:#9B9B96">Warnings</div></td>
              <td style="width:12px"></td>
              <td style="text-align:center;padding:14px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE"><div style="font-size:26px;font-weight:700;color:#107C10">${articles.length}</div><div style="font-size:12px;color:#9B9B96">Articles</div></td>
            </tr></table>
            <a href="${reportUrl}" style="display:inline-block;padding:11px 22px;background:#107C10;color:#fff;border-radius:7px;text-decoration:none;font-weight:600;font-size:14px">View full report →</a>
          </div>
        </div>`
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'ArticleIQ <onboarding@resend.dev>',
            to: [profile.email],
            subject: `Scan complete — ${criticalCount > 0 ? `${criticalCount} critical issue${criticalCount !== 1 ? 's' : ''} found` : 'No critical issues'} · ${articles.length} articles`,
            html,
          }),
        })
      }
    }
  } catch (emailErr) {
    console.error('Email send failed:', emailErr.message)
  }
}
