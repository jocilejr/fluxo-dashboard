-- Create table for boleto recovery templates
CREATE TABLE public.boleto_recovery_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boleto_recovery_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can manage recovery templates"
ON public.boleto_recovery_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view templates
CREATE POLICY "Users can view recovery templates"
ON public.boleto_recovery_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_boleto_recovery_templates_updated_at
BEFORE UPDATE ON public.boleto_recovery_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();