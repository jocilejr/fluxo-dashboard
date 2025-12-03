-- Create table for financial settings (tax rate)
CREATE TABLE public.financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_rate numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and update financial settings
CREATE POLICY "Admins can view financial settings"
ON public.financial_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update financial settings"
ON public.financial_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert financial settings"
ON public.financial_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create table for manual revenue entries
CREATE TABLE public.manual_revenues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  received_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.manual_revenues ENABLE ROW LEVEL SECURITY;

-- Only admins can manage manual revenues
CREATE POLICY "Admins can view manual revenues"
ON public.manual_revenues
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert manual revenues"
ON public.manual_revenues
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete manual revenues"
ON public.manual_revenues
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings row
INSERT INTO public.financial_settings (tax_rate) VALUES (0);