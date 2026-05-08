import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let mounted = true

    const loadProfile = async (uid) => {
      const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (mounted) setProfile(data ?? null)
    }

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
      } else {
        setUser(null)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        if (event === 'SIGNED_OUT') window.location.replace('/login')
      }
    })

    init()
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  const userId = profile?.id ?? user?.id ?? null
  const loading = user === undefined

  return (
    <AuthContext.Provider value={{ user, profile, userId, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
