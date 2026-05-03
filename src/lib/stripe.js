// ─── ArticleIQ — Stripe Integration (STUBBED) ────────────────
// Wire up real Stripe keys and webhooks when ready.
// Replace these stubs with actual Stripe.js calls.

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    limits: {
      articlesPerScan: 100,
      aiFeatures: false,
      pushToZendesk: false,
    },
  },
  paid: {
    id: 'paid',
    name: 'Pro',
    price: 49,
    priceId: 'price_REPLACE_WITH_STRIPE_PRICE_ID',
    limits: {
      articlesPerScan: Infinity,
      aiFeatures: true,
      pushToZendesk: true,
    },
  },
}

// ─── Stub: Create checkout session ───────────────────────────
export const createCheckoutSession = async (userId, priceId) => {
  console.warn('[Stripe STUB] createCheckoutSession called', { userId, priceId })
  // TODO: call your backend or Supabase Edge Function:
  // POST /functions/v1/stripe-create-checkout
  return { url: null, error: 'Stripe not yet configured' }
}

// ─── Stub: Open billing portal ───────────────────────────────
export const openBillingPortal = async (userId) => {
  console.warn('[Stripe STUB] openBillingPortal called', { userId })
  // TODO: call your backend or Supabase Edge Function:
  // POST /functions/v1/stripe-billing-portal
  return { url: null, error: 'Stripe not yet configured' }
}

// ─── Stub: Cancel subscription ────────────────────────────────
export const cancelSubscription = async (subscriptionId) => {
  console.warn('[Stripe STUB] cancelSubscription called', { subscriptionId })
  return { success: false, error: 'Stripe not yet configured' }
}

// ─── Stub: Webhook handler (Edge Function) ────────────────────
// Deploy as supabase/functions/stripe-webhook/index.ts
export const STRIPE_WEBHOOK_STUB = `
// supabase/functions/stripe-webhook/index.ts
// TODO: implement real Stripe webhook handling
// Events to handle:
//   checkout.session.completed  -> set plan = 'paid'
//   customer.subscription.deleted -> set plan = 'free'
//   invoice.payment_failed -> notify user
`

export const canUseAI = (plan) => plan === 'paid'
export const canPushToZendesk = (plan) => plan === 'paid'
export const getArticleLimit = (plan) => PLANS[plan]?.limits.articlesPerScan ?? 100
