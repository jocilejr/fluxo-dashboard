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

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/^\+/, '');
}

function normalizeExternalId(externalId?: string): string | undefined {
  if (!externalId) return undefined;
  return externalId.replace(/[\s.\-\/]/g, '');
}

async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; tag?: string },
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<boolean> {
  try {
    // Import web-push compatible library for Deno
    const { default: webpush } = await import('https://esm.sh/web-push@3.6.7');
    
    webpush.setVapidDetails(
      'mailto:admin@origemviva.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );
    
    console.log('[Push] Notification sent to:', subscription.endpoint.substring(0, 50));
    return true;
  } catch (error) {
    console.error('[Push] Failed to send:', error);
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
    console.log('[Push] VAPID keys not configured, skipping push');
    return;
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');

  if (error) {
    console.error('[Push] Error fetching subscriptions:', error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('[Push] No push subscriptions found');
    return;
  }

  console.log(`[Push] Sending to ${subscriptions.length} subscriber(s)`);

  const payload = { title, body, tag };

  for (const sub of subscriptions) {
    await sendPushNotification(sub, payload, vapidPrivateKey, vapidPublicKey);
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

    let action = 'created';
    let transactionId = '';

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
        action = 'updated';
        transactionId = data.id;

        // Send push notification for updates (e.g., boleto paid)
        const typeLabel = payload.type === 'boleto' ? 'Boleto' : payload.type === 'pix' ? 'PIX' : 'Cartão';
        const amount = (payload.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        await sendPushToAllSubscribers(
          supabase,
          `🔔 ${typeLabel} Atualizado`,
          `${payload.customer_name || 'Cliente'} - ${amount} - ${status}`,
          `transaction-${data.id}`
        );

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

    // Send push notification for new transactions
    const typeLabel = payload.type === 'boleto' ? 'Boleto' : payload.type === 'pix' ? 'PIX' : 'Cartão';
    const amount = (payload.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    await sendPushToAllSubscribers(
      supabase,
      `🔔 Nova Transação - ${typeLabel}`,
      `${payload.customer_name || 'Cliente'} - ${amount}`,
      `transaction-${data.id}`
    );

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
