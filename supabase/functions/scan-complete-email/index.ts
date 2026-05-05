// supabase/functions/scan-complete-email/index.ts
// Triggered by a Supabase Database Webhook on scan_jobs when status = 'completed'
// Uses Resend (https://resend.com) — free tier: 3,000 emails/month
//
// Setup:
// 1. Sign up at resend.com, get API key
// 2. supabase secrets set RESEND_API_KEY=re_...
// 3. supabase functions deploy scan-complete-email
// 4. In Supabase Dashboard → Database → Webhooks → Create webhook:
//    Table: scan_jobs, Events: UPDATE, Filter: status=completed
//    URL: https://YOUR_PROJECT.supabase.co/functions/v1/scan-complete-email

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const record = payload.record

    // Only process completed scans
    if (record?.status !== 'completed') {
      return new Response(JSON.stringify({ skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', record.user_id)
      .single()

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: 'No email found' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const scanDate = new Date(record.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const reportUrl = `${Deno.env.get('APP_URL') || 'https://articleiq.vercel.app'}/scanner/results/${record.id}`
    const firstName = profile.full_name?.split(' ')[0] || 'there'

    const critical = record.critical_count || 0
    const warning  = record.warning_count  || 0
    const articles = record.scanned_articles || 0

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F4;font-family:Inter,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #E2E2DE;overflow:hidden">
    <div style="background:#107C10;padding:24px 32px">
      <div style="font-family:Inter,sans-serif;font-weight:700;font-size:18px;letter-spacing:3px;color:#fff">
        ARTICLE<span style="opacity:0.8">IQ</span>
      </div>
    </div>
    <div style="padding:32px">
      <h1 style="font-size:22px;font-weight:700;color:#1A1A18;margin:0 0 8px 0">Your scan is complete, ${firstName}</h1>
      <p style="font-size:14px;color:#5C5C58;margin:0 0 24px 0">${scanDate} · ${articles} articles scanned</p>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
        <div style="text-align:center;padding:16px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE">
          <div style="font-size:28px;font-weight:700;color:${critical > 0 ? '#B91C1C' : '#107C10'}">${critical}</div>
          <div style="font-size:12px;color:#9B9B96;margin-top:2px">Critical</div>
        </div>
        <div style="text-align:center;padding:16px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE">
          <div style="font-size:28px;font-weight:700;color:${warning > 0 ? '#92600A' : '#107C10'}">${warning}</div>
          <div style="font-size:12px;color:#9B9B96;margin-top:2px">Warnings</div>
        </div>
        <div style="text-align:center;padding:16px;background:#F5F5F4;border-radius:8px;border:1px solid #E2E2DE">
          <div style="font-size:28px;font-weight:700;color:#107C10">${articles}</div>
          <div style="font-size:12px;color:#9B9B96;margin-top:2px">Articles</div>
        </div>
      </div>

      ${critical > 0 ? `<p style="font-size:14px;color:#5C5C58;margin:0 0 24px 0">You have <strong style="color:#B91C1C">${critical} critical issue${critical !== 1 ? 's' : ''}</strong> that need immediate attention.</p>` : `<p style="font-size:14px;color:#5C5C58;margin:0 0 24px 0">Looking good! No critical issues found.</p>`}

      <a href="${reportUrl}" style="display:inline-block;padding:12px 24px;background:#107C10;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        View full report →
      </a>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #E2E2DE;background:#F5F5F4">
      <p style="font-size:12px;color:#9B9B96;margin:0">
        ArticleIQ · <a href="https://articleiq.vercel.app" style="color:#107C10;text-decoration:none">articleiq.vercel.app</a>
      </p>
    </div>
  </div>
</body>
</html>`

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) {
      console.log('RESEND_API_KEY not set — skipping email send')
      return new Response(JSON.stringify({ skipped: 'no_resend_key' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ArticleIQ <noreply@articleiq.vercel.app>',
        to: [profile.email],
        subject: `Scan complete — ${critical > 0 ? `${critical} critical issue${critical !== 1 ? 's' : ''} found` : 'No critical issues'} · ${articles} articles`,
        html: emailHtml,
      }),
    })

    const emailResult = await emailRes.json()
    return new Response(JSON.stringify({ success: true, email: emailResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
