// supabase/functions/scheduled-sync/index.ts
// Deploy with: supabase functions deploy scheduled-sync
//
// This function is called by pg_cron every hour.
// It finds all connectors due for sync and kicks off scan jobs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')

Deno.serve(async (req) => {
  // Verify this is called by our cron (basic auth check)
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader?.includes(serviceKey!)) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    // Fetch all connectors due for sync
    const { data: due, error } = await supabase
      .from('connectors_due_for_sync')
      .select('*')

    if (error) throw error
    if (!due?.length) {
      return new Response(JSON.stringify({ message: 'No connectors due', count: 0 }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const results = []

    for (const connector of due) {
      try {
        // Create a scan job
        const { data: job, error: jobErr } = await supabase
          .from('scan_jobs')
          .insert({
            user_id: connector.user_id,
            connector_id: connector.id,
            status: 'pending',
          })
          .select()
          .single()

        if (jobErr) throw jobErr

        // Fetch articles from Zendesk
        const articles = await fetchZendeskArticles(connector.subdomain, connector.api_key_encrypted)

        // Update job to running
        await supabase.from('scan_jobs').update({
          status: 'running',
          started_at: new Date().toISOString(),
          total_articles: articles.length,
        }).eq('id', job.id)

        // Analyze each article
        let critical = 0, warning = 0, info = 0, totalIssues = 0

        for (const article of articles) {
          const analysis = analyzeArticle(article)

          const { data: saved } = await supabase.from('scanned_articles').insert({
            scan_job_id: job.id,
            user_id: connector.user_id,
            zendesk_article_id: article.id,
            title: article.title,
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

          if (saved && analysis.issues.length > 0) {
            await supabase.from('article_issues').insert(
              analysis.issues.map(i => ({
                scan_job_id: job.id,
                article_id: saved.id,
                user_id: connector.user_id,
                severity: i.severity,
                issue_type: i.issue_type,
                description: i.description,
                metadata: i.metadata || {},
              }))
            )
          }

          analysis.issues.forEach(i => {
            totalIssues++
            if (i.severity === 'critical') critical++
            else if (i.severity === 'warning') warning++
            else info++
          })
        }

        // Mark job complete
        await supabase.from('scan_jobs').update({
          status: 'completed',
          scanned_articles: articles.length,
          issues_found: totalIssues,
          critical_count: critical,
          warning_count: warning,
          info_count: info,
          completed_at: new Date().toISOString(),
        }).eq('id', job.id)

        // Update connector sync timestamps
        const nextSync = calculateNextSync(connector.sync_frequency)
        await supabase.from('zendesk_connectors').update({
          last_synced_at: new Date().toISOString(),
          next_sync_at: nextSync,
        }).eq('id', connector.id)

        results.push({ connector: connector.subdomain, status: 'success', articles: articles.length, issues: totalIssues })
      } catch (err) {
        console.error(`Failed sync for connector ${connector.id}:`, err)
        results.push({ connector: connector.subdomain, status: 'error', error: err.message })
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    })
  }
})

// ─── Helpers (duplicated from frontend for edge function isolation) ────────────

function calculateNextSync(frequency: string): string {
  const now = new Date()
  if (frequency === 'daily')   now.setDate(now.getDate() + 1)
  if (frequency === 'weekly')  now.setDate(now.getDate() + 7)
  if (frequency === 'monthly') now.setDate(now.getDate() + 30)
  return now.toISOString()
}

async function fetchZendeskArticles(subdomain: string, apiKey: string) {
  const headers = { Authorization: `Basic ${btoa(apiKey)}`, 'Content-Type': 'application/json' }
  let page = 1, all: any[] = [], hasMore = true

  while (hasMore) {
    const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/help_center/articles?per_page=100&page=${page}`, { headers })
    if (!res.ok) throw new Error(`Zendesk API ${res.status}`)
    const data = await res.json()
    all = [...all, ...data.articles]
    hasMore = !!data.next_page
    page++
  }
  return all
}

function countWords(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
}

function fleschKincaid(text: string) {
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const sentences = clean.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = clean.split(/\s+/).filter(w => w.length > 0)
  if (!sentences.length || !words.length) return 50
  const asl = words.length / sentences.length
  const asw = words.reduce((acc, w) => acc + Math.max(1, (w.match(/[aeiouy]+/g) || []).length), 0) / words.length
  return Math.max(0, Math.min(100, Math.round(206.835 - 1.015 * asl - 84.6 * asw)))
}

function analyzeArticle(article: any) {
  const body = article.body || ''
  const wordCount = countWords(body)
  const readabilityScore = fleschKincaid(body)
  const issues: any[] = []
  const daysSinceUpdate = article.updated_at
    ? (Date.now() - new Date(article.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    : 999

  if (!article.title?.trim()) issues.push({ severity: 'critical', issue_type: 'missing_title', description: 'Article has no title.' })
  if (wordCount < 50)  issues.push({ severity: 'critical', issue_type: 'low_word_count', description: `Article is very short (${wordCount} words).`, metadata: { wordCount } })
  else if (wordCount < 150) issues.push({ severity: 'warning', issue_type: 'low_word_count', description: `Article is short (${wordCount} words).`, metadata: { wordCount } })
  if (daysSinceUpdate > 180) issues.push({ severity: 'warning', issue_type: 'outdated', description: `Not updated in ${Math.round(daysSinceUpdate)} days.`, metadata: { days: Math.round(daysSinceUpdate) } })
  if (!article.label_names?.length) issues.push({ severity: 'warning', issue_type: 'missing_labels', description: 'No labels or tags assigned.' })
  if (readabilityScore < 30) issues.push({ severity: 'critical', issue_type: 'low_readability', description: `Readability score very low (${readabilityScore}/100).`, metadata: { readabilityScore } })
  else if (readabilityScore < 50) issues.push({ severity: 'warning', issue_type: 'low_readability', description: `Readability below average (${readabilityScore}/100).`, metadata: { readabilityScore } })

  return { wordCount, readabilityScore, issues, hasMissingMeta: !article.title?.trim() || !article.section_id }
}
