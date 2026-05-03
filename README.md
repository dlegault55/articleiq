# ArticleIQ — AI-Powered Knowledge Base Intelligence

Scan, analyze, and optimize your Zendesk knowledge base with AI.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Database & Auth**: Supabase (Postgres + RLS + Google OAuth)
- **AI**: Claude Sonnet (Anthropic API)
- **Payments**: Stripe (stubbed — wire up when ready)
- **Hosting**: Vercel-ready

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Supabase Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open the **SQL Editor**
3. Run `supabase/schema.sql` (copy-paste the full file)
4. Go to **Authentication → Providers → Google** and enable Google OAuth
5. Add `http://localhost:3000` and your production URL to **Redirect URLs**

### Make yourself admin

After signing in for the first time, run this in the SQL editor:

```sql
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'your@email.com';
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...    # optional until Stripe is wired up
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Stripe Setup (when ready)

1. Create a product + monthly price in [Stripe Dashboard](https://dashboard.stripe.com)
2. Copy the Price ID (`price_...`) into `src/lib/stripe.js` → `PLANS.paid.priceId`
3. Add your keys to `.env`
4. Deploy Edge Functions for `stripe-create-checkout` and `stripe-billing-portal`
5. Set up webhook → handle `checkout.session.completed` and `customer.subscription.deleted`

## Project Structure

```
src/
├── components/
│   ├── layout/       # Sidebar, Layout wrapper
│   └── ui/           # Shared UI components
├── hooks/
│   └── useAuth.jsx   # Auth context + hook
├── lib/
│   ├── supabase.js   # Supabase client + helpers
│   ├── claude.js     # Anthropic API calls (grammar, rewrite, quality score)
│   ├── scanner.js    # Article analysis engine (no AI needed)
│   └── stripe.js     # Stripe stubs (wire up later)
├── pages/            # Route-level page components
│   ├── LoginPage.jsx
│   ├── DashboardPage.jsx
│   ├── ScannerPage.jsx
│   ├── ScanResultsPage.jsx
│   ├── ConnectorPage.jsx
│   ├── BillingPage.jsx
│   ├── SettingsPage.jsx
│   └── AdminPage.jsx
└── index.css         # Global styles + design tokens
supabase/
└── schema.sql        # Full Postgres schema with RLS
```

## Tiers

| Feature | Free | Pro ($49/mo) |
|---------|------|-------------|
| Articles per scan | 100 | Unlimited |
| Broken links | ✓ | ✓ |
| Outdated detection | ✓ | ✓ |
| Readability score | ✓ | ✓ |
| Grammar fix (AI) | — | ✓ |
| Full rewrite (AI) | — | ✓ |
| Quality score (AI) | — | ✓ |
| Push to Zendesk | — | ✓ |

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set env vars in Vercel dashboard or:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_ANTHROPIC_API_KEY
```

## Notes on Zendesk API key storage

Currently, API keys are stored as plain text in Supabase with Row Level Security (only the owner can read them). For production:
- Use [Supabase Vault](https://supabase.com/docs/guides/database/vault) for secret encryption
- Or route all Zendesk API calls through a Supabase Edge Function that holds the secret server-side

## Renaming from ArticleIQ

1. `index.html` → update `<title>` and meta description
2. `src/components/layout/Layout.jsx` → update logo text
3. `src/pages/LoginPage.jsx` → update hero copy
4. `package.json` → update `"name"`
