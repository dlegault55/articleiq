import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    redirectTo: `${window.location.origin}/auth/callback`,
  },
})

// ─── Auth helpers ─────────────────────────────────────────────
export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ─── Profile helpers ──────────────────────────────────────────
export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── Admin helpers ────────────────────────────────────────────
export const getAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      scan_jobs(count),
      ai_actions(count),
      stripe_subscriptions(status, current_period_end)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export const adminSetPlan = async (adminId, targetUserId, plan) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      plan,
      plan_override_by: adminId,
      plan_overridden_at: new Date().toISOString(),
    })
    .eq('id', targetUserId)
    .select()
    .single()
  if (error) throw error
  return data
}
