-- Create wirepusher_settings table
CREATE TABLE public.wirepusher_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wirepusher_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage wirepusher settings" 
ON public.wirepusher_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view wirepusher settings" 
ON public.wirepusher_settings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create wirepusher_notification_templates table
CREATE TABLE public.wirepusher_notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wirepusher_notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage wirepusher templates" 
ON public.wirepusher_notification_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view wirepusher templates" 
ON public.wirepusher_notification_templates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Insert default settings
INSERT INTO public.wirepusher_settings (device_id, is_enabled) 
VALUES ('yLy9mpz45', true);

-- Insert default templates
INSERT INTO public.wirepusher_notification_templates (event_type, title, message, notification_type) VALUES
  ('boleto_gerado', '📄 Novo Boleto', '{nome} - {valor}', 'boleto'),
  ('boleto_pago', '✅ Boleto Pago', '{nome} pagou {valor}', 'pagamento'),
  ('pix_gerado', '🔷 PIX Gerado', '{nome} - {valor}', 'pix'),
  ('pix_pago', '✅ PIX Pago', '{nome} pagou {valor}', 'pagamento'),
  ('pix_pendente', '⏳ PIX Pendente', '{nome} - {valor}', 'pendente'),
  ('cartao_gerado', '💳 Novo Pedido', '{nome} - {valor}', 'cartao'),
  ('cartao_pago', '✅ Cartão Pago', '{nome} pagou {valor}', 'pagamento'),
  ('cartao_pendente', '⏳ Cartão Pendente', '{nome} - {valor}', 'pendente');

-- Add triggers for updated_at
CREATE TRIGGER update_wirepusher_settings_updated_at
BEFORE UPDATE ON public.wirepusher_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wirepusher_templates_updated_at
BEFORE UPDATE ON public.wirepusher_notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();