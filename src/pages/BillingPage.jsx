import { useAuth } from '@/hooks/useAuth'
import { PLANS, createCheckoutSession, openBillingPortal } from '@/lib/stripe'
import { useState } from 'react'
import { Zap, Check, Lock, ExternalLink, AlertCircle } from 'lucide-react'
import { PageShell } from '@/components/ui'

const FeatureRow = ({ text, free, paid }) => (
  <div className="flex items-center py-2.5 border-b border-border last:border-0">
    <span className="flex-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{text}</span>
    <div className="w-20 text-center">
      {free === true ? <Check size={14} style={{ color: 'var(--xbox)' }} className="mx-auto" />
        : free === false ? <span style={{ color: 'var(--text-muted)' }}>—</span>
        : <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{free}</span>}
    </div>
    <div className="w-20 text-center">
      {paid === true ? <Check size={14} style={{ color: 'var(--xbox)' }} className="mx-auto" />
        : paid === false ? <span style={{ color: 'var(--text-muted)' }}>—</span>
        : <span className="text-xs" style={{ color: 'var(--xbox-light)' }}>{paid}</span>}
    </div>
  </div>
)

export default function BillingPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [stripeMsg, setStripeMsg] = useState(null)

  const handleUpgrade = async () => {
    setLoading(true)
    const { url, error } = await createCheckoutSession(profile?.id, PLANS.paid.priceId)
    if (error) setStripeMsg(`⚠️ Stripe not yet configured. ${error}`)
    else if (url) window.location.href = url
    setLoading(false)
  }

  const handlePortal = async () => {
    setLoading(true)
    const { url, error } = await openBillingPortal(profile?.id)
    if (error) setStripeMsg(`⚠️ Stripe not yet configured. ${error}`)
    else if (url) window.open(url, '_blank')
    setLoading(false)
  }

  const isPaid = profile?.plan === 'paid'

  return (
    <PageShell eyebrow="Subscription" title="Billing & Plans" subtitle={isPaid ? 'You are on the Pro plan.' : 'Upgrade to unlock AI features and unlimited scans.'}>

      {/* Current plan banner */}
      <div className={`card-glow p-4 mb-6 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(16,124,16,0.15)', border: '1px solid rgba(16,124,16,0.3)' }}>
            <Zap size={16} style={{ color: isPaid ? 'var(--xbox-light)' : 'var(--text-muted)' }} />
          </div>
          <div>
            <div className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
              {isPaid ? 'Pro Plan' : 'Free Plan'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {isPaid ? '$49/month · Billed monthly' : 'Up to 100 articles per scan, no AI features'}
            </div>
          </div>
        </div>
        {isPaid ? (
          <button onClick={handlePortal} disabled={loading} className="btn-secondary text-xs">
            <ExternalLink size={12} /> Manage Billing
          </button>
        ) : (
          <button onClick={handleUpgrade} disabled={loading} className="btn-primary text-xs">
            <Zap size={12} /> Upgrade to Pro
          </button>
        )}
      </div>

      {/* Stripe not configured notice */}
      {stripeMsg && (
        <div className="mb-6 p-4 rounded-md flex items-start gap-2.5 text-sm"
          style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#FCD34D' }}>
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            {stripeMsg}
            <p className="mt-1 text-xs opacity-70">
              To wire up Stripe: add your keys to .env, create a product in Stripe dashboard, then update the price ID in src/lib/stripe.js.
            </p>
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <div className="card overflow-hidden">
        <div className="flex border-b border-border">
          <div className="flex-1 px-5 py-3" />
          <div className="w-20 text-center px-2 py-3 text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Free</div>
          <div className="w-20 text-center px-2 py-3 text-xs font-mono uppercase tracking-wider"
            style={{ color: 'var(--xbox-light)', background: 'rgba(16,124,16,0.08)' }}>Pro</div>
        </div>

        <div className="divide-y divide-border">
          <div className="flex items-center py-2 px-5">
            <span className="flex-1 text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Scanning</span>
          </div>
        </div>
        <div className="px-5">
          <FeatureRow text="Articles per scan" free="100" paid="Unlimited" />
          <FeatureRow text="Broken link detection" free paid />
          <FeatureRow text="Outdated article detection (180+ days)" free paid />
          <FeatureRow text="Word count analysis" free paid />
          <FeatureRow text="Readability score (Flesch-Kincaid)" free paid />
          <FeatureRow text="Missing metadata detection" free paid />
        </div>

        <div className="divide-y divide-border mt-2">
          <div className="flex items-center py-2 px-5">
            <span className="flex-1 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Zap size={11} style={{ color: 'var(--xbox)' }} /> AI Features
            </span>
          </div>
        </div>
        <div className="px-5">
          <FeatureRow text="Grammar fix (Claude AI)" free={false} paid />
          <FeatureRow text="Full article rewrite (Claude AI)" free={false} paid />
          <FeatureRow text="Quality score & suggestions" free={false} paid />
          <FeatureRow text="Push fixes back to Zendesk" free={false} paid />
          <FeatureRow text="Scan history (all time)" free="30 days" paid="Unlimited" />
        </div>

        <div className="p-5 border-t border-border flex items-center justify-between"
          style={{ background: 'rgba(16,124,16,0.05)' }}>
          <div>
            <div className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
              $49<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/month</span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Cancel anytime</div>
          </div>
          {!isPaid && (
            <button onClick={handleUpgrade} disabled={loading} className="btn-primary">
              <Zap size={14} />
              {loading ? 'Loading...' : 'Upgrade to Pro'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Lock size={11} />
        Payments are processed securely by Stripe. We never store payment details.
      </div>
    </PageShell>
  )
}
