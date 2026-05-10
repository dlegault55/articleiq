import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Get raw body for Stripe signature verification
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk))
    req.on('end',  () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function findAndUpdateUser(email, customerId, plan, status) {
  if (!email) {
    console.error('No email provided to findAndUpdateUser')
    return false
  }

  // First try by stripe_customer_id
  if (customerId) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (existing) {
      await supabase.from('profiles').update({ plan, subscription_status: status, stripe_customer_id: customerId }).eq('id', existing.id)
      console.log(`Updated profile by customer ID: ${existing.id} → plan=${plan}`)
      return true
    }
  }

  // Fall back to email lookup via auth
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) { console.error('listUsers error:', error.message); return false }

  const match = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!match) { console.error(`No user found for email: ${email}`); return false }

  await supabase.from('profiles').update({
    plan,
    subscription_status: status,
    stripe_customer_id: customerId,
  }).eq('id', match.id)

  console.log(`Updated profile by email: ${match.id} → plan=${plan}`)
  return true
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig  = req.headers['stripe-signature']
  const body = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({ error: `Webhook error: ${err.message}` })
  }

  console.log(`Stripe webhook: ${event.type}`)
  const obj = event.data.object

  try {
    switch (event.type) {

      // ── One-time payment (Scan Pack) ──────────────────────────
      case 'checkout.session.completed': {
        const email      = obj.customer_details?.email || obj.customer_email
        const customerId = obj.customer
        const mode       = obj.mode // 'payment' or 'subscription'

        if (mode === 'payment') {
          // Scan Pack — one-time purchase, grant pack plan
          await findAndUpdateUser(email, customerId, 'pack', 'active')
        } else if (mode === 'subscription') {
          // Annual Pro — subscription started
          await findAndUpdateUser(email, customerId, 'annual', 'active')
        }
        break
      }

      // ── Subscription events (Annual Pro) ─────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const customerId = obj.customer
        const status     = obj.status // active, past_due, canceled, etc.

        if (status === 'active' || status === 'trialing') {
          // Get customer email from Stripe
          const customer = await stripe.customers.retrieve(customerId)
          const email    = customer.email
          await findAndUpdateUser(email, customerId, 'annual', 'active')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const customerId = obj.customer
        await supabase.from('profiles').update({
          plan:                'free',
          subscription_status: 'cancelled',
        }).eq('stripe_customer_id', customerId)
        console.log(`Subscription cancelled for customer: ${customerId}`)
        break
      }

      case 'invoice.payment_failed': {
        const customerId = obj.customer
        await supabase.from('profiles').update({
          subscription_status: 'past_due',
        }).eq('stripe_customer_id', customerId)
        console.log(`Payment failed for customer: ${customerId}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message)
    // Still return 200 so Stripe doesn't retry — log the error
    return res.status(200).json({ received: true, error: err.message })
  }

  return res.status(200).json({ received: true })
}
