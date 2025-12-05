-- Enable REPLICA IDENTITY FULL for realtime to work properly with UPDATE events
ALTER TABLE public.transactions REPLICA IDENTITY FULL;