-- Tabela de produtos para entrega digital
CREATE TABLE public.delivery_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  whatsapp_number TEXT NOT NULL,
  whatsapp_message TEXT,
  delivery_webhook_url TEXT,
  page_title TEXT DEFAULT 'Preparando sua entrega...',
  page_message TEXT DEFAULT 'Você será redirecionado em instantes',
  page_logo TEXT,
  redirect_delay INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de pixels por produto
CREATE TABLE public.delivery_pixels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.delivery_products(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  pixel_id TEXT NOT NULL,
  access_token TEXT,
  event_name TEXT DEFAULT 'Purchase',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de controle de acessos únicos
CREATE TABLE public.delivery_accesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.delivery_products(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pixel_fired BOOLEAN DEFAULT false,
  webhook_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, phone)
);

-- Índices para performance
CREATE INDEX idx_delivery_products_slug ON public.delivery_products(slug);
CREATE INDEX idx_delivery_accesses_product_phone ON public.delivery_accesses(product_id, phone);
CREATE INDEX idx_delivery_pixels_product ON public.delivery_pixels(product_id);

-- Enable RLS
ALTER TABLE public.delivery_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_accesses ENABLE ROW LEVEL SECURITY;

-- Policies para delivery_products (admin gerencia, users visualizam)
CREATE POLICY "Admins can manage delivery products"
  ON public.delivery_products FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view delivery products"
  ON public.delivery_products FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policies para delivery_pixels
CREATE POLICY "Admins can manage delivery pixels"
  ON public.delivery_pixels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view delivery pixels"
  ON public.delivery_pixels FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Policies para delivery_accesses (service role pode inserir/atualizar, users visualizam)
CREATE POLICY "Service role can manage delivery accesses"
  ON public.delivery_accesses FOR ALL
  USING (true);

CREATE POLICY "Users can view delivery accesses"
  ON public.delivery_accesses FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at
CREATE TRIGGER update_delivery_products_updated_at
  BEFORE UPDATE ON public.delivery_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();