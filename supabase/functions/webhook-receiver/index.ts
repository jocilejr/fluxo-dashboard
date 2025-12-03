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

function normalizePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/^\+/, '');
}

// Normalize external_id by removing dots, spaces, dashes and other formatting
function normalizeExternalId(externalId?: string): string | undefined {
  if (!externalId) return undefined;
  return externalId.replace(/[\s.\-\/]/g, '');
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

    // Normalize the incoming external_id
    const normalizedIncomingId = normalizeExternalId(payload.external_id);
    console.log('Normalized incoming external_id:', normalizedIncomingId);

    // Check if transaction exists (update) or create new
    if (normalizedIncomingId) {
      // Get all transactions with external_id to find a match
      const { data: transactions, error: fetchError } = await supabase
        .from('transactions')
        .select('id, external_id')
        .not('external_id', 'is', null)
        .neq('external_id', '');

      if (fetchError) {
        console.error('Error fetching transactions:', fetchError);
        throw fetchError;
      }

      // Find matching transaction by normalized external_id
      const existingTransaction = transactions?.find(t => {
        const normalizedDbId = normalizeExternalId(t.external_id);
        return normalizedDbId === normalizedIncomingId;
      });

      if (existingTransaction) {
        console.log('Found existing transaction:', existingTransaction.id);
        
        // Update existing transaction
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
