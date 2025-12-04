
-- Table for boleto default settings (expiration days)
CREATE TABLE public.boleto_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  default_expiration_days INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boleto_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage boleto settings" ON public.boleto_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view boleto settings" ON public.boleto_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Insert default row
INSERT INTO public.boleto_settings (default_expiration_days) VALUES (3);

-- Table for recovery rules (régua de cobrança)
CREATE TABLE public.boleto_recovery_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('days_after_generation', 'days_before_due', 'days_after_due')),
  days INTEGER NOT NULL,
  message TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boleto_recovery_rules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage recovery rules" ON public.boleto_recovery_rules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view recovery rules" ON public.boleto_recovery_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_boleto_settings_updated_at
  BEFORE UPDATE ON public.boleto_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boleto_recovery_rules_updated_at
  BEFORE UPDATE ON public.boleto_recovery_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for tracking contacts
CREATE TABLE public.boleto_recovery_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.boleto_recovery_rules(id) ON DELETE SET NULL,
  contacted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contact_method TEXT NOT NULL DEFAULT 'whatsapp',
  notes TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boleto_recovery_contacts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage recovery contacts" ON public.boleto_recovery_contacts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view recovery contacts" ON public.boleto_recovery_contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert recovery contacts" ON public.boleto_recovery_contacts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default recovery rules
INSERT INTO public.boleto_recovery_rules (name, rule_type, days, message, priority) VALUES
  ('1 dia após geração', 'days_after_generation', 1, '{saudação}, {primeiro_nome}! Seu boleto no valor de {valor} foi gerado. Posso ajudar com alguma dúvida?', 1),
  ('3 dias após geração', 'days_after_generation', 3, '{saudação}, {primeiro_nome}! Notei que seu boleto de {valor} ainda está pendente. Precisa de ajuda?', 2),
  ('1 dia antes do vencimento', 'days_before_due', 1, '{saudação}, {primeiro_nome}! Seu boleto de {valor} vence amanhã. Não esqueça de efetuar o pagamento!', 3),
  ('Dia do vencimento', 'days_before_due', 0, '{saudação}, {primeiro_nome}! Seu boleto de {valor} vence hoje! Efetue o pagamento para evitar juros.', 4),
  ('1 dia após vencimento', 'days_after_due', 1, '{saudação}, {primeiro_nome}! Seu boleto de {valor} venceu ontem. Posso gerar um novo boleto atualizado?', 5);
