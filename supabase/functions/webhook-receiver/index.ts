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
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/^\+/, '');
}

function normalizeExternalId(externalId?: string): string | undefined {
  if (!externalId) return undefined;
  return externalId.replace(/[\s.\-\/]/g, '');
}

// Base64url encoding/decoding utilities
function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return new Uint8Array([...binary].map(c => c.charCodeAt(0)));
}

// Create VAPID JWT token
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string,
  publicKeyBase64: string,
  expiration: number
): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  const publicKeyBytes = base64UrlDecode(publicKeyBase64);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    d: base64UrlEncode(privateKeyBytes),
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBytes = new Uint8Array(signature);
  const signatureB64 = base64UrlEncode(signatureBytes);

  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt payload for web push
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const userPublicKey = base64UrlDecode(p256dhKey);
  const userAuth = base64UrlDecode(authSecret);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey('raw', localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  const userPublicCryptoKey = await crypto.subtle.importKey(
    'raw',
    userPublicKey.buffer.slice(userPublicKey.byteOffset, userPublicKey.byteOffset + userPublicKey.byteLength) as ArrayBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecret = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: userPublicCryptoKey },
    localKeyPair.privateKey,
    256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const userAuthBuffer = userAuth.buffer.slice(userAuth.byteOffset, userAuth.byteOffset + userAuth.byteLength) as ArrayBuffer;
  const ikm = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: userAuthBuffer,
      info: new TextEncoder().encode('Content-Encoding: auth\0'),
    },
    sharedSecretKey,
    256
  );

  const prkKey = await crypto.subtle.importKey(
    'raw',
    ikm,
    { name: 'HKDF' },
    false,
    ['deriveBits']
  );

  const keyInfo = new TextEncoder().encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = new TextEncoder().encode('Content-Encoding: nonce\0');

  const contentKey = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo },
    prkKey,
    128
  );

  const nonce = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo },
    prkKey,
    96
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    contentKey,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 0x02;

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    paddedPayload
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60;

    const jwt = await createVapidJwt(
      audience,
      'mailto:contato@origemviva.com',
      vapidPrivateKey,
      vapidPublicKey,
      expiration
    );

    const { ciphertext, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    const recordSize = 4096;
    const header = new Uint8Array(21 + localPublicKey.length);
    header.set(salt, 0);
    header[16] = (recordSize >> 24) & 0xff;
    header[17] = (recordSize >> 16) & 0xff;
    header[18] = (recordSize >> 8) & 0xff;
    header[19] = recordSize & 0xff;
    header[20] = localPublicKey.length;
    header.set(localPublicKey, 21);

    const body = new Uint8Array(header.length + ciphertext.length);
    body.set(header, 0);
    body.set(ciphertext, header.length);

    console.log('Sending to FCM endpoint:', subscription.endpoint);
    console.log('Payload being sent:', payload);
    console.log('Body length:', body.length);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body,
    });

    const responseText = await response.text();
    console.log('FCM Response status:', response.status);
    console.log('FCM Response body:', responseText);
    console.log('FCM Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    if (!response.ok) {
      console.error(`Push failed: ${response.status} - ${responseText}`);
      return { success: false, statusCode: response.status, error: responseText };
    }

    return { success: true, statusCode: response.status };
  } catch (error) {
    console.error('Error sending push:', error);
    return { success: false, error: String(error) };
  }
}

async function sendPushNotifications(
  supabaseUrl: string,
  supabaseServiceKey: string,
  transactionType: string,
  amount: number,
  status: string,
  customerName?: string
) {
  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log('VAPID keys not configured, skipping push notifications');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (error) {
      console.error('Error fetching push subscriptions:', error);
      return;
    }

    const subs = subscriptions as PushSubscription[] | null;
    if (!subs || subs.length === 0) {
      console.log('No push subscriptions found');
      return;
    }

    console.log(`Sending push notifications to ${subs.length} subscribers`);

    const typeLabels: Record<string, string> = {
      boleto: 'Boleto',
      pix: 'PIX',
      cartao: 'Cartão',
    };

    const statusLabels: Record<string, string> = {
      gerado: 'gerado',
      pago: 'pago',
      pendente: 'pendente',
      cancelado: 'cancelado',
      expirado: 'expirado',
    };

    const formattedAmount = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

    const title = `${typeLabels[transactionType] || transactionType} ${statusLabels[status] || status}`;
    const body = customerName 
      ? `${customerName} - ${formattedAmount}`
      : `Nova transação: ${formattedAmount}`;

    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/logo-ov.png',
    });

    for (const sub of subs) {
      try {
        const result = await sendPushNotification(sub, notificationPayload, vapidPublicKey, vapidPrivateKey);
        
        if (result.success) {
          console.log(`Push sent successfully to ${sub.endpoint.substring(0, 50)}...`);
        } else {
          console.error(`Push failed for ${sub.endpoint}: ${result.error}`);
          
          if (result.statusCode === 410 || result.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
            console.log(`Removed invalid subscription: ${sub.id}`);
          }
        }
      } catch (pushError) {
        console.error(`Error sending push to ${sub.endpoint}:`, pushError);
      }
    }
  } catch (error) {
    console.error('Error in sendPushNotifications:', error);
  }
}

Deno.serve(async (req) => {
  console.log('[webhook-receiver v2] Request received');
  
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
      console.error('Missing required fields: type or amount');
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
    console.log('Normalized incoming external_id:', normalizedIncomingId);

    if (normalizedIncomingId) {
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, external_id')
        .not('external_id', 'is', null)
        .neq('external_id', '');

      if (fetchError) {
        console.error('Error fetching transactions:', fetchError);
        throw fetchError;
      }

      const existingTransaction = transactions?.find(t => {
        const normalizedDbId = normalizeExternalId(t.external_id);
        return normalizedDbId === normalizedIncomingId;
      });

      if (existingTransaction) {
        console.log('Found existing transaction:', existingTransaction.id);
        
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

        if (error) {
          console.error('Error updating transaction:', error);
          throw error;
        }

        console.log('Transaction updated:', data.id);

        sendPushNotifications(supabaseUrl, supabaseServiceKey, payload.type, payload.amount, status, payload.customer_name);

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

    if (error) {
      console.error('Error inserting transaction:', error);
      throw error;
    }

    console.log('Transaction created:', data.id);

    sendPushNotifications(supabaseUrl, supabaseServiceKey, payload.type, payload.amount, status, payload.customer_name);

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