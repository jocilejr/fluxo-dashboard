-- Create table for abandoned carts and failed boleto generation events
CREATE TABLE public.abandoned_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'cart_abandoned', -- 'cart_abandoned' or 'boleto_failed'
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_document text,
  amount numeric,
  product_name text,
  funnel_stage text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  error_message text, -- for boleto failures
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.abandoned_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view abandoned events"
ON public.abandoned_events
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role can insert abandoned events"
ON public.abandoned_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update abandoned events"
ON public.abandoned_events
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete abandoned events"
ON public.abandoned_events
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_abandoned_events_updated_at
BEFORE UPDATE ON public.abandoned_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.abandoned_events;