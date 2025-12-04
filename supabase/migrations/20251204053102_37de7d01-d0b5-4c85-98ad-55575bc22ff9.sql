-- Create table to store daily group statistics history
CREATE TABLE public.group_statistics_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  entries INTEGER NOT NULL DEFAULT 0,
  exits INTEGER NOT NULL DEFAULT 0,
  current_members INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index to ensure one record per group per day
CREATE UNIQUE INDEX idx_group_stats_history_group_date ON public.group_statistics_history(group_id, date);

-- Enable RLS
ALTER TABLE public.group_statistics_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage history
CREATE POLICY "Admins can manage group statistics history"
ON public.group_statistics_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view history
CREATE POLICY "Users can view group statistics history"
ON public.group_statistics_history
FOR SELECT
USING (auth.uid() IS NOT NULL);