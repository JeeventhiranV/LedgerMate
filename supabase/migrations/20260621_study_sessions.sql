-- Study session tracking
CREATE TABLE IF NOT EXISTS study_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  duration_seconds INT         DEFAULT 0,
  page             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user
  ON study_sessions (user_id, started_at DESC);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_sessions_select"
  ON study_sessions FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "users_own_sessions_insert"
  ON study_sessions FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_own_sessions_update"
  ON study_sessions FOR UPDATE  USING (auth.uid() = user_id);
