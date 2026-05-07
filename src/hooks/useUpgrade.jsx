import { useAuth } from './useAuth'
import { useToast } from './useToast'

export const useUpgrade = () => {
  const { userId, user } = useAuth()
  const toast = useToast()

  return async () => {
    if (!userId || !user?.email) { toast.error('Please sign in first'); return }
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email: user.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e) {
      toast.error(`Couldn't start checkout: ${e.message}`)
    }
  }
}
