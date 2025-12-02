-- Criar enum para tipos de transação
CREATE TYPE public.transaction_type AS ENUM ('boleto', 'pix', 'cartao');

-- Criar enum para status
CREATE TYPE public.transaction_status AS ENUM ('gerado', 'pago', 'pendente', 'cancelado', 'expirado');

-- Tabela principal de transações
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id TEXT,
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'gerado',
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_document TEXT,
  metadata JSONB DEFAULT '{}',
  webhook_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_external_id ON public.transactions(external_id);

-- Habilitar RLS (webhook endpoint será público, mas leitura requer autenticação)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Política para leitura (usuários autenticados podem ver todas transações)
CREATE POLICY "Authenticated users can view transactions" 
ON public.transactions 
FOR SELECT 
TO authenticated
USING (true);

-- Política para inserção via service role (webhooks)
CREATE POLICY "Service role can insert transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

-- Política para atualização via service role
CREATE POLICY "Service role can update transactions" 
ON public.transactions 
FOR UPDATE 
USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;