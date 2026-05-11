import { useNavigate } from 'react-router-dom'
import { useAuth } from './useAuth'
import { useToast } from './useToast'
import { apiFetch } from '@/lib/api'

// Generic upgrade button — navigates to /upgrade page
export const useUpgrade = () => {
  const navigate = useNavigate()
  return () => navigate('/upgrade')
}

// Used by UpgradePage — direct Stripe checkout with chosen plan
export const useCheckout = () => {
  const { userId, user } = useAuth()
  const toast = useToast()

  return async (plan = 'monthly', coupon = null) => {
    if (!userId || !user?.email) { toast.error('Please sign in first'); return }
    try {
      const res = await apiFetch('/api/create-checkout', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, plan, coupon }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.location.href = data.url
    } catch (e) {
      toast.error(`Couldn't start checkout: ${e.message}`)
    }
  }
}
