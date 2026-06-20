-- Add push_subscription column to user_profiles
-- Stores the browser PushSubscription JSON (endpoint + keys)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS push_subscription JSONB DEFAULT NULL;

-- Index for quick lookup when sending pushes
CREATE INDEX IF NOT EXISTS idx_user_profiles_push_sub
  ON user_profiles (id)
  WHERE push_subscription IS NOT NULL;
