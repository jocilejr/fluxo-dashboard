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

    console.log(`[import-transactions] Importando ${rows.length} transações`);

    // Map and validate rows
    const validTypes = ["boleto", "pix", "cartao"];
    const validStatuses = ["gerado", "pago", "pendente", "cancelado", "expirado"];

    const transactionsToInsert = rows.map((row: any, index: number) => {
      // Normalize type
      let type = (row.type || "boleto").toLowerCase().trim();
      if (!validTypes.includes(type)) type = "boleto";

      // Normalize status
      let status = (row.status || "gerado").toLowerCase().trim();
      if (!validStatuses.includes(status)) status = "gerado";

      // Parse amount
      let amount = parseFloat(String(row.amount || "0").replace(",", "."));
      if (isNaN(amount)) amount = 0;

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
        type,
        status,
        amount,
        customer_name: row.customer_name || null,
        customer_email: row.customer_email || null,
        customer_phone: row.customer_phone ? String(row.customer_phone).replace(/^\+/, "") : null,
        customer_document: row.customer_document || null,
        description: row.description || null,
        external_id: row.external_id || null,
        paid_at: row.paid_at || null,
        created_at: row.created_at || new Date().toISOString(),
        webhook_source: row.webhook_source || "import",
        metadata,
      };
    });

    // Insert in batches of 100
    const batchSize = 100;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < transactionsToInsert.length; i += batchSize) {
      const batch = transactionsToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from("transactions")
        .insert(batch)
        .select("id");

      if (error) {
        console.error(`[import-transactions] Erro no batch ${i}:`, error);
        errors += batch.length;
      } else {
        imported += data?.length || 0;
      }
    }

    console.log(`[import-transactions] Importação concluída: ${imported} sucesso, ${errors} erros`);

    return new Response(
      JSON.stringify({ imported, errors, total: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[import-transactions] Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
