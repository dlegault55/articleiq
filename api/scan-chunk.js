import { requireAuth, rateLimit } from './_auth.js'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Text analysis ─────────────────────────────────────────────
const countSyllables = (word) => {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 1
  const groups = word.match(/[aeiouy]+/g)
  let n = groups ? groups.length : 1
  if (word.endsWith('e') && n > 1) n--
  return Math.max(1, n)
}

const fleschKincaid = (text) => {
  const clean = (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/[.!?]+/).filter(s => s.trim())
  const words = clean.split(/\s+/).filter(Boolean)
  if (!sentences.length || !words.length) return 50
  const syllables = words.reduce((a, w) => a + countSyllables(w), 0)
  return Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * (words.length / sentences.length) - 84.6 * (syllables / words.length))))
}

const countWords = (html) => {
  const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').filter(Boolean).length : 0
}


const checkBrokenLinks = async (html) => {
  if (!html) return []
  const matches = [...html.matchAll(/href=["']([^"']+)["']/g)]
  const urls = [...new Set(matches.map(m => m[1]).filter(u => u.startsWith('http')))]
  const broken = []
  await Promise.all(urls.slice(0, 10).map(async (url) => { // cap at 10 per article
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      if (res.status >= 400) broken.push(url)
    } catch { broken.push(url) }
  }))
  return broken
}

// ─── Check parsing ─────────────────────────────────────────────
// preset field is now a comma-separated list of check keys
// e.g. "outdated,wordCount,readability,labels"
const parseChecks = (preset) => {
  if (!preset) return { outdated: true, wordCount: true, readability: true, labels: true }
  const keys = preset.split(',').map(k => k.trim())
  return {
    outdated:    keys.includes('outdated'),
    wordCount:   keys.includes('wordCount'),
    readability: keys.includes('readability'),
    labels:      keys.includes('labels'),
    duplicates:  keys.includes('duplicates'),
    links:       keys.includes('links'),
  }
}

// ─── Article analysis ──────────────────────────────────────────
const analyzeArticle = (article, checks) => {
  const issues = []
  const body = article.body || ''
  const wordCount = countWords(body)
  const readabilityScore = (checks.readability && body.length > 0) ? fleschKincaid(body) : null
  const daysSince = article.updated_at
    ? (Date.now() - new Date(article.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    : 999

  if (!article.title?.trim())
    issues.push({ severity: 'critical', issue_type: 'missing_title', description: 'Article has no title.' })

  if (checks.wordCount) {
    if (wordCount < 50)
      issues.push({ severity: 'critical', issue_type: 'low_word_count', description: `Very thin content — only ${wordCount} words. Unlikely to help customers.`, metadata: { wordCount } })
    else if (wordCount < 150)
      issues.push({ severity: 'warning', issue_type: 'low_word_count', description: `Short article (${wordCount} words). Consider adding more detail.`, metadata: { wordCount } })
  }

  if (checks.outdated && daysSince > 180)
    issues.push({ severity: 'warning', issue_type: 'outdated', description: `Not updated in ${Math.round(daysSince)} days. Customers may be following stale instructions.`, metadata: { days: Math.round(daysSince) } })

  if (checks.labels && (!article.label_names || article.label_names.length === 0))
    issues.push({ severity: 'warning', issue_type: 'missing_labels', description: 'No labels or tags assigned. Harder for customers to find this article.' })

  if (checks.readability && readabilityScore !== null) {
    if (readabilityScore < 30)
      issues.push({ severity: 'critical', issue_type: 'low_readability', description: `Readability very low (${readabilityScore}/100). Most customers will struggle to follow this.`, metadata: { readabilityScore } })
    else if (readabilityScore < 50)
      issues.push({ severity: 'warning', issue_type: 'low_readability', description: `Readability below average (${readabilityScore}/100). Consider simplifying the language.`, metadata: { readabilityScore } })
  }

  if (!article.section_id)
    issues.push({ severity: 'info', issue_type: 'missing_section', description: 'Not assigned to any section — may be hard to find.' })

  return { wordCount, readabilityScore, issues, checkLinks: checks.links }
}

// ─── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify JWT
  let auth
  try {
    auth = await requireAuth(req)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  // Rate limit: 200 chunk requests per hour per user (generous for large KBs)
  try {
    await rateLimit(supabase, `scan:${auth.userId}`, 200, 3600000)
  } catch (e) {
    return res.status(429).json({ error: e.message })
  }

  const { scanJobId, connectorId, preset, page = 1 } = req.body
  const userId = auth.userId
  if (!scanJobId || !connectorId) return res.status(400).json({ error: 'Missing fields' })

  // Check plan and enforce article limit for free users
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).single()
  const isPaid = profile?.plan === 'paid'
  const FREE_LIMIT = 300

  try {
    // Get connector
    const { data: connector } = await supabase
      .from('zendesk_connectors').select('*')
      .eq('id', connectorId).eq('user_id', userId).single()
    if (!connector) return res.status(404).json({ error: 'Connector not found' })

    // Check scan is still active
    const { data: job } = await supabase.from('scan_jobs').select('status').eq('id', scanJobId).single()
    if (!job || job.status === 'failed') return res.status(200).json({ cancelled: true })

    const checks = parseChecks(preset)
    const PER_PAGE = 50
    const authHeader = `Basic ${Buffer.from(connector.api_key_encrypted).toString('base64')}`
    const now = new Date().toISOString()

    // Mark running + heartbeat on every chunk
    await supabase.from('scan_jobs').update({
      status: 'running',
      last_activity: now,
      ...(page === 1 ? { started_at: now } : {}),
    }).eq('id', scanJobId)

    // Fetch articles from Zendesk
    const zdRes = await fetch(
      `https://${connector.subdomain}.zendesk.com/api/v2/help_center/articles?per_page=${PER_PAGE}&page=${page}`,
      { headers: { Authorization: authHeader } }
    )
    if (!zdRes.ok) throw new Error(`Zendesk API error ${zdRes.status}`)

    const zdData = await zdRes.json()
    const articles = zdData.articles || []
    const totalCount = zdData.count || 0
    const hasMore = !!zdData.next_page

    // Set total on first page
    if (page === 1) {
      await supabase.from('scan_jobs').update({ total_articles: totalCount }).eq('id', scanJobId)
    }

    // Enforce free tier article limit
    const { count: alreadyScanned } = await supabase
      .from('scanned_articles').select('*', { count: 'exact', head: true })
      .eq('scan_job_id', scanJobId)

    if (!isPaid && alreadyScanned >= FREE_LIMIT) {
      // Complete the scan early with a limit notice
      const { data: counts } = await supabase.from('article_issues').select('severity').eq('scan_job_id', scanJobId)
      const critical = (counts||[]).filter(i=>i.severity==='critical').length
      const warning  = (counts||[]).filter(i=>i.severity==='warning').length
      const info     = (counts||[]).filter(i=>i.severity==='info').length
      await supabase.from('scan_jobs').update({
        status: 'completed', completed_at: new Date().toISOString(),
        critical_count: critical, warning_count: warning, info_count: info,
        issues_found: critical + warning + info,
        scanned_articles: alreadyScanned,
        error_message: 'free_limit_reached',
      }).eq('id', scanJobId)
      return res.status(200).json({ done: true, limitReached: true, scannedSoFar: alreadyScanned, totalCount })
    }

    // Get IDs already saved for this scan (resume safety — no duplicates)
    const { data: existing } = await supabase
      .from('scanned_articles')
      .select('zendesk_article_id')
      .eq('scan_job_id', scanJobId)
    const savedIds = new Set((existing || []).map(r => String(r.zendesk_article_id)))

    // Process articles
    for (const article of articles) {
      if (savedIds.has(String(article.id))) continue // already saved, skip

      let analysis
      try { analysis = analyzeArticle(article, checks) }
      catch (e) { analysis = { wordCount: 0, readabilityScore: null, issues: [] } }

      const { data: saved } = await supabase.from('scanned_articles').insert({
        scan_job_id:          scanJobId,
        user_id:              userId,
        zendesk_article_id:   article.id,
        title:                article.title || 'Untitled',
        url:                  article.html_url,
        section:              article.section_id?.toString(),
        author:               article.author_id?.toString(),
        word_count:           analysis.wordCount,
        last_updated:         article.updated_at,
        locale:               article.locale,
        label_names:          article.label_names,
        readability_score:    analysis.readabilityScore,
        has_missing_metadata: !article.title?.trim() || !article.section_id,
        broken_links_count:   0,
      }).select().single()

      // Broken links check (async — runs after article saved)
      if (checks.links && analysis.checkLinks && saved) {
        const brokenLinks = await checkBrokenLinks(article.body || '')
        for (const url of brokenLinks) {
          analysis.issues.push({
            severity: 'warning',
            issue_type: 'broken_link',
            description: `Broken link found: ${url}`,
            metadata: { url },
          })
        }
      }

      if (saved && analysis.issues.length > 0) {
        await supabase.from('article_issues').insert(
          analysis.issues.map(issue => ({
            scan_job_id: scanJobId,
            article_id:  saved.id,
            user_id:     userId,
            severity:    issue.severity,
            issue_type:  issue.issue_type,
            description: issue.description,
            metadata:    issue.metadata || {},
          }))
        )
      }
    }

    // Update progress count
    const scannedSoFar = (page - 1) * PER_PAGE + articles.length
    await supabase.from('scan_jobs').update({
      scanned_articles: scannedSoFar,
      last_activity: new Date().toISOString(),
    }).eq('id', scanJobId)

    // Final chunk — count from DB and complete
    if (!hasMore) {
      const { data: counts } = await supabase
        .from('article_issues').select('severity').eq('scan_job_id', scanJobId)
      const critical = (counts || []).filter(i => i.severity === 'critical').length
      const warning  = (counts || []).filter(i => i.severity === 'warning').length
      const info     = (counts || []).filter(i => i.severity === 'info').length

      await supabase.from('scan_jobs').update({
        status:         'completed',
        completed_at:   new Date().toISOString(),
        critical_count: critical,
        warning_count:  warning,
        info_count:     info,
        issues_found:   critical + warning + info,
        scanned_articles: totalCount,
      }).eq('id', scanJobId)

      await sendEmail(supabase, scanJobId, userId)
      return res.status(200).json({ done: true, scannedSoFar: totalCount, totalCount })
    }

    return res.status(200).json({ done: false, hasMore: true, nextPage: page + 1, scannedSoFar, totalCount })

  } catch (err) {
    console.error('scan-chunk error:', err.message)
    await supabase.from('scan_jobs').update({
      status: 'failed',
      error_message: err.message,
      completed_at: new Date().toISOString(),
    }).eq('id', scanJobId).catch(() => {})
    return res.status(500).json({ error: err.message })
  }
}

// ─── Completion email ──────────────────────────────────────────
async function sendEmail(supabase, scanJobId, userId) {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  try {
    const [{ data: profile }, { data: job }] = await Promise.all([
      supabase.from('profiles').select('email, full_name, email_notifications').eq('id', userId).single(),
      supabase.from('scan_jobs').select('*').eq('id', scanJobId).single(),
    ])
    if (!profile?.email || !job) return
    if (profile.email_notifications === false) return // user opted out
    const url = `${process.env.APP_URL || 'https://articleiq.vercel.app'}/scanner/results/${scanJobId}`
    const name = profile.full_name?.split(' ')[0]
    const critical = job.critical_count || 0
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ArticleIQ <onboarding@resend.dev>',
        to: [profile.email],
        subject: `Scan complete — ${critical > 0 ? `${critical} critical issue${critical !== 1 ? 's' : ''}` : 'No critical issues'} · ${job.scanned_articles} articles`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
          <div style="background:#107C10;padding:20px 28px;border-radius:8px 8px 0 0">
            <span style="color:white;font-weight:800;font-size:16px">ArticleIQ</span>
          </div>
          <div style="background:white;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
            <h2 style="margin:0 0 8px;color:#0f1f0f">Scan complete${name ? `, ${name}` : ''}</h2>
            <p style="color:#4a5e4a;margin:0 0 20px">${job.scanned_articles} articles · ${job.warning_count || 0} warnings · ${critical} critical</p>
            <a href="${url}" style="display:inline-block;padding:11px 22px;background:#107C10;color:white;border-radius:8px;text-decoration:none;font-weight:700">View report →</a>
          </div>
        </div>`,
      }),
    })
  } catch (e) { console.error('Email error:', e.message) }
}
