import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { userId, email } = req.body
  if (!userId || !email) return res.status(400).json({ error: 'Missing userId or email' })

  try {
    // Check if customer already exists
    const { data: profile } = await supabase
      .from('profiles').select('stripe_customer_id').eq('id', userId).single()

    let customerId = profile?.stripe_customer_id

    // Create Stripe customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId)
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
