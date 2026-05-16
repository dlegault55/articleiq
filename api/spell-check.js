import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let auth
  try { auth = await requireAuth(req) } catch (e) { return res.status(401).json({ error: e.message }) }

  const { text, language = 'en-US', ignored = [] } = req.body
  if (!text) return res.status(400).json({ error: 'No text provided' })

  try {
    // Strip HTML tags before sending to LanguageTool
    const plainText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (plainText.length < 10) return res.status(200).json({ issues: [] })

    const params = new URLSearchParams({
      text: plainText,
      language,
      enabledOnly: 'false',
      level: 'default',
    })

    // Disable rules that create false positives in KB articles
    params.append('disabledRules', [
      'WHITESPACE_RULE',
      'EN_QUOTES',
      'DASH_RULE',
      'WORD_CONTAINS_UNDERSCORE',
      'UPPERCASE_SENTENCE_START',
    ].join(','))

    const ltRes = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!ltRes.ok) throw new Error(`LanguageTool API error ${ltRes.status}`)
    const data = await ltRes.json()

    // Filter to spelling issues only, exclude ignored words
    const ignoredLower = ignored.map(w => w.toLowerCase())
    const issues = (data.matches || [])
      .filter(m => m.rule?.issueType === 'misspelling' || m.rule?.category?.id === 'TYPOS')
      .filter(m => {
        const word = plainText.slice(m.offset, m.offset + m.length).toLowerCase()
        return !ignoredLower.includes(word)
      })
      .slice(0, 20) // cap at 20 per article
      .map(m => ({
        word:        plainText.slice(m.offset, m.offset + m.length),
        message:     m.message,
        suggestions: m.replacements.slice(0, 3).map(r => r.value),
        context:     m.context?.text || '',
        offset:      m.offset,
        length:      m.length,
      }))

    return res.status(200).json({ issues })
  } catch (e) {
    console.error('spell-check error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
