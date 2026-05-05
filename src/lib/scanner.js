// ─── ArticleIQ — Article Scanner Engine ──────────────────────
// Pure analysis — no AI required. Runs on Zendesk article data.

import { supabase } from './supabase'

// ─── Readability: Flesch-Kincaid ─────────────────────────────
const countSyllables = (word) => {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 1
  const vowelGroups = word.match(/[aeiouy]+/g)
  let count = vowelGroups ? vowelGroups.length : 1
  if (word.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

export const fleschKincaid = (text) => {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = clean.split(/\s+/).filter((w) => w.length > 0)
  if (!sentences.length || !words.length) return 50

  const syllableCount = words.reduce((acc, w) => acc + countSyllables(w), 0)
  const asl = words.length / sentences.length // avg sentence length
  const asw = syllableCount / words.length   // avg syllables per word

  const score = 206.835 - 1.015 * asl - 84.6 * asw
  return Math.max(0, Math.min(100, Math.round(score)))
}

// ─── Word count (strip HTML) ──────────────────────────────────
export const countWords = (html) => {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').filter(Boolean).length : 0
}

// ─── Extract links from HTML ──────────────────────────────────
export const extractLinks = (html) => {
  const matches = html.matchAll(/href="([^"]+)"/g)
  return [...matches].map((m) => m[1]).filter((href) => href.startsWith('http'))
}

// ─── Check if article is outdated (>180 days) ─────────────────
const isOutdated = (updatedAt) => {
  if (!updatedAt) return true
  const days = (Date.now() - new Date(updatedAt)) / (1000 * 60 * 60 * 24)
  return days > 180
}

// ─── Analyze a single article ─────────────────────────────────
export const analyzeArticle = (article) => {
  const issues = []
  const body = article.body || ''
  const wordCount = countWords(body)
  const readability = fleschKincaid(body)
  const links = extractLinks(body)

  // Critical: Missing title
  if (!article.title || article.title.trim().length === 0) {
    issues.push({ severity: 'critical', issue_type: 'missing_title', description: 'Article has no title.' })
  }

  // Critical: Very low word count
  if (wordCount < 50) {
    issues.push({
      severity: 'critical',
      issue_type: 'low_word_count',
      description: `Article is very short (${wordCount} words). Minimum recommended: 150 words.`,
      metadata: { wordCount },
    })
  }

  // Warning: Low word count
  if (wordCount >= 50 && wordCount < 150) {
    issues.push({
      severity: 'warning',
      issue_type: 'low_word_count',
      description: `Article is short (${wordCount} words). Consider expanding to at least 150 words.`,
      metadata: { wordCount },
    })
  }

  // Warning: Outdated article
  if (isOutdated(article.updated_at)) {
    const days = article.updated_at
      ? Math.round((Date.now() - new Date(article.updated_at)) / (1000 * 60 * 60 * 24))
      : null
    issues.push({
      severity: 'warning',
      issue_type: 'outdated',
      description: days
        ? `Article hasn't been updated in ${days} days (last: ${new Date(article.updated_at).toLocaleDateString()}).`
        : 'Article has never been updated.',
      metadata: { days, lastUpdated: article.updated_at },
    })
  }

  // Warning: Missing labels/tags
  if (!article.label_names || article.label_names.length === 0) {
    issues.push({
      severity: 'warning',
      issue_type: 'missing_labels',
      description: 'Article has no labels or tags. Labels help with search and organization.',
    })
  }

  // Info: Low readability
  if (readability < 30) {
    issues.push({
      severity: 'critical',
      issue_type: 'low_readability',
      description: `Readability score is very low (${readability}/100). Content may be too complex for readers.`,
      metadata: { readabilityScore: readability },
    })
  } else if (readability < 50) {
    issues.push({
      severity: 'warning',
      issue_type: 'low_readability',
      description: `Readability score is below average (${readability}/100). Consider simplifying language.`,
      metadata: { readabilityScore: readability },
    })
  }

  // Info: No section assigned
  if (!article.section_id) {
    issues.push({
      severity: 'info',
      issue_type: 'missing_metadata',
      description: 'Article is not assigned to any section.',
    })
  }

  const hasMissingMeta = issues.some((i) => i.issue_type === 'missing_title' || i.issue_type === 'missing_metadata')

  return {
    wordCount,
    readabilityScore: readability,
    links,
    issues,
    hasMissingMeta,
    brokenLinksCount: 0, // Set after link checking
  }
}

// ─── Zendesk API: Fetch all articles ─────────────────────────
export const fetchZendeskArticles = async (subdomain, apiKey, onProgress) => {
  // apiKey is stored as "email/token:token" format
  const authHeader = `Basic ${btoa(apiKey)}`
  const baseUrl = `https://${subdomain}.zendesk.com/api/v2/help_center`

  let page = 1
  let allArticles = []
  let hasMore = true

  while (hasMore) {
    const res = await fetch(
      `${baseUrl}/articles?per_page=100&page=${page}&include=sections`,
      { mode: 'cors', headers: { Authorization: authHeader, 'Content-Type': 'application/json' } }
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.description || `Zendesk error ${res.status} — check your subdomain and API token`)
    }

    const data = await res.json()
    allArticles = [...allArticles, ...(data.articles || [])]
    onProgress?.(allArticles.length, data.count)
    hasMore = !!data.next_page
    page++
  }

  return allArticles
}

// ─── Run a full scan job ──────────────────────────────────────
export const PRESETS = {
  fast:     { outdated: true,  wordCount: true,  readability: false, missingMeta: false, brokenLinks: false },
  standard: { outdated: true,  wordCount: true,  readability: true,  missingMeta: true,  brokenLinks: true  },
  full:     { outdated: true,  wordCount: true,  readability: true,  missingMeta: true,  brokenLinks: true  },
}

export const analyzeArticleWithPreset = (article, preset = 'standard') => {
  const checks = PRESETS[preset] || PRESETS.standard
  const issues = []
  const body = article?.body || ''
  const wordCount = countWords(body)
  const readabilityScore = (checks.readability && body.length > 0) ? fleschKincaid(body) : null
  const links = checks.brokenLinks ? extractLinks(body) : []

  if (!article.title?.trim())
    issues.push({ severity: 'critical', issue_type: 'missing_title', description: 'Article has no title.' })

  if (checks.wordCount) {
    if (wordCount < 50) issues.push({ severity: 'critical', issue_type: 'low_word_count', description: `Article is very short (${wordCount} words).`, metadata: { wordCount } })
    else if (wordCount < 150) issues.push({ severity: 'warning', issue_type: 'low_word_count', description: `Article is short (${wordCount} words).`, metadata: { wordCount } })
  }

  if (checks.outdated) {
    const days = article.updated_at ? Math.round((Date.now() - new Date(article.updated_at)) / (1000*60*60*24)) : null
    if (!article.updated_at || days > 180)
      issues.push({ severity: 'warning', issue_type: 'outdated', description: days ? `Not updated in ${days} days.` : 'Never updated.', metadata: { days, lastUpdated: article.updated_at } })
  }

  if (checks.missingMeta && (!article.label_names || article.label_names.length === 0))
    issues.push({ severity: 'warning', issue_type: 'missing_labels', description: 'No labels or tags assigned.' })

  if (checks.readability && readabilityScore !== null) {
    if (readabilityScore < 30) issues.push({ severity: 'critical', issue_type: 'low_readability', description: `Readability very low (${readabilityScore}/100).`, metadata: { readabilityScore } })
    else if (readabilityScore < 50) issues.push({ severity: 'warning', issue_type: 'low_readability', description: `Readability below average (${readabilityScore}/100).`, metadata: { readabilityScore } })
  }

  if (checks.missingMeta && !article.section_id)
    issues.push({ severity: 'info', issue_type: 'missing_metadata', description: 'Not assigned to any section.' })

  return { wordCount, readabilityScore, links, issues, hasMissingMeta: !article.title?.trim() || !article.section_id, brokenLinksCount: 0 }
}

export const runScan = async ({ scanJobId, userId, connector, articleLimit, preset = 'standard', onProgress }) => {
  const { subdomain, api_key_encrypted: apiKey } = connector

  try {
    // Update job to running
    await supabase.from('scan_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', scanJobId)

    const articles = await fetchZendeskArticles(subdomain, apiKey, (scanned, total) => {
      onProgress?.({ phase: 'fetching', scanned, total })
    })

    const limited = articles.slice(0, articleLimit)

    await supabase.from('scan_jobs').update({ total_articles: articles.length, scanned_articles: 0 }).eq('id', scanJobId)

    let totalIssues = 0, criticalCount = 0, warningCount = 0, infoCount = 0

    for (let i = 0; i < limited.length; i++) {
      const zdArticle = limited[i]
      let analysis
      try {
        analysis = analyzeArticleWithPreset(zdArticle, preset)
      } catch (analyzeErr) {
        console.warn('Failed to analyze article:', zdArticle?.id, analyzeErr.message)
        analysis = { wordCount: 0, readabilityScore: null, links: [], issues: [], hasMissingMeta: false, brokenLinksCount: 0 }
      }

      // Insert scanned article
      const { data: savedArticle } = await supabase.from('scanned_articles').insert({
        scan_job_id: scanJobId,
        user_id: userId,
        zendesk_article_id: zdArticle.id,
        title: zdArticle.title,
        url: zdArticle.html_url,
        section: zdArticle.section_id?.toString(),
        author: zdArticle.author_id?.toString(),
        word_count: analysis.wordCount,
        last_updated: zdArticle.updated_at,
        locale: zdArticle.locale,
        label_names: zdArticle.label_names,
        readability_score: analysis.readabilityScore,
        has_missing_metadata: analysis.hasMissingMeta,
        broken_links_count: analysis.brokenLinksCount,
      }).select().single()

      if (savedArticle && analysis.issues.length > 0) {
        const issueRows = analysis.issues.map((issue) => ({
          scan_job_id: scanJobId,
          article_id: savedArticle.id,
          user_id: userId,
          severity: issue.severity,
          issue_type: issue.issue_type,
          description: issue.description,
          metadata: issue.metadata || {},
        }))
        await supabase.from('article_issues').insert(issueRows)
      }

      analysis.issues.forEach((i) => {
        totalIssues++
        if (i.severity === 'critical') criticalCount++
        else if (i.severity === 'warning') warningCount++
        else infoCount++
      })

      onProgress?.({ phase: 'analyzing', scanned: i + 1, total: limited.length })

      await supabase.from('scan_jobs').update({ scanned_articles: i + 1 }).eq('id', scanJobId)
    }

    // Finalize
    await supabase.from('scan_jobs').update({
      status: 'completed',
      issues_found: totalIssues,
      critical_count: criticalCount,
      warning_count: warningCount,
      info_count: infoCount,
      completed_at: new Date().toISOString(),
    }).eq('id', scanJobId)

    return { success: true, totalIssues, criticalCount, warningCount, infoCount }
  } catch (err) {
    await supabase.from('scan_jobs').update({
      status: 'failed',
      error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq('id', scanJobId)
    throw err
  }
}
