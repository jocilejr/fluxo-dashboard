-- Allow regular users to view transactions
CREATE POLICY "Users can view transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);