import { usePageTitle } from '@/hooks/usePageTitle'
import { Scan } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function TermsPage() {
  usePageTitle('Terms of Service')
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,4vw,24px)' }}>
      <div style={{ marginBottom: 32 }}>
        <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:7, textDecoration:'none', marginBottom:24 }}>
          <div style={{ width:24, height:24, background:'var(--navy)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Scan size={12} color="white" />
          </div>
          <span style={{ fontWeight:800, fontSize:14, color:'var(--text)' }}>Article<span style={{ color:'var(--green)' }}>IQ</span></span>
        </Link>
        <h1 style={{ fontSize:28, fontWeight:800, color:'var(--text)', letterSpacing:-0.5, marginBottom:6 }}>Terms of Service</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Last updated: May 2026</p>
      </div>

      {[
        {
          title: '1. Acceptance of terms',
          body: 'By accessing or using ArticleIQ ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. These terms apply to all users, including free and paid accounts.',
        },
        {
          title: '2. Description of service',
          body: 'ArticleIQ is a knowledge base scanning and improvement tool that connects to third-party platforms (such as Zendesk®) to analyse article quality, identify issues, and generate AI-powered recommendations. Zendesk® is a registered trademark of Zendesk, Inc. ArticleIQ is not affiliated with, endorsed by, or sponsored by Zendesk, Inc.',
        },
        {
          title: '3. Account registration',
          body: 'You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must notify us immediately of any unauthorised access. You may not share your account with others or use another person\'s account.',
        },
        {
          title: '4. Acceptable use',
          body: 'You agree not to use the Service to: (a) violate any applicable laws or regulations; (b) upload malicious code or attempt to compromise the security of the Service; (c) scrape, copy, or redistribute any part of the Service without permission; (d) use the Service in a way that could harm ArticleIQ or other users; (e) attempt to access another user\'s data or account.',
        },
        {
          title: '5. Paid plans and billing',
          body: 'Scan Pack purchases are one-time payments. Scan credits never expire and are non-transferable. Annual Pro subscriptions are billed annually and renew automatically unless cancelled. Prices are listed in USD and are subject to change with reasonable notice.',
        },
        {
          title: '6. No refunds',
          body: 'All purchases are final and non-refundable. This includes Scan Pack one-time purchases and Annual Pro subscription payments. We do not offer refunds, credits, or exchanges for any reason, including unused scan credits, partial subscription periods, or dissatisfaction with results. If you have a billing issue you believe is in error, contact us via the <a href="/contact" style={{color:"var(--navy)"}}>contact form</a> within 7 days.',
        },
        {
          title: '7. Cancellation',
          body: 'You may cancel your Annual Pro subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. Your access to paid features continues until the subscription period ends. Scan Pack credits remain available after cancellation.',
        },
        {
          title: '8. AI-generated content',
          body: 'ArticleIQ uses Claude (by Anthropic) to generate content suggestions and rewrites. AI-generated content is provided as a starting point for your review. You are solely responsible for reviewing, editing, and approving any AI-generated content before publishing it to your knowledge base. ArticleIQ makes no warranties about the accuracy, completeness, or fitness of AI-generated content.',
        },
        {
          title: '9. Intellectual property',
          body: 'You retain ownership of all content you upload or connect to the Service. ArticleIQ does not claim ownership of your knowledge base articles. By using the Service, you grant ArticleIQ a limited licence to process your content solely for the purpose of providing the Service.',
        },
        {
          title: '10. Limitation of liability',
          body: 'To the maximum extent permitted by law, ArticleIQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of revenue, data, or business opportunity. Our total liability for any claim shall not exceed the amount you paid to ArticleIQ in the 12 months preceding the claim.',
        },
        {
          title: '11. Disclaimer of warranties',
          body: 'The Service is provided "as is" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that scan results will be complete or accurate. Broken link detection and other automated checks may produce false positives or miss issues.',
        },
        {
          title: '12. Changes to terms',
          body: 'We may update these terms from time to time. We will notify users of material changes by email or by posting a notice in the application. Continued use of the Service after changes constitutes acceptance of the updated terms.',
        },
        {
          title: '13. Contact',
          body: 'Questions about these terms? Use our <a href="/contact" style={{color:"var(--navy)"}}>contact form</a>.',
        },
      ].map(({ title, body }) => (
        <div key={title} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{title}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.8, margin: 0 }}>{body}</p>
        </div>
      ))}

      <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--border)', display: 'flex', gap: 20 }}>
        <Link to="/privacy" style={{ fontSize: 13, color: 'var(--navy)' }}>Privacy Policy</Link>
        <Link to="/contact" style={{ fontSize: 13, color: 'var(--navy)' }}>Contact us</Link>
        <Link to="/" style={{ fontSize: 13, color: 'var(--text-3)' }}>Back to ArticleIQ</Link>
      </div>
    </div>
  )
}
