import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface WebhookPayload {
  event: string;
  type: 'boleto' | 'pix' | 'cartao';
  external_id?: string;
  amount: number;
  status?: 'gerado' | 'pago' | 'pendente' | 'cancelado' | 'expirado';
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_document?: string;
  boleto_url?: string;
  metadata?: Record<string, unknown>;
  paid_at?: string;
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface WirePusherTemplate {
  event_type: string;
  title: string;
  message: string;
  notification_type: string;
  is_active: boolean;
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/^\+/, '');
}

function normalizeExternalId(externalId?: string): string | undefined {
  if (!externalId) return undefined;
  return externalId.replace(/[\s.\-\/]/g, '');
}

// Base64 URL helpers
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Replace template variables
function replaceTemplateVariables(
  text: string,
  data: { customer_name?: string; amount: number; type: string }
): string {
  const firstName = data.customer_name?.split(' ')[0] || 'Cliente';
  const fullName = data.customer_name || 'Cliente';
  const formattedAmount = `R$ ${Number(data.amount).toFixed(2).replace('.', ',')}`;
  const typeLabel = data.type === 'boleto' ? 'Boleto' : data.type === 'pix' ? 'PIX' : 'Cartão';

  return text
    .replace(/{nome}/g, fullName)
    .replace(/{primeiro_nome}/g, firstName)
    .replace(/{valor}/g, formattedAmount)
    .replace(/{tipo}/g, typeLabel);
}

// Send WirePusher notification
async function sendWirePusherNotification(
  supabase: any,
  eventType: string,
  transactionData: { customer_name?: string; amount: number; type: string }
): Promise<void> {
  try {
    // Get WirePusher settings
    const { data: settings, error: settingsError } = await supabase
      .from('wirepusher_settings')
      .select('device_id, is_enabled')
      .maybeSingle();

    if (settingsError) {
      console.log('[WirePusher] Error fetching settings:', settingsError);
      return;
    }

    if (!settings?.is_enabled || !settings?.device_id) {
      console.log('[WirePusher] Disabled or no device_id configured');
      return;
    }

    // Get template for this event type
    const { data: template, error: templateError } = await supabase
      .from('wirepusher_notification_templates')
      .select('*')
      .eq('event_type', eventType)
      .eq('is_active', true)
      .maybeSingle();

    if (templateError) {
      console.log('[WirePusher] Error fetching template:', templateError);
      return;
    }

    if (!template) {
      console.log(`[WirePusher] No active template for event: ${eventType}`);
      return;
    }

    // Replace variables in template
    const title = replaceTemplateVariables(template.title, transactionData);
    const message = replaceTemplateVariables(template.message, transactionData);

    // Build WirePusher URL
    const url = new URL('https://wirepusher.com/send');
    url.searchParams.set('id', settings.device_id);
    url.searchParams.set('title', title);
    url.searchParams.set('message', message);
    url.searchParams.set('type', template.notification_type);

    console.log(`[WirePusher] Sending notification: ${url.toString()}`);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const text = await response.text();
      console.error('[WirePusher] Failed:', response.status, text);
      return;
    }

    console.log('[WirePusher] Notification sent successfully!');
  } catch (error) {
    console.error('[WirePusher] Error:', error);
  }
}

// Get event type for WirePusher based on transaction type and status
function getWirePusherEventType(type: string, status: string): string {
  return `${type}_${status}`;
}

// Create VAPID JWT using Web Crypto
async function createVapidJwt(
  audience: string,
  subject: string,
  publicKeyBase64: string,
  privateKeyBase64: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode the raw private key (32 bytes)
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  const publicKeyBytes = base64UrlDecode(publicKeyBase64);
  
  // Create JWK from raw keys
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    d: base64UrlEncode(privateKeyBytes),
  };

  // Import private key as JWK
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Send push notification with VAPID auth
async function sendPushNotification(
  subscription: PushSubscription,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const endpoint = new URL(subscription.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.host}`;
    
    console.log('[Push] Creating VAPID JWT for:', audience);
    
    const jwt = await createVapidJwt(
      audience,
      'mailto:admin@origemviva.com',
      vapidPublicKey,
      vapidPrivateKey
    );
    
    const body = JSON.stringify(payload);
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: body,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Push] Failed:', response.status, text);
      return false;
    }

    console.log('[Push] Notification sent successfully!');
    return true;
  } catch (error) {
    console.error('[Push] Error:', error);
    return false;
  }
}

async function sendPushToAllSubscribers(
  supabase: any,
  title: string,
  body: string,
  tag: string
): Promise<void> {
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

  if (!vapidPrivateKey || !vapidPublicKey) {
    console.log('[Push] VAPID keys not configured');
    return;
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (error) {
    console.error('[Push] Error fetching subscriptions:', error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('[Push] No subscriptions found');
    return;
  }

  console.log(`[Push] Sending to ${subscriptions.length} subscriber(s)`);

  const payload = { title, body, tag };
  console.log(`[Push] Exact payload being sent:`, JSON.stringify(payload));
  const invalidSubscriptions: string[] = [];

  for (const sub of subscriptions) {
    const success = await sendPushNotification(sub, payload, vapidPublicKey, vapidPrivateKey);
    if (!success) {
      invalidSubscriptions.push(sub.id);
    }
  }

  // Remove invalid subscriptions (expired or unsubscribed)
  if (invalidSubscriptions.length > 0) {
    console.log(`[Push] Removing ${invalidSubscriptions.length} invalid subscription(s)`);
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', invalidSubscriptions);
  }
}

Deno.serve(async (req) => {
  console.log('[webhook-receiver] Request received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    if (!payload.type || !payload.amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let status = payload.status || 'gerado';
    let paidAt = payload.paid_at ? new Date(payload.paid_at).toISOString() : null;

    if (payload.event?.includes('paid') || payload.event?.includes('pago')) {
      status = 'pago';
      paidAt = paidAt || new Date().toISOString();
    } else if (payload.event?.includes('cancel')) {
      status = 'cancelado';
    } else if (payload.event?.includes('expir')) {
      status = 'expirado';
    }

    const normalizedIncomingId = normalizeExternalId(payload.external_id);

    // Prepare data for notifications
    const notificationData = {
      customer_name: payload.customer_name,
      amount: payload.amount,
      type: payload.type,
    };

    if (normalizedIncomingId) {
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, external_id')
        .not('external_id', 'is', null)
        .neq('external_id', '');

      if (fetchError) throw fetchError;

      const existingTransaction = transactions?.find(t => {
        const normalizedDbId = normalizeExternalId(t.external_id);
        return normalizedDbId === normalizedIncomingId;
      });

      if (existingTransaction) {
        const { data, error } = await supabase
          .from('transactions')
          .update({
            status,
            paid_at: paidAt,
            customer_name: payload.customer_name || undefined,
            customer_email: payload.customer_email || undefined,
            customer_phone: normalizePhone(payload.customer_phone) || undefined,
            metadata: payload.metadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingTransaction.id)
          .select()
          .single();

        if (error) throw error;

        const typeLabel = payload.type === 'boleto' ? 'Boleto' : payload.type === 'pix' ? 'PIX' : 'Cartão';
        const amount = `R$ ${Number(data.amount).toFixed(2).replace('.', ',')}`;
        
        // Send browser push notification
        await sendPushToAllSubscribers(
          supabase,
          `🔔 ${typeLabel} Atualizado`,
          `${payload.customer_name || 'Cliente'} - ${amount}`,
          `transaction-${data.id}`
        );

        // Send WirePusher notification (mobile)
        const wirePusherEventType = getWirePusherEventType(payload.type, status);
        await sendWirePusherNotification(supabase, wirePusherEventType, notificationData);

        return new Response(
          JSON.stringify({ success: true, action: 'updated', transaction_id: data.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        external_id: normalizedIncomingId || payload.external_id,
        type: payload.type,
        status,
        amount: payload.amount,
        description: payload.description,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_phone: normalizePhone(payload.customer_phone),
        customer_document: payload.customer_document,
        metadata: { ...(payload.metadata || {}), boleto_url: payload.boleto_url },
        webhook_source: req.headers.get('user-agent') || 'unknown',
        paid_at: paidAt,
      })
      .select()
      .single();

    if (error) throw error;

    console.log('Transaction created:', data.id, 'amount from DB:', data.amount);

    const typeLabel = payload.type === 'boleto' ? 'Boleto' : payload.type === 'pix' ? 'PIX' : 'Cartão';
    const amount = `R$ ${Number(data.amount).toFixed(2).replace('.', ',')}`;
    console.log('Notification amount formatted:', amount);
    
    // Send browser push notification
    await sendPushToAllSubscribers(
      supabase,
      `🔔 Nova Transação - ${typeLabel}`,
      `${payload.customer_name || 'Cliente'} - ${amount}`,
      `transaction-${data.id}`
    );

    // Send WirePusher notification (mobile)
    const wirePusherEventType = getWirePusherEventType(payload.type, status);
    await sendWirePusherNotification(supabase, wirePusherEventType, notificationData);

    return new Response(
      JSON.stringify({ success: true, action: 'created', transaction_id: data.id }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});