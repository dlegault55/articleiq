import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_auth.js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verify JWT — get real userId from token, ignore any body userId
  let auth
  try {
    auth = await requireAuth(req)
  } catch (e) {
    return res.status(e.status || 401).json({ error: e.message })
  }

  try {
    const { data: profile } = await supabase
      .from('profiles').select('stripe_customer_id, plan').eq('id', auth.userId).single()

    // Already subscribed
    if (profile?.plan === 'paid') {
      return res.status(400).json({ error: 'Already subscribed to Pro' })
    }

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: auth.email,
        metadata: { supabase_user_id: auth.userId }
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', auth.userId)
    }

    const session = await stripe.checkout.sessions.create({
      customer:   customerId,
      mode:       'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.APP_URL}/dashboard?upgraded=true`,
      cancel_url:  `${process.env.APP_URL}/dashboard`,
      allow_promotion_codes: true,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
