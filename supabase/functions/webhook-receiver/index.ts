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

// Send push notifications using web-push library
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

    // Create a new client for this operation
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all push subscriptions
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

    // Format the notification
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

    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo-ov.png',
    });

    // Import web-push dynamically
    const webpush = await import('https://esm.sh/web-push@3.6.7');
    
    webpush.setVapidDetails(
      'mailto:contato@origemviva.com',
      vapidPublicKey,
      vapidPrivateKey
    );

    // Send to each subscription
    for (const sub of subs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        console.log(`Push sent successfully to ${sub.endpoint.substring(0, 50)}...`);
      } catch (pushError: unknown) {
        const err = pushError as { statusCode?: number; message?: string };
        console.error(`Error sending push to ${sub.endpoint}:`, err.message || pushError);
        
        // Remove invalid subscriptions (410 Gone means unsubscribed)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id);
          console.log(`Removed invalid subscription: ${sub.id}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in sendPushNotifications:', error);
  }
}

Deno.serve(async (req) => {
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

        // Send push notification (don't await to not block response)
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

    // Send push notification (don't await to not block response)
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
