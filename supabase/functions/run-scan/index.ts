// supabase/functions/run-scan/index.ts
// Full server-side scanner — runs completely independently of the browser
// Supabase Edge Functions have a 400s timeout (vs Vercel hobby 10s)
//
// Deploy:
//   supabase functions deploy run-scan
//   supabase secrets set RESEND_API_KEY=re_...
//   supabase secrets set APP_URL=https://articleiq.vercel.app
//
// Or deploy via Supabase Dashboard → Edge Functions → New Function

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Analysis helpers ─────────────────────────────────────────
const countSyllables = (word: string): number => {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 1
  const vowelGroups = word.match(/[aeiouy]+/g)
  let count = vowelGroups ? vowelGroups.length : 1
  if (word.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

const fleschKincaid = (text: string): number => {
  const clean = (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = clean.split(/\s+/).filter(w => w.length > 0)
  if (!sentences.length || !words.length) return 50
  const syllableCount = words.reduce((acc, w) => acc + countSyllables(w), 0)
  const asl = words.length / sentences.length
  const asw = syllableCount / words.length
  return Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * asl - 84.6 * asw)))
}

const countWords = (html: string): number => {
  const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text ? text.split(' ').filter(Boolean).length : 0
}

const normalizeTitle = (t: string) =>
  (t || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()

const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

const titleSimilarity = (a: string, b: string): number => {
  const na = normalizeTitle(a), nb = normalizeTitle(b)
  if (!na || !nb) return 0
  const maxLen = Math.max(na.length, nb.length)
  return maxLen === 0 ? 1 : 1 - levenshtein(na, nb) / maxLen
}

const PRESETS: Record<string, Record<string, boolean>> = {
  fast:     { outdated: true, wordCount: true, readability: false, missingMeta: false, duplicates: false },
  standard: { outdated: true, wordCount: true, readability: true,  missingMeta: true,  duplicates: true  },
  full:     { outdated: true, wordCount: true, readability: true,  missingMeta: true,  duplicates: true  },
}

const analyzeArticle = (article: any, preset: string, dupMap: Map<string, any>, idx: number) => {
  const checks = PRESETS[preset] || PRESETS.standard
  const issues: any[] = []
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
      issues.push({ severity: 'critical', issue_type: 'low_word_count', description: `Very short (${wordCount} words).`, metadata: { wordCount } })
    else if (wordCount < 150)
      issues.push({ severity: 'warning', issue_type: 'low_word_count', description: `Short article (${wordCount} words).`, metadata: { wordCount } })
  }
  if (checks.outdated && daysSince > 180)
    issues.push({ severity: 'warning', issue_type: 'outdated', description: `Not updated in ${Math.round(daysSince)} days.`, metadata: { days: Math.round(daysSince) } })
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
  if (checks.duplicates && dupMap.has(String(idx))) {
    const dup = dupMap.get(String(idx))
    issues.push({ severity: 'warning', issue_type: 'duplicate_content', description: `${Math.round(dup.titleSim * 100)}% title similarity with "${dup.matchTitle}".`, metadata: dup })
  }
  return { wordCount, readabilityScore, issues, hasMissingMeta: !article.title?.trim() || !article.section_id }
}

const findDuplicates = (articles: any[]): Map<string, any> => {
  const map = new Map()
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const a = articles[i], b = articles[j]
      if (!a.title || !b.title) continue
      const titleSim = titleSimilarity(a.title, b.title)
      const wA = a.wordCount || 0, wB = b.wordCount || 0
      const maxW = Math.max(wA, wB)
      const wordCountSim = maxW > 0 ? 1 - Math.abs(wA - wB) / maxW : 1
      if ((titleSim > 0.85 || (titleSim > 0.70 && wordCountSim > 0.80)) && !map.has(String(i)) && !map.has(String(j))) {
        map.set(String(i), { matchTitle: b.title, titleSim, wordCountSim })
        map.set(String(j), { matchTitle: a.title, titleSim, wordCountSim })
      }
    }
  }
  return map
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { scanJobId, userId, connectorId, preset = 'standard' } = await req.json()
    if (!scanJobId || !userId || !connectorId) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get connector
    const { data: connector } = await supabase
      .from('zendesk_connectors').select('*').eq('id', connectorId).eq('user_id', userId).single()
    if (!connector) return new Response(JSON.stringify({ error: 'Connector not found' }), { status: 404, headers: corsHeaders })

    // Mark running immediately
    await supabase.from('scan_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', scanJobId)

    // Respond immediately — scan runs in the background via EdgeRuntime
    const responsePromise = new Response(JSON.stringify({ success: true, message: 'Scan started' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    // Run scan async
    const runScan = async () => {
      const authHeader = `Basic ${btoa(connector.api_key_encrypted)}`
      const baseUrl = `https://${connector.subdomain}.zendesk.com/api/v2/help_center`

      // Fetch all articles
      let allArticles: any[] = []
      let page = 1
      let hasMore = true

      while (hasMore) {
        const res = await fetch(`${baseUrl}/articles?per_page=100&page=${page}`, {
          headers: { Authorization: authHeader }
        })
        if (!res.ok) throw new Error(`Zendesk API error ${res.status}`)
        const data = await res.json()
        allArticles = [...allArticles, ...(data.articles || [])]
        hasMore = !!data.next_page
        page++

        // Update total after first page
        if (page === 2) {
          await supabase.from('scan_jobs').update({ total_articles: data.count || allArticles.length }).eq('id', scanJobId)
        }
      }

      await supabase.from('scan_jobs').update({ total_articles: allArticles.length }).eq('id', scanJobId)

      // Pre-compute word counts for duplicate detection
      const withCounts = allArticles.map(a => ({ ...a, wordCount: countWords(a.body || '') }))
      const checks = PRESETS[preset] || PRESETS.standard
      const dupMap = checks.duplicates ? findDuplicates(withCounts) : new Map()

      // Process articles
      for (let i = 0; i < allArticles.length; i++) {
        // Check if cancelled
        const { data: job } = await supabase.from('scan_jobs').select('status').eq('id', scanJobId).single()
        if (job?.status === 'failed') return // cancelled by user

        const article = allArticles[i]
        let analysis
        try { analysis = analyzeArticle(article, preset, dupMap, i) }
        catch (e) { analysis = { wordCount: 0, readabilityScore: null, issues: [], hasMissingMeta: false } }

        const { data: savedArticle } = await supabase.from('scanned_articles').insert({
          scan_job_id: scanJobId, user_id: userId,
          zendesk_article_id: article.id,
          title: article.title || 'Untitled',
          url: article.html_url,
          section: article.section_id?.toString(),
          author: article.author_id?.toString(),
          word_count: analysis.wordCount,
          last_updated: article.updated_at,
          locale: article.locale,
          label_names: article.label_names,
          readability_score: analysis.readabilityScore,
          has_missing_metadata: analysis.hasMissingMeta,
          broken_links_count: 0,
        }).select().single()

        if (savedArticle && analysis.issues.length > 0) {
          await supabase.from('article_issues').insert(
            analysis.issues.map((issue: any) => ({
              scan_job_id: scanJobId, article_id: savedArticle.id, user_id: userId,
              severity: issue.severity, issue_type: issue.issue_type,
              description: issue.description, metadata: issue.metadata || {},
            }))
          )
        }

        // Update progress every 10 articles
        if (i % 10 === 0 || i === allArticles.length - 1) {
          await supabase.from('scan_jobs').update({ scanned_articles: i + 1 }).eq('id', scanJobId)
        }
      }

      // Count from article_issues — source of truth
      const { data: issueCounts } = await supabase.from('article_issues').select('severity').eq('scan_job_id', scanJobId)
      const critical = (issueCounts || []).filter((i: any) => i.severity === 'critical').length
      const warning  = (issueCounts || []).filter((i: any) => i.severity === 'warning').length
      const info     = (issueCounts || []).filter((i: any) => i.severity === 'info').length

      await supabase.from('scan_jobs').update({
        status: 'completed', completed_at: new Date().toISOString(),
        scanned_articles: allArticles.length,
        critical_count: critical, warning_count: warning,
        info_count: info, issues_found: critical + warning + info,
      }).eq('id', scanJobId)

      // Send completion email
      const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
      if (RESEND_KEY) {
        const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).single()
        if (profile?.email) {
          const reportUrl = `${Deno.env.get('APP_URL') || 'https://articleiq.vercel.app'}/scanner/results/${scanJobId}`
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'ArticleIQ <onboarding@resend.dev>',
              to: [profile.email],
              subject: `Scan complete — ${critical > 0 ? `${critical} critical issue${critical !== 1 ? 's' : ''} found` : 'No critical issues'} · ${allArticles.length} articles`,
              html: `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto"><div style="background:#107C10;padding:20px 28px;border-radius:8px 8px 0 0"><span style="color:#fff;font-weight:700;letter-spacing:3px">ARTICLEIQ</span></div><div style="background:#fff;padding:28px;border:1px solid #E2E2DE;border-top:none;border-radius:0 0 8px 8px"><h2 style="margin:0 0 8px;color:#1A1A18">Scan complete${profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h2><p style="color:#5C5C58;margin:0 0 20px">${allArticles.length} articles · ${warning} warnings · ${critical} critical</p><a href="${reportUrl}" style="display:inline-block;padding:11px 22px;background:#107C10;color:#fff;border-radius:7px;text-decoration:none;font-weight:600">View report →</a></div></div>`,
            }),
          })
        }
      }
    }

    // Use EdgeRuntime.waitUntil if available, otherwise run inline
    try {
      // @ts-ignore
      EdgeRuntime.waitUntil(runScan())
    } catch {
      runScan().catch(async (err) => {
        console.error('Scan failed:', err)
        await supabase.from('scan_jobs').update({
          status: 'failed', error_message: err.message, completed_at: new Date().toISOString(),
        }).eq('id', scanJobId)
      })
    }

    return responsePromise

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
