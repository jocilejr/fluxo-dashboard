-- Table to store daily typebot lead statistics
CREATE TABLE public.typebot_daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  typebot_id TEXT NOT NULL,
  typebot_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_leads INTEGER NOT NULL DEFAULT 0,
  completed_leads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(typebot_id, date)
);

-- Enable RLS
ALTER TABLE public.typebot_daily_stats ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users to view
CREATE POLICY "Authenticated users can view typebot stats"
ON public.typebot_daily_stats
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Service role can manage all data
CREATE POLICY "Service role can manage typebot stats"
ON public.typebot_daily_stats
FOR ALL
USING (true)
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_typebot_daily_stats_date ON public.typebot_daily_stats(date DESC);
CREATE INDEX idx_typebot_daily_stats_typebot_id ON public.typebot_daily_stats(typebot_id);

-- Trigger for updated_at
CREATE TRIGGER update_typebot_daily_stats_updated_at
BEFORE UPDATE ON public.typebot_daily_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();