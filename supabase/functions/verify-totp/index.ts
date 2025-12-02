import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base32Decode } from "https://deno.land/std@0.190.0/encoding/base32.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateTOTP(secret: string, timestamp?: number): Promise<string> {
  const time = timestamp ?? Math.floor(Date.now() / 1000);
  const counter = Math.floor(time / 30);
  
  // Decode base32 secret
  const secretBytes = base32Decode(secret);
  
  // Convert counter to bytes (8 bytes, big-endian)
  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  
  // HMAC-SHA1 - convert to ArrayBuffer to fix type issue
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, counterBytes);
  const hash = new Uint8Array(signature);
  
  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  
  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  
  // Check current time window and one before/after for clock drift
  for (let i = -1; i <= 1; i++) {
    const timestamp = now + (i * 30);
    const expected = await generateTOTP(secret, timestamp);
    if (expected === code) {
      return true;
    }
  }
  
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, code } = await req.json();

    if (!userId || !code) {
      console.error("Missing userId or code");
      return new Response(
        JSON.stringify({ valid: false, error: "userId e code são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get user's TOTP secret
    const { data: totpData, error: fetchError } = await supabaseAdmin
      .from("user_totp_secrets")
      .select("secret, verified")
      .eq("user_id", userId)
      .single();

    if (fetchError || !totpData) {
      console.error("TOTP secret not found for user:", userId);
      return new Response(
        JSON.stringify({ valid: false, error: "TOTP não configurado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the code
    const isValid = await verifyTOTP(totpData.secret, code);

    if (!isValid) {
      console.log("Invalid TOTP code for user:", userId);
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If this is first verification, mark as verified
    if (!totpData.verified) {
      await supabaseAdmin
        .from("user_totp_secrets")
        .update({ verified: true })
        .eq("user_id", userId);
      
      console.log("TOTP verified and activated for user:", userId);
    }

    console.log("TOTP code verified successfully for user:", userId);

    return new Response(
      JSON.stringify({ valid: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-totp function:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
