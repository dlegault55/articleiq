import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(undefined)
  const [profile, setProfile] = useState(null)

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    let mounted = true

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

    // Refresh profile when tab regains focus — picks up plan changes from webhooks
    const onFocus = () => { if (user?.id) loadProfile(user.id) }
    window.addEventListener('focus', onFocus)

    init()
    return () => { mounted = false; subscription.unsubscribe(); window.removeEventListener('focus', onFocus) }
  }, [])

  const userId = profile?.id ?? user?.id ?? null
  const loading = user === undefined
  const refreshProfile = useCallback(() => { if (user?.id) loadProfile(user.id) }, [user?.id, loadProfile])

  return (
    <AuthContext.Provider value={{ user, profile, userId, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
