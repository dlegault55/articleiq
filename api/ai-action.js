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

  // Rate limit: 30 AI calls per minute per user
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  try {
    await rateLimit(supabase, `ai:${auth.userId}`, 30, 60000)
  } catch (e) {
    return res.status(429).json({ error: e.message })
  }

  // Verify user is Pro for most AI actions (labels suggestions are free)
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', auth.userId).single()
  const { action } = req.body
  if (profile?.plan !== 'paid' && action !== 'labels') {
    return res.status(403).json({ error: 'AI features require a Pro subscription' })
  }

  const { action, content, title } = req.body
  if (!action || (!content && !title)) return res.status(400).json({ error: 'Missing fields' })

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'AI not configured' })

  const prompts = {
    improve: {
      system: `You are a professional editor and technical writer working with HTML knowledge base articles. In a single pass: fix all grammar, spelling, and punctuation errors AND rewrite the content to be clearer, more concise, and easier to follow. Use simple language, active voice, and short sentences. You MUST preserve every HTML tag exactly as-is — especially <img>, <a href>, <table>, <code>, <pre> tags and all their attributes. Never remove, add, or modify any HTML tags or attributes. Use <h2> tags for section headings. Structure as: one summary sentence, then <h2>Problem</h2>, <h2>Why This Happens</h2>, <h2>Solution</h2>. Return only the improved HTML with no commentary or markdown fences.`,
      user: content || title,
      maxTokens: 4096,
    },
    quality: {
      system: `Evaluate this knowledge base article title. Return JSON only: {"score": 0-100, "verdict": "one sentence", "suggestions": ["s1","s2","s3"]}`,
      user: `Article title: ${title}`,
      maxTokens: 512,
    },
    labels: {
      system: `You are a knowledge base manager. Suggest 3-5 short, specific labels or tags for a Zendesk® Help Center article based on its title. Labels should be lowercase, concise (1-3 words), and help customers find the article. Return JSON only: {"labels": ["label1","label2","label3"]}`,
      user: `Article title: ${title}`,
      maxTokens: 256,
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
