import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for inserting data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { rows } = await req.json();

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum dado para importar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[import-abandoned-events] Importando ${rows.length} eventos`);

    // Map and validate rows
    const eventsToInsert = rows.map((row: any) => {
      // Parse amount
      let amount = null;
      if (row.amount) {
        amount = parseFloat(String(row.amount).replace(",", "."));
        if (isNaN(amount)) amount = null;
      }

      // Parse metadata
      let metadata = {};
      if (row.metadata) {
        try {
          metadata = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
        } catch {
          metadata = {};
        }
      }

      return {
        event_type: row.event_type || "cart_abandoned",
        customer_name: row.customer_name || null,
        customer_email: row.customer_email || null,
        customer_phone: row.customer_phone ? String(row.customer_phone).replace(/^\+/, "") : null,
        customer_document: row.customer_document || null,
        amount,
        product_name: row.product_name || null,
        funnel_stage: row.funnel_stage || null,
        error_message: row.error_message || null,
        utm_source: row.utm_source || null,
        utm_medium: row.utm_medium || null,
        utm_campaign: row.utm_campaign || null,
        utm_term: row.utm_term || null,
        utm_content: row.utm_content || null,
        created_at: row.created_at || new Date().toISOString(),
        metadata,
      };
    });

    // Insert in batches of 100
    const batchSize = 100;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < eventsToInsert.length; i += batchSize) {
      const batch = eventsToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from("abandoned_events")
        .insert(batch)
        .select("id");

      if (error) {
        console.error(`[import-abandoned-events] Erro no batch ${i}:`, error);
        errors += batch.length;
      } else {
        imported += data?.length || 0;
      }
    }

    console.log(`[import-abandoned-events] Importação concluída: ${imported} sucesso, ${errors} erros`);

    return new Response(
      JSON.stringify({ imported, errors, total: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[import-abandoned-events] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
