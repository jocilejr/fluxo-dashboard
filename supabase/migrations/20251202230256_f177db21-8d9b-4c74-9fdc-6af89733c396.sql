-- Add customer_phone column to transactions table
ALTER TABLE public.transactions
ADD COLUMN customer_phone TEXT;