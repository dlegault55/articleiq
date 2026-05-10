import { createClient } from '@supabase/supabase-js'
import { requireAuth, rateLimit } from './_auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Verify JWT
  let auth
  try {
    auth = await requireAuth(req)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  const { action, content, title, readabilityScore, analysisContext } = req.body
  if (!action) return res.status(400).json({ error: 'Missing action' })

  // Rate limit: 30 AI calls per minute per user (skip for free label suggestions)
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (action !== 'labels') {
    try {
      await rateLimit(supabase, `ai:${auth.userId}`, 30, 60000)
    } catch (e) {
      return res.status(429).json({ error: e.message })
    }
  }

  // Verify user is Pro for most AI actions (label suggestions are free)
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', auth.userId).single()
  if (!['paid','pack','annual'].includes(profile?.plan) && action !== 'labels' && action !== 'seo') {
    return res.status(403).json({ error: 'AI features require a Pro subscription' })
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'AI not configured' })

  const prompts = {
    improve: {
      system: `You are a senior technical writer rewriting a knowledge base article. You have been given specific analysis findings — treat these as a precise brief, not suggestions. Every finding must be addressed in the rewrite.

MANDATORY — address every finding listed in the ANALYSIS BRIEF:
- If clarity is weak: rewrite opening to lead with the answer, use shorter sentences, active voice
- If structure is weak: add H2 section headings, break walls of text, use numbered steps for sequences
- If completeness is weak: ensure the article fully answers the question (do not add false information — only restructure what's there)
- If actionability is weak: ensure every step is concrete and specific, remove vague phrases like "you may want to" or "consider"
- If SEO title is suggested: use it exactly as the article title
- If SEO issues are listed: fix heading structure, ensure first paragraph answers the question directly, use the customer's likely search terms naturally

ARTICLE TYPE — detect and apply the correct structure:
- Troubleshooting: Problem statement (1 sentence) → Why this happens (brief) → Steps to fix (numbered) → How to verify it worked → If it still fails
- How-to: What you'll achieve (1 sentence) → What you need first → Steps (numbered) → Result
- FAQ: Direct answer first (no preamble) → Supporting context → Related links if present
- Release note: What changed → Why it matters → What action (if any) is needed
- Reference: Brief description → Key information in table or list → Examples

HTML RULES — non-negotiable:
- Preserve every <img>, <a href>, <table>, <code>, <pre>, <video> tag and all attributes exactly
- Use <h2> for major sections, <h3> for sub-sections
- Use <ol> for steps, <ul> for non-sequential lists
- Never remove screenshots, links, code blocks, or tables
- Return only the improved HTML — no markdown, no commentary, no preamble`,
      user: `${analysisContext ? `=== ANALYSIS BRIEF — ADDRESS EVERY POINT ===\n${analysisContext}\n=== END BRIEF ===\n\n` : ''}Article title: ${title || '(no title)'}\n\nArticle content to rewrite:\n${content || '(no content)'}`,
      maxTokens: 4096,
    },
    quality: {
      system: `You are a senior technical writer evaluating knowledge base articles for a SaaS company. Score this article across five dimensions and return JSON only, no markdown.

Scoring dimensions (each 0-20):
1. CLARITY — Is it easy to understand? Are sentences short and direct? Is jargon avoided?
2. COMPLETENESS — Does it fully answer the question a customer would have? Are steps complete?
3. STRUCTURE — Is it well organised? Does it use headings, lists, and logical flow?
4. ACCURACY SIGNALS — Do product names, UI elements, and steps appear correct and consistent?
5. ACTIONABILITY — Can the customer immediately act on this? Does it tell them exactly what to do?

Return this exact JSON structure:
{
  "score": 0-100,
  "verdict": "one honest sentence about the article's biggest strength or weakness",
  "dimensions": {"clarity": 0-20, "completeness": 0-20, "structure": 0-20, "accuracy": 0-20, "actionability": 0-20},
  "suggestions": ["specific actionable suggestion 1", "specific actionable suggestion 2", "specific actionable suggestion 3"]
}

Suggestions must be specific — not "improve clarity" but "the third step is ambiguous — specify which button to click and where it appears in the UI".`,
      user: `Article title: ${title}${readabilityScore != null ? `\nFlesch-Kincaid readability score: ${readabilityScore}/100 (note: scores below 50 suggest difficult reading level)` : ''}\n\nArticle content (HTML):\n${content || '(no content provided)'}`,
      maxTokens: 1200,
    },
    labels: {
      system: `You are a knowledge base manager. Suggest 3-5 short, specific labels or tags for a Zendesk® Help Center article based on its title. Labels should be lowercase, concise (1-3 words), and help customers find the article. Return JSON only: {"labels": ["label1","label2","label3"]}`,
      user: `Article title: ${title}`,
      maxTokens: 256,
    },
    seo: {
      system: `You are an SEO expert specialising in knowledge base and help centre content. Analyse this article for search engine optimisation. Score it 0-100 based on: title length and keyword clarity (ideal 50-60 chars), heading structure (H2/H3 usage), content depth (300+ words for SEO), first paragraph clarity, internal linking signals, and whether the title matches what customers would actually search for. Return JSON only, no markdown: {"score": 0-100, "grade": "A/B/C/D/F", "verdict": "one sentence summary", "issues": [{"issue": "short description", "fix": "specific actionable fix", "impact": "high/medium/low"}], "title_suggestion": "improved SEO title or null if fine"}`,
      user: `Article title: ${title}

Article content (HTML):
${content || title}`,
      maxTokens: 1000,
    },
  }

  const prompt = prompts[action]
  if (!prompt) return res.status(400).json({ error: 'Unknown action' })

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: prompt.maxTokens,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
      }),
    })

    if (!aiRes.ok) {
      const e = await aiRes.json().catch(() => ({}))
      console.error('Anthropic API error:', aiRes.status, JSON.stringify(e))
      throw new Error(e.error?.message || `AI error ${aiRes.status}`)
    }

    const data = await aiRes.json()
    let result = data.content[0]?.text || ''

    // Strip markdown code fences that Claude sometimes adds despite instructions
    result = result.replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()

    return res.status(200).json({ result })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
