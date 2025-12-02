-- Create table to store TOTP secrets for users
CREATE TABLE public.user_totp_secrets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_totp_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions)
CREATE POLICY "Service role only" ON public.user_totp_secrets
  FOR ALL USING (false);

-- Drop old OTP codes table since we won't use email OTP anymore
DROP TABLE IF EXISTS public.otp_codes;

-- Drop cleanup function
DROP FUNCTION IF EXISTS public.cleanup_expired_otp_codes();