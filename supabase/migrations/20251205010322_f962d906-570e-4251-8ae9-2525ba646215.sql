-- Allow authenticated users to update transactions (for phone number editing)
CREATE POLICY "Users can update transactions" 
ON public.transactions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);