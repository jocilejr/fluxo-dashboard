-- Create table for PIX/Card recovery message settings
CREATE TABLE public.pix_card_recovery_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL DEFAULT 'Olá {nome}! Notamos que seu pagamento de {valor} está pendente. Podemos ajudar?',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pix_card_recovery_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can manage pix_card_recovery_settings"
ON public.pix_card_recovery_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view settings
CREATE POLICY "Users can view pix_card_recovery_settings"
ON public.pix_card_recovery_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO public.pix_card_recovery_settings (message) VALUES 
('Olá {nome}! Notamos que seu pagamento de {valor} está pendente. Podemos ajudar?');

-- Trigger for updated_at
CREATE TRIGGER update_pix_card_recovery_settings_updated_at
BEFORE UPDATE ON public.pix_card_recovery_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();