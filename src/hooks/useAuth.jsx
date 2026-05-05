import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

const fetchProfile = async (userId) => {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data ?? null
}

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(undefined) // undefined = not yet known
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        if (mounted) { setProfile(p); setLoading(false) }
      } else {
        setUser(null)
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        if (mounted) setProfile(p)
      } else {
        setUser(null)
        setProfile(null)
        if (event === 'SIGNED_OUT') {
          window.location.replace('/login')
        }
      }
      setLoading(false)
    })

    init()
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const userId = profile?.id ?? user?.id ?? null
  const refreshProfile = async () => {
    if (!userId) return
    const p = await fetchProfile(userId)
    setProfile(p)
  }

  return (
    <AuthContext.Provider value={{ user, profile, userId, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
