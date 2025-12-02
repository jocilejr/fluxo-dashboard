import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base32Encode } from "https://deno.land/std@0.190.0/encoding/base32.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSecret(): string {
  const array = new Uint8Array(20);
  crypto.getRandomValues(array);
  return base32Encode(array).replace(/=/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email } = await req.json();

    if (!userId || !email) {
      console.error("Missing userId or email");
      return new Response(
        JSON.stringify({ error: "userId e email são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user already has a verified TOTP secret
    const { data: existingSecret } = await supabaseAdmin
      .from("user_totp_secrets")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existingSecret?.verified) {
      // User already has TOTP setup, just return success without new secret
      return new Response(
        JSON.stringify({ 
          alreadySetup: true,
          message: "TOTP já configurado" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate new secret
    const secret = generateSecret();
    const issuer = "Dashboard";
    const otpauthUrl = `otpauth://totp/${issuer}:${encodeURIComponent(email)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    // Upsert the secret (insert or update)
    const { error: upsertError } = await supabaseAdmin
      .from("user_totp_secrets")
      .upsert({
        user_id: userId,
        secret,
        verified: false,
      }, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error upserting TOTP secret:", upsertError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar secret" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("TOTP secret generated for user:", userId);

    return new Response(
      JSON.stringify({ 
        secret,
        otpauthUrl,
        message: "Escaneie o QR code com o Google Authenticator" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in setup-totp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
