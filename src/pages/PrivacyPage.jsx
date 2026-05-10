import { usePageTitle } from '@/hooks/usePageTitle'
import { Scan } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PrivacyPage() {
  usePageTitle('Privacy Policy')
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,24px)' }}>
      <div style={{ marginBottom: 32 }}>
        <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:7, textDecoration:'none', marginBottom:24 }}>
          <div style={{ width:24, height:24, background:'var(--navy)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={12} color="white" />
          </div>
          <span style={{ fontWeight:800, fontSize:14, color:'var(--text)' }}>Article<span style={{ color:'var(--green)' }}>IQ</span></span>
        </Link>
        <h1 style={{ fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:-0.5, marginBottom:6 }}>Privacy Policy</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Last updated: May 2026</p>
      </div>

      {/* AI training callout */}
      <div style={{ padding:'16px 18px', borderRadius:10, background:'var(--navy-light)', border:'1px solid var(--navy-border)', marginBottom:32, display:'flex', gap:12 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'var(--navy)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Scan size={14} color="white" />
        </div>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--navy)', margin:'0 0 3px' }}>We do not train AI on your content</p>
          <p style={{ fontSize:12, color:'var(--text-2)', margin:0, lineHeight:1.6 }}>
            Your knowledge base articles are processed through Anthropic's Claude API to generate recommendations and rewrites. This content is not used to train AI models — by ArticleIQ or by Anthropic. Anthropic's API usage policies prohibit training on API inputs. Your content is processed in transit and not retained for model training purposes.
          </p>
        </div>
      </div>

      {[
        {
          title: '1. Information we collect',
          body: 'We collect: (a) Account information — your name and email address when you register; (b) Usage data — pages visited, features used, scan history, and issue counts; (c) Knowledge base metadata — article titles, word counts, labels, URLs, and issue data from your connected platforms. We do not store the full body text of your articles permanently — article content is processed in memory during scans and AI analysis only.',
        },
        {
          title: '2. How we use your information',
          body: 'We use your information to: provide and improve the Service; generate scan results, quality scores, and AI recommendations; send scan completion notifications if you opt in; respond to support enquiries; detect and prevent fraud or abuse; and comply with legal obligations. We do not sell your personal information to third parties.',
        },
        {
          title: '3. AI processing and your content',
          body: 'ArticleIQ uses Claude by Anthropic to analyse articles and generate recommendations. When you use AI features, article content is sent to Anthropic\'s API for processing. Anthropic\'s privacy policy governs their handling of this data. Anthropic does not use API inputs to train their models. We do not retain article body content after processing — only scan results (issue types, severity, counts) are stored in our database.',
        },
        {
          title: '4. Third-party integrations',
          body: 'When you connect a platform such as Zendesk®, we store your API credentials (encrypted) to make API calls on your behalf. We only request the permissions needed to scan and publish articles. We do not share your credentials or data with other users or third parties beyond what is necessary to provide the Service.',
        },
        {
          title: '5. Data storage and security',
          body: 'Your data is stored in Supabase (PostgreSQL) hosted in the United States. API credentials are encrypted at rest. We use HTTPS for all data in transit. Access to your data is restricted to the authenticated user. We do not share data between accounts.',
        },
        {
          title: '6. Data retention',
          body: 'We retain your account data for as long as your account is active. Scan history is retained indefinitely so you can track KB health over time — you can delete individual scans or all scan history at any time from the Connectors page. If you delete your account, all associated data is permanently removed within 30 days.',
        },
        {
          title: '7. Cookies and tracking',
          body: 'We use session cookies to keep you logged in. We do not use advertising cookies or cross-site tracking. We do not run advertising networks or retargeting. We may use anonymised, aggregate usage analytics (such as page views and feature usage) to improve the product.',
        },
        {
          title: '8. Your rights',
          body: 'You have the right to: access the personal data we hold about you; correct inaccurate data; request deletion of your account and data; export your scan history; and opt out of email notifications at any time from account settings. To exercise these rights, contact us at support@articleiq.app.',
        },
        {
          title: '9. Children\'s privacy',
          body: 'ArticleIQ is not directed at children under 16. We do not knowingly collect personal information from anyone under 16. If you believe we have inadvertently collected such information, contact us and we will delete it promptly.',
        },
        {
          title: '10. Changes to this policy',
          body: 'We may update this policy from time to time. We will notify users of material changes by email or in-app notice. Continued use of the Service after changes constitutes acceptance of the updated policy.',
        },
        {
          title: '11. Contact',
          body: 'Questions about this policy or your data? Contact us at support@articleiq.app.',
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.8, margin: 0 }}>{body}</p>
        </div>
      ))}

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 20 }}>
        <Link to="/terms" style={{ fontSize: 13, color: 'var(--navy)' }}>Terms of Service</Link>
        <Link to="/contact" style={{ fontSize: 13, color: 'var(--navy)' }}>Contact us</Link>
        <Link to="/" style={{ fontSize: 13, color: 'var(--text-3)' }}>Back to ArticleIQ</Link>
      </div>
    </div>
  )
}
