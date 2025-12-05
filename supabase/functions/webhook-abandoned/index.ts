import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AbandonedEventPayload {
  event_type?: 'cart_abandoned' | 'boleto_failed';
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_document?: string;
  amount?: number | string;
  product_name?: string;
  funnel_stage?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  return phone.replace(/^\+/, '').replace(/\D/g, '');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: AbandonedEventPayload = await req.json();
    console.log('Abandoned event webhook received:', JSON.stringify(payload));

    // Parse amount
    let amount: number | null = null;
    if (payload.amount !== undefined && payload.amount !== null) {
      if (typeof payload.amount === 'string') {
        const cleanAmount = payload.amount.replace(/[^\d.,]/g, '').replace(',', '.');
        amount = parseFloat(cleanAmount);
      } else {
        amount = Number(payload.amount);
      }
      if (isNaN(amount)) amount = null;
    }

    // Insert the abandoned event
    const { data, error } = await supabase
      .from('abandoned_events')
      .insert({
        event_type: payload.event_type || 'cart_abandoned',
        customer_name: payload.customer_name || null,
        customer_phone: normalizePhone(payload.customer_phone),
        customer_email: payload.customer_email || null,
        customer_document: payload.customer_document || null,
        amount: amount,
        product_name: payload.product_name || null,
        funnel_stage: payload.funnel_stage || null,
        utm_source: payload.utm_source || null,
        utm_medium: payload.utm_medium || null,
        utm_campaign: payload.utm_campaign || null,
        utm_term: payload.utm_term || null,
        utm_content: payload.utm_content || null,
        error_message: payload.error_message || null,
        metadata: payload.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting abandoned event:', error);
      throw error;
    }

    console.log('Abandoned event created successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Error processing abandoned event webhook:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
