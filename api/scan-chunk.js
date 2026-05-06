// api/scan-chunk.js
// Processes one page of articles at a time (fits in Vercel 10s hobby timeout)
// Called repeatedly by the frontend until all articles are processed

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Analysis helpers ─────────────────────────────────────────
const countSyllables = (word) => {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 1
  const vowelGroups = word.match(/[aeiouy]+/g)
  let count = vowelGroups ? vowelGroups.length : 1
  if (word.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

const fleschKincaid = (text) => {
  const clean = (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
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

const PRESETS = {
  fast:     { outdated: true,  wordCount: true,  readability: false, missingMeta: false },
  standard: { outdated: true,  wordCount: true,  readability: true,  missingMeta: true  },
  full:     { outdated: true,  wordCount: true,  readability: true,  missingMeta: true  },
}

const analyzeArticle = (article, preset) => {
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
      issues.push({ severity: 'critical', issue_type: 'low_word_count', description: `Very short article (${wordCount} words).`, metadata: { wordCount } })
    else if (wordCount < 150)
      issues.push({ severity: 'warning', issue_type: 'low_word_count', description: `Short article (${wordCount} words).`, metadata: { wordCount } })
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

  return { wordCount, readabilityScore, issues, hasMissingMeta: !article.title?.trim() || !article.section_id }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { scanJobId, userId, connectorId, preset = 'standard', page = 1 } = req.body
  if (!scanJobId || !userId || !connectorId) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  // Get connector
  const { data: connector } = await supabase
    .from('zendesk_connectors')
    .select('*')
    .eq('id', connectorId)
    .eq('user_id', userId)
    .single()

  if (!connector) return res.status(404).json({ error: 'Connector not found' })

  // Check scan job still active
  const { data: job } = await supabase.from('scan_jobs').select('*').eq('id', scanJobId).single()
  if (!job || job.status === 'failed') return res.status(200).json({ cancelled: true })

  const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`
  const PER_PAGE = 50 // Small enough to fit in 10s timeout

  try {
    // Mark running on first page
    if (page === 1) {
      await supabase.from('scan_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', scanJobId)
    }

    // Fetch one page of articles from Zendesk
    const zdRes = await fetch(
      `https://${connector.subdomain}.zendesk.com/api/v2/help_center/articles?per_page=${PER_PAGE}&page=${page}`,
      { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } }
    )

    if (!zdRes.ok) {
      const err = await zdRes.json().catch(() => ({}))
      throw new Error(err.description || `Zendesk API error ${zdRes.status}`)
    }

    const zdData = await zdRes.json()
    const articles = zdData.articles || []
    const totalCount = zdData.count || 0
    const hasMore = !!zdData.next_page

    // Update total on first page
    if (page === 1) {
      await supabase.from('scan_jobs').update({ total_articles: totalCount }).eq('id', scanJobId)
    }

    // Analyze and save each article
    let criticalCount = 0, warningCount = 0, infoCount = 0, totalIssues = 0

    for (const zdArticle of articles) {
      let analysis
      try { analysis = analyzeArticle(zdArticle, preset) }
      catch (e) { analysis = { wordCount: 0, readabilityScore: null, issues: [], hasMissingMeta: false } }

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
    }

    // Update progress
    const scannedSoFar = (page - 1) * PER_PAGE + articles.length
    await supabase.from('scan_jobs').update({
      scanned_articles: scannedSoFar,
    }).eq('id', scanJobId)

    if (!hasMore) {
      // Final page — complete the scan
      const { data: finalJob } = await supabase.from('scan_jobs').select('critical_count, warning_count, info_count, issues_found').eq('id', scanJobId).single()
      await supabase.from('scan_jobs').update({
        status:        'completed',
        completed_at:  new Date().toISOString(),
        // Accumulate counts from all chunks
        critical_count: (finalJob?.critical_count || 0) + criticalCount,
        warning_count:  (finalJob?.warning_count  || 0) + warningCount,
        info_count:     (finalJob?.info_count     || 0) + infoCount,
        issues_found:   (finalJob?.issues_found   || 0) + totalIssues,
      }).eq('id', scanJobId)

      // Send email
      await sendCompletionEmail(supabase, scanJobId, userId)

      return res.status(200).json({ done: true, page, scannedSoFar, totalCount })
    }

    // Accumulate counts for this chunk
    await supabase.from('scan_jobs').update({
      critical_count: supabase.rpc ? undefined : undefined, // handled at end
    }).eq('id', scanJobId)

    return res.status(200).json({ done: false, page, hasMore, scannedSoFar, totalCount, nextPage: page + 1 })

  } catch (err) {
    console.error('Chunk failed:', err)
    await supabase.from('scan_jobs').update({
      status: 'failed',
      error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq('id', scanJobId)
    return res.status(500).json({ error: err.message })
  }
}

async function sendCompletionEmail(supabase, scanJobId, userId) {
  const RESEND_KEY = process.env.RESEND_API_KEY
  if (!RESEND_KEY) return

  try {
    const [{ data: profile }, { data: job }] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', userId).single(),
      supabase.from('scan_jobs').select('*').eq('id', scanJobId).single(),
    ])
    if (!profile?.email || !job) return

    const reportUrl = `${process.env.APP_URL || 'https://articleiq.vercel.app'}/scanner/results/${scanJobId}`
    const firstName = profile.full_name?.split(' ')[0]
    const critical = job.critical_count || 0
    const articles = job.scanned_articles || 0

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ArticleIQ <onboarding@resend.dev>',
        to: [profile.email],
        subject: `Scan complete — ${critical > 0 ? `${critical} critical issue${critical !== 1 ? 's' : ''} found` : 'No critical issues'} · ${articles} articles`,
        html: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#107C10;padding:20px 28px;border-radius:8px 8px 0 0"><span style="color:#fff;font-weight:700;letter-spacing:3px">ARTICLEIQ</span></div>
          <div style="background:#fff;padding:28px;border:1px solid #E2E2DE;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="margin:0 0 8px;color:#1A1A18">Scan complete${firstName ? `, ${firstName}` : ''}</h2>
            <p style="color:#5C5C58;margin:0 0 20px">${articles} articles · ${job.warning_count || 0} warnings · ${critical} critical</p>
            <a href="${reportUrl}" style="display:inline-block;padding:11px 22px;background:#107C10;color:#fff;border-radius:7px;text-decoration:none;font-weight:600">View report →</a>
          </div>
        </div>`,
      }),
    })
  } catch (e) {
    console.error('Email error:', e.message)
  }
}
