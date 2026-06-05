// Square payment webhook -> JobIntel 360 affiliate conversions.
//
// When Square reports a completed payment for a referred client, this
// function marks that client as paid, which fires the commission engine
// (award_referral_commission) built in the affiliate program migrations.
//
// Required Edge Function secrets:
//   SQUARE_WEBHOOK_SIGNATURE_KEY  - from the Square webhook subscription
//   SQUARE_WEBHOOK_URL            - the exact notification URL configured in
//                                   Square (recommended; falls back to req.url)
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (provided by the platform)
//
// Configure in config.toml with verify_jwt = false (Square calls it directly).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-square-hmacsha256-signature',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function base64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

// Constant-time-ish comparison
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifySignature(signatureKey: string, url: string, body: string, header: string): Promise<boolean> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(signatureKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(url + body))
  return safeEqual(base64(mac), header)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const signatureKey = Deno.env.get('SQUARE_WEBHOOK_SIGNATURE_KEY') ?? ''
    const signature = req.headers.get('x-square-hmacsha256-signature') ?? ''
    const notificationUrl = Deno.env.get('SQUARE_WEBHOOK_URL') || req.url

    // Verify the webhook actually came from Square.
    if (signatureKey) {
      const ok = await verifySignature(signatureKey, notificationUrl, rawBody, signature)
      if (!ok) {
        console.warn('Square webhook signature verification failed')
        return new Response('invalid signature', { status: 401, headers: corsHeaders })
      }
    } else {
      console.warn('SQUARE_WEBHOOK_SIGNATURE_KEY not set — skipping verification')
    }

    const event = JSON.parse(rawBody || '{}')
    const type: string = event?.type ?? ''
    console.log('Square webhook:', type, 'id:', event?.event_id)

    // We care about completed payments / paid invoices.
    let buyerEmail: string | null = null
    let referenceId: string | null = null
    let amount = 0          // dollars
    let isPaid = false

    if (type === 'payment.created' || type === 'payment.updated') {
      const p = event?.data?.object?.payment
      isPaid = (p?.status ?? '').toUpperCase() === 'COMPLETED'
      buyerEmail = p?.buyer_email_address ?? null
      referenceId = p?.reference_id ?? p?.note ?? p?.order_id ?? null
      amount = (p?.amount_money?.amount ?? 0) / 100
    } else if (type === 'invoice.payment_made' || type === 'invoice.updated') {
      const inv = event?.data?.object?.invoice
      const status = (inv?.status ?? '').toUpperCase()
      isPaid = status === 'PAID' || status === 'PARTIALLY_PAID'
      buyerEmail = inv?.primary_recipient?.email_address ?? null
      referenceId = inv?.order_id ?? inv?.invoice_number ?? null
      amount = (inv?.payment_requests?.[0]?.computed_amount_money?.amount
        ?? inv?.next_payment_amount_money?.amount ?? 0) / 100
    } else {
      // Acknowledge other event types so Square stops retrying.
      return new Response(JSON.stringify({ ignored: type }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!isPaid) {
      return new Response(JSON.stringify({ ok: true, note: 'not a completed payment' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Resolve the client: prefer an explicit client UUID in reference_id/note,
    // otherwise match by buyer email.
    let client: any = null
    if (referenceId && UUID_RE.test(referenceId)) {
      const { data } = await supabase.from('clients').select('id, email, payment_status').eq('id', referenceId).maybeSingle()
      client = data
    }
    if (!client && buyerEmail) {
      const { data } = await supabase
        .from('clients')
        .select('id, email, payment_status')
        .ilike('email', buyerEmail)
        .order('created_at', { ascending: false })
        .limit(1)
      client = data?.[0] ?? null
    }

    if (!client) {
      console.log('No matching client for Square payment', { buyerEmail, referenceId })
      return new Response(JSON.stringify({ ok: true, matched: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Award commission with the real Square amount (idempotent in the DB), then
    // mark the client paid so the rest of the app reflects the conversion.
    if (amount > 0) {
      const { error: rpcErr } = await supabase.rpc('award_referral_commission', {
        p_client_id: client.id,
        p_amount: amount,
      })
      if (rpcErr) console.error('award_referral_commission error', rpcErr)
    }

    const { error: updErr } = await supabase
      .from('clients')
      .update({ payment_status: 'paid' })
      .eq('id', client.id)
    if (updErr) console.error('client update error', updErr)

    console.log('Square conversion processed for client', client.id, 'amount', amount)
    return new Response(JSON.stringify({ ok: true, matched: true, client_id: client.id, amount }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('square-payment-webhook error', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
