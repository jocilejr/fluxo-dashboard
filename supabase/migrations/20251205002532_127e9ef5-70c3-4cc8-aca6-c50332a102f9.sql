-- Create table to track PIX/Card recovery clicks
CREATE TABLE public.pix_card_recovery_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  clicked_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_pix_card_recovery_clicks_transaction_id ON public.pix_card_recovery_clicks(transaction_id);

-- Enable RLS
ALTER TABLE public.pix_card_recovery_clicks ENABLE ROW LEVEL SECURITY;

-- Users can view all recovery clicks (to show total count)
CREATE POLICY "Users can view recovery clicks"
ON public.pix_card_recovery_clicks
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can insert their own clicks
CREATE POLICY "Users can insert recovery clicks"
ON public.pix_card_recovery_clicks
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can manage all clicks
CREATE POLICY "Admins can manage recovery clicks"
ON public.pix_card_recovery_clicks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));