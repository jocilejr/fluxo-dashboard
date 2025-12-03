import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

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

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/^\+/, '');
}

// deno-lint-ignore no-explicit-any
async function sendPushNotifications(
  supabase: any,
  transactionData: { type: string; status: string; amount: number; customer_name?: string }
) {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('VAPID keys not configured, skipping push notifications');
    return;
  }

  // Set VAPID details
  webpush.setVapidDetails(
    'mailto:admin@origemviva.com',
    vapidPublicKey,
    vapidPrivateKey
  );

  // Get all push subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');

  if (error) {
    console.error('Error fetching subscriptions:', error.message);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('No push subscriptions found');
    return;
  }

  const typeNames: Record<string, string> = {
    boleto: 'Boleto',
    pix: 'PIX',
    cartao: 'Cartão',
  };

  const statusNames: Record<string, string> = {
    gerado: 'gerado',
    pago: 'pago',
    pendente: 'pendente',
    cancelado: 'cancelado',
    expirado: 'expirado',
  };

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(transactionData.amount);

  const title = `${typeNames[transactionData.type] || transactionData.type} ${statusNames[transactionData.status] || transactionData.status}`;
  const body = transactionData.customer_name
    ? `${transactionData.customer_name} - ${formattedAmount}`
    : `Valor: ${formattedAmount}`;

  const payload = JSON.stringify({
    title,
    body,
    icon: '/logo-ov.png',
  });

  console.log(`Sending push notifications to ${subscriptions.length} subscribers`);

  // Send to all subscribers
  const results = await Promise.allSettled(
    subscriptions.map(async (sub: { endpoint: string; p256dh: string; auth: string }) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        await webpush.sendNotification(pushSubscription, payload);
        return true;
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        console.error(`Push failed for ${sub.endpoint.substring(0, 50)}:`, error.message);
        // Remove invalid subscriptions
        if (error.statusCode === 404 || error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
          console.log('Removed invalid subscription');
        }
        return false;
      }
    })
  );

  const successful = results.filter((r) => r.status === 'fulfilled' && r.value).length;
  console.log(`Push notifications: ${successful}/${subscriptions.length} successful`);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    console.log('Webhook received:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.type || !payload.amount) {
      console.error('Missing required fields: type or amount');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine status based on event
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

    // Check if transaction exists (update) or create new
    if (payload.external_id) {
      const { data: existing } = await supabase
        .from('transactions')
        .select('id')
        .eq('external_id', payload.external_id)
        .maybeSingle();

      if (existing) {
        // Update existing transaction
        const { data, error } = await supabase
          .from('transactions')
          .update({
            status,
            paid_at: paidAt,
            metadata: payload.metadata,
            updated_at: new Date().toISOString(),
          })
          .eq('external_id', payload.external_id)
          .select()
          .single();

        if (error) {
          console.error('Error updating transaction:', error);
          throw error;
        }

        console.log('Transaction updated:', data.id);

        // Send push notifications
        await sendPushNotifications(supabase, {
          type: payload.type,
          status,
          amount: payload.amount,
          customer_name: payload.customer_name,
        });

        return new Response(
          JSON.stringify({ success: true, action: 'updated', transaction_id: data.id }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert new transaction
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        external_id: payload.external_id,
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

    // Send push notifications
    await sendPushNotifications(supabase, {
      type: payload.type,
      status,
      amount: payload.amount,
      customer_name: payload.customer_name,
    });

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
