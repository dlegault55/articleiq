// ─── ArticleIQ — Claude API integration ───────────────────────
// All AI features are paid-tier only. Check plan before calling.

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

const callClaude = async (systemPrompt, userContent, maxTokens = 1024) => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Claude API error ${res.status}`)
  }

  const data = await res.json()
  return data.content[0]?.text || ''
}

// ─── Grammar Fix ──────────────────────────────────────────────
export const grammarFix = async (articleTitle, articleContent) => {
  const system = `You are a professional technical writer. Fix grammar, spelling, and clarity issues in knowledge base articles. Return ONLY the corrected article content — no explanations, no preamble. Preserve all formatting (HTML tags, markdown).`
  const user = `Article Title: ${articleTitle}\n\nContent:\n${articleContent}`
  return callClaude(system, user, 2048)
}

// ─── Full Rewrite ─────────────────────────────────────────────
export const fullRewrite = async (articleTitle, articleContent, style = 'professional') => {
  const system = `You are an expert technical writer specializing in customer support knowledge bases. Rewrite the article to be clearer, more concise, and better structured. Style: ${style}. Return ONLY the rewritten content — no explanations. Use the same language as the original.`
  const user = `Article Title: ${articleTitle}\n\nOriginal Content:\n${articleContent}`
  return callClaude(system, user, 2048)
}

// ─── Quality Score ────────────────────────────────────────────
export const getQualityScore = async (articleTitle, articleContent) => {
  const system = `You are a content quality analyst. Evaluate the knowledge base article and return a JSON object ONLY (no markdown, no explanation) with this exact shape:
{
  "overall": <0-100 integer>,
  "clarity": <0-100 integer>,
  "completeness": <0-100 integer>,
  "structure": <0-100 integer>,
  "tone": <0-100 integer>,
  "summary": "<2-3 sentence assessment>",
  "top_issues": ["<issue 1>", "<issue 2>", "<issue 3>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}`
  const user = `Article Title: ${articleTitle}\n\nContent:\n${articleContent}`
  const raw = await callClaude(system, user, 512)
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    throw new Error('Failed to parse quality score response')
  }
}
