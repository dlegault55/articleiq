import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import LoadingScreen from '@/components/ui/LoadingScreen'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard', { replace: true })
      else navigate('/login', { replace: true })
    })
  }, [navigate])

  return <LoadingScreen message="Completing sign in..." />
}
