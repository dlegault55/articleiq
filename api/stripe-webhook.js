import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig  = req.headers['stripe-signature']
  const body = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  const session = event.data.object

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const customerId = session.customer || session.id
      const status     = session.status || (event.type === 'checkout.session.completed' ? 'active' : session.status)
      if (status === 'active' || event.type === 'checkout.session.completed') {
        // Find user by stripe_customer_id or email
        const email = session.customer_details?.email || session.customer_email
        if (email) {
          const { data: user } = await supabase.auth.admin.listUsers()
          const match = user?.users?.find(u => u.email === email)
          if (match) {
            await supabase.from('profiles').update({
              plan:               'paid',
              stripe_customer_id: customerId,
              subscription_status: 'active',
            }).eq('id', match.id)
          }
        }
      }
      break
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const customerId = session.customer
      await supabase.from('profiles').update({
        plan:               'free',
        subscription_status: event.type === 'invoice.payment_failed' ? 'past_due' : 'cancelled',
      }).eq('stripe_customer_id', customerId)
      break
    }
  }

  return res.status(200).json({ received: true })
}

// Get raw body for Stripe signature verification
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(Buffer.from(data)))
    req.on('error', reject)
  })
}
