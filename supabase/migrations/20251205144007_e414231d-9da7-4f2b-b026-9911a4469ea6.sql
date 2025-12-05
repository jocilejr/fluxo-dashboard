-- Tabela para configurações de entrega (domínio personalizado)
CREATE TABLE public.delivery_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  custom_domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados
CREATE POLICY "Authenticated users can manage delivery settings" 
ON public.delivery_settings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Inserir registro padrão
INSERT INTO public.delivery_settings (custom_domain) VALUES (NULL);