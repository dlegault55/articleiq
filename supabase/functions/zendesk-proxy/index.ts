// supabase/functions/zendesk-proxy/index.ts
// Proxies Zendesk Help Center API calls to avoid CORS
// Deploy: supabase functions deploy zendesk-proxy

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    // Get request body
    const { subdomain, apiKey, page = 1 } = await req.json()
    if (!subdomain || !apiKey) {
      return new Response(JSON.stringify({ error: 'subdomain and apiKey required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Make server-side call to Zendesk (no CORS issues here)
    const zdUrl = `https://${subdomain}.zendesk.com/api/v2/help_center/articles?per_page=100&page=${page}&include=sections`
    const zdRes = await fetch(zdUrl, {
      headers: {
        'Authorization': `Basic ${btoa(apiKey)}`,
        'Content-Type': 'application/json',
      }
    })

    if (!zdRes.ok) {
      const err = await zdRes.json().catch(() => ({}))
      return new Response(JSON.stringify({ error: err.description || `Zendesk API error ${zdRes.status}` }), {
        status: zdRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = await zdRes.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
