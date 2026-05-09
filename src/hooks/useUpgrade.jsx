import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useToast } from './useToast'
import { apiFetch } from '@/lib/api'

export const useUpgrade = () => {
  const { userId, user } = useAuth()
  const toast    = useToast()
  const navigate = useNavigate()

  // Navigate to upgrade page (for generic upgrade prompts)
  const goToUpgrade = () => navigate('/upgrade')

  // Direct checkout (for when plan is already chosen)
  const checkout = async (plan = 'monthly') => {
    if (!userId || !user?.email) { toast.error('Please sign in first'); return }
    try {
      const res = await apiFetch('/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e) {
      toast.error(`Couldn't start checkout: ${e.message}`)
    }
  }

  return Object.assign(goToUpgrade, { checkout })
}
