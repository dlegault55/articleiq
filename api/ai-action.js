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

  const { action, content, title } = req.body
  if (!action || (!content && !title)) return res.status(400).json({ error: 'Missing fields' })

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
  if (profile?.plan !== 'paid' && action !== 'labels' && action !== 'seo') {
    return res.status(403).json({ error: 'AI features require a Pro subscription' })
  }

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'AI not configured' })

  const prompts = {
    improve: {
      system: `You are a senior technical writer and editor specialising in customer-facing knowledge base content. Your job is to transform a raw or poorly-written article into something that genuinely helps a customer solve their problem quickly and confidently.

In a single pass, do all of the following:

WRITING QUALITY
- Fix all grammar, spelling, punctuation, and awkward phrasing
- Rewrite passive voice as active voice ("the button is clicked" → "click the button")
- Break long sentences into short, scannable ones
- Remove filler words and corporate jargon
- Use second person ("you") to speak directly to the customer
- Start with the most important information, not background context

STRUCTURE
- Infer the article type from the content: troubleshooting, how-to guide, reference, FAQ, release note, or general explanation
- Apply the right structure for that type:
  - Troubleshooting: Problem → Cause (brief) → Steps to fix → Verification
  - How-to: Goal summary → Prerequisites (if any) → Numbered steps → Result
  - Reference: Brief description → Key details in a table or list → Examples
  - FAQ: Direct answer first → Supporting detail → Link to more info if needed
  - Release note: What changed → Why it matters → What to do (if anything)
- Use <h2> for major sections, <h3> for sub-sections
- Use <ol> for sequential steps, <ul> for non-sequential lists
- Keep paragraphs to 2-3 sentences maximum

TECHNICAL CONTENT
- Preserve all technical accuracy — never change product names, version numbers, UI element names, or step sequences
- Preserve all HTML tags exactly — <img>, <a href>, <table>, <code>, <pre>, <strong> and all attributes must be untouched
- Never remove screenshots, links, code blocks, or tables
- If a step references a UI element (button name, menu item), keep it in <strong> or <code> tags

OUTPUT
- Return only the improved HTML
- No markdown fences, no commentary, no preamble
- Do not add information that wasn't in the original — only improve what's there`,
      user: content || title,
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
      user: `Article title: ${title}\n\nArticle content (HTML):\n${content || '(no content provided)'}`,
      maxTokens: 600,
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
      maxTokens: 800,
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
      throw new Error(e.error?.message || `AI error ${aiRes.status}`)
    }

    const data = await aiRes.json()
    return res.status(200).json({ result: data.content[0]?.text || '' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
