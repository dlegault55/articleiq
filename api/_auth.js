import { createClient } from '@supabase/supabase-js'

// Verify Supabase JWT and return authenticated userId
// Returns { userId } on success, throws on failure
export async function requireAuth(req) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing authorization token'), { status: 401 })
  }

  const token = authHeader.slice(7)

  // Verify token with Supabase — this is the authoritative check
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY // anon key for user verification
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw Object.assign(new Error('Invalid or expired token'), { status: 401 })
  }

  return { userId: user.id, email: user.email }
}

// Rate limiting using Supabase as a simple store
// Allows maxRequests per windowMs per userId+endpoint
export async function rateLimit(supabase, key, maxRequests = 20, windowMs = 60000) {
  const windowStart = new Date(Date.now() - windowMs).toISOString()
  const { count } = await supabase
    .from('rate_limit_log')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('created_at', windowStart)

  if (count >= maxRequests) {
    throw Object.assign(new Error('Rate limit exceeded — please wait before trying again'), { status: 429 })
  }

  // Log this request
  await supabase.from('rate_limit_log').insert({ key, created_at: new Date().toISOString() })
}

// Sanitize HTML — strip dangerous tags before publishing to Zendesk
export function sanitizeHtml(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-removed=') // remove event handlers
    .replace(/javascript\s*:/gi, 'blocked:')    // remove javascript: hrefs
}
