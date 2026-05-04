import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, getProfile } from '@/lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId) => {
    try {
      const p = await getProfile(userId)
      setProfile(p)
    } catch {
      setProfile(null)
    }
  }

  useEffect(() => {
    // Safety timeout — never show loading screen forever
    const timeout = setTimeout(() => setLoading(false), 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id).finally(() => {
          clearTimeout(timeout)
          setLoading(false)
        })
      } else {
        clearTimeout(timeout)
        setLoading(false)
      }
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
        // Session expired or signed out — redirect to login
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
          window.location.href = '/login'
        }
      }
    })

    // Check session every 2 minutes — catch expiry proactively
    const sessionCheck = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setUser(null)
        setProfile(null)
        window.location.href = '/login'
      }
    }, 2 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
      clearInterval(sessionCheck)
    }
  }, [])

  const refreshProfile = () => user && loadProfile(user.id)

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
