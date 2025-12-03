-- Add unique constraint on (user_id, endpoint) to allow multiple devices per user
-- First, remove any duplicate entries keeping only the latest
DELETE FROM push_subscriptions a
USING push_subscriptions b
WHERE a.id < b.id 
  AND a.user_id = b.user_id 
  AND a.endpoint = b.endpoint;

-- Create unique index for upsert to work correctly
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_idx 
ON push_subscriptions(user_id, endpoint);