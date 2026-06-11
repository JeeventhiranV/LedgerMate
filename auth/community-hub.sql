-- ══════════════════════════════════════════════════════════════════════════
--  Community Hub — Complete Schema
--  Run ONCE in Supabase SQL Editor after study-features.sql
-- ══════════════════════════════════════════════════════════════════════════

-- ── 1. Profiles ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_profiles (
  user_id      UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL DEFAULT 'Learner',
  avatar_color TEXT        NOT NULL DEFAULT '#4f8ef7',
  bio          TEXT,
  reputation   INTEGER     NOT NULL DEFAULT 0,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.community_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own profile"           ON public.community_profiles FOR ALL    USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.community_create_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  colors TEXT[] := ARRAY['#4f8ef7','#8b5cf6','#06d6a0','#f59e0b','#f43f5e','#22d3ee','#fb923c','#ec4899'];
  name   TEXT;
BEGIN
  name := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email,'@',1), 'Learner');
  INSERT INTO public.community_profiles(user_id, display_name, avatar_color)
  VALUES (NEW.id, name, colors[1 + (FLOOR(RANDOM()*8))::INT])
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_community_profile ON auth.users;
CREATE TRIGGER trg_community_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.community_create_profile();

-- ── 2. Topics ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_topics (
  id      SERIAL  PRIMARY KEY,
  slug    TEXT    NOT NULL UNIQUE,
  label   TEXT    NOT NULL,
  icon    TEXT    NOT NULL DEFAULT '📚',
  color   TEXT    NOT NULL DEFAULT '#4f8ef7',
  modules TEXT[]  NOT NULL DEFAULT '{}'
);
ALTER TABLE public.community_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics viewable by all" ON public.community_topics FOR SELECT TO authenticated USING (true);

INSERT INTO public.community_topics (slug, label, icon, color, modules) VALUES
  ('java',         'Java',             '☕', '#f59e0b', '{java,ipk}'),
  ('spring',       'Spring Boot',      '🌱', '#22c55e', '{java,ipk}'),
  ('microservices','Microservices',    '🔧', '#0ea5e9', '{java,ipk}'),
  ('sql',          'SQL & Databases',  '🗄️', '#3b82f6', '{java,ipk}'),
  ('kafka',        'Kafka',            '📨', '#7c3aed', '{java,ipk}'),
  ('angular',      'Angular',          '🅰️', '#ef4444', '{ipk}'),
  ('react',        'React & Frontend', '⚛️', '#4f8ef7', '{react,ipk}'),
  ('aws',          'AWS & Cloud',      '☁️', '#f59e0b', '{ipk}'),
  ('system-design','System Design',    '🏗️', '#8b5cf6', '{ipk,dsa}'),
  ('dsa',          'DSA',              '🧮', '#06d6a0', '{dsa,ipk}'),
  ('hr',           'HR & Behavioural', '🤝', '#ec4899', '{hr}'),
  ('general',      'General',          '💬', '#94a3b8', '{dsa,java,react,hr,ipk,general}')
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Discussions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_discussions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id   INTEGER     REFERENCES public.community_topics(id),
  module     TEXT        NOT NULL DEFAULT 'general',
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  pinned     BOOLEAN     NOT NULL DEFAULT false,
  views      INTEGER     NOT NULL DEFAULT 0,
  like_count INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Discussions readable"      ON public.community_discussions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create discussions"  ON public.community_discussions FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own"        ON public.community_discussions FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own"        ON public.community_discussions FOR DELETE USING (auth.uid() = author_id);
CREATE INDEX IF NOT EXISTS idx_discussions_module ON public.community_discussions(module, created_at DESC);

-- ── 4. Questions (Doubts) ─────────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS community_difficulty AS ENUM ('beginner','intermediate','advanced');
CREATE TYPE IF NOT EXISTS community_qstatus   AS ENUM ('open','answered','closed');

CREATE TABLE IF NOT EXISTS public.community_questions (
  id                 UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id          UUID                 NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id           INTEGER              REFERENCES public.community_topics(id),
  module             TEXT                 NOT NULL DEFAULT 'general',
  title              TEXT                 NOT NULL,
  body               TEXT                 NOT NULL,
  difficulty         community_difficulty NOT NULL DEFAULT 'intermediate',
  tags               TEXT[]               NOT NULL DEFAULT '{}',
  status             community_qstatus    NOT NULL DEFAULT 'open',
  accepted_answer_id UUID,
  views              INTEGER              NOT NULL DEFAULT 0,
  vote_score         INTEGER              NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ          NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ          NOT NULL DEFAULT now()
);
ALTER TABLE public.community_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions readable"     ON public.community_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create questions" ON public.community_questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors update own q"   ON public.community_questions FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own q"   ON public.community_questions FOR DELETE USING (auth.uid() = author_id);
CREATE INDEX IF NOT EXISTS idx_questions_module ON public.community_questions(module, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.community_questions(status);

-- ── 5. Answers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_answers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID        NOT NULL REFERENCES public.community_questions(id) ON DELETE CASCADE,
  author_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body         TEXT        NOT NULL,
  vote_score   INTEGER     NOT NULL DEFAULT 0,
  is_accepted  BOOLEAN     NOT NULL DEFAULT false,
  is_best      BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Answers readable"    ON public.community_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users post answers"  ON public.community_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors edit answer" ON public.community_answers FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors del answer"  ON public.community_answers FOR DELETE USING (auth.uid() = author_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON public.community_answers(question_id, vote_score DESC);

-- ── 6. Comments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_comments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type TEXT        NOT NULL CHECK (parent_type IN ('discussion','question','answer')),
  parent_id   UUID        NOT NULL,
  author_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL,
  like_count  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments readable"    ON public.community_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users post comments"  ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors edit comment" ON public.community_comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors del comment"  ON public.community_comments FOR DELETE USING (auth.uid() = author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.community_comments(parent_type, parent_id, created_at ASC);

-- ── 7. Replies (nested under comments) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_replies (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  UUID        NOT NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL,
  like_count  INTEGER     NOT NULL DEFAULT 0,
  mentions    TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies readable"   ON public.community_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users post replies" ON public.community_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors del reply"  ON public.community_replies FOR DELETE USING (auth.uid() = author_id);
CREATE INDEX IF NOT EXISTS idx_replies_comment ON public.community_replies(comment_id, created_at ASC);

-- ── 8. Votes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_votes (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT    NOT NULL CHECK (target_type IN ('question','answer','discussion')),
  target_id   UUID    NOT NULL,
  value       SMALLINT NOT NULL CHECK (value IN (1,-1)),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_type, target_id)
);
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Votes readable"  ON public.community_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users vote"      ON public.community_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users changevote"ON public.community_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delvote"   ON public.community_votes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_votes_target ON public.community_votes(target_type, target_id);

-- ── 9. Likes ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_likes (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('discussion','comment','reply','message')),
  target_id   UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes readable" ON public.community_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users like"     ON public.community_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike"   ON public.community_likes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_likes_target ON public.community_likes(target_type, target_id);

-- ── 10. Chat rooms ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_chat_rooms (
  id         UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT   NOT NULL UNIQUE,
  name       TEXT   NOT NULL,
  icon       TEXT   NOT NULL DEFAULT '💬',
  color      TEXT   NOT NULL DEFAULT '#4f8ef7',
  modules    TEXT[] NOT NULL DEFAULT '{}'
);
ALTER TABLE public.community_chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rooms readable" ON public.community_chat_rooms FOR SELECT TO authenticated USING (true);

INSERT INTO public.community_chat_rooms(slug, name, icon, color, modules) VALUES
  ('general',      'General Interview',  '💬', '#4f8ef7', '{dsa,java,react,hr,ipk,general}'),
  ('java',         'Java & Spring',      '☕', '#f59e0b', '{java,ipk}'),
  ('dsa',          'DSA & Algorithms',   '🧮', '#06d6a0', '{dsa,ipk}'),
  ('system-design','System Design',      '🏗️', '#8b5cf6', '{dsa,ipk}'),
  ('react',        'React & Frontend',   '⚛️', '#4f8ef7', '{react,ipk}'),
  ('aws',          'AWS & Cloud',        '☁️', '#f59e0b', '{ipk}'),
  ('microservices','Microservices',      '🔧', '#0ea5e9', '{java,ipk}')
ON CONFLICT (slug) DO NOTHING;

-- ── 11. Messages ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID        NOT NULL REFERENCES public.community_chat_rooms(id) ON DELETE CASCADE,
  author_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        TEXT        NOT NULL,
  reply_to_id UUID        REFERENCES public.community_messages(id) ON DELETE SET NULL,
  reactions   JSONB       NOT NULL DEFAULT '{}',
  edited      BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages readable"  ON public.community_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users send message" ON public.community_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors edit msg"   ON public.community_messages FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Authors del msg"    ON public.community_messages FOR DELETE USING (auth.uid() = author_id);
CREATE INDEX IF NOT EXISTS idx_messages_room ON public.community_messages(room_id, created_at DESC);

-- ── 12. Read receipts ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_read_receipts (
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id      UUID        NOT NULL REFERENCES public.community_chat_rooms(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, room_id)
);
ALTER TABLE public.community_read_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own receipts" ON public.community_read_receipts FOR ALL USING (auth.uid() = user_id);

-- ── 13. Notifications ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type TEXT,
  target_id   UUID,
  message     TEXT        NOT NULL,
  read        BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON public.community_notifications FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON public.community_notifications(user_id, read, created_at DESC);

-- ── 14. Badges ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_badges (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT        NOT NULL,
  label      TEXT        NOT NULL,
  icon       TEXT        NOT NULL DEFAULT '🏅',
  color      TEXT        NOT NULL DEFAULT '#f59e0b',
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges readable"  ON public.community_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "System awards"    ON public.community_badges FOR INSERT TO authenticated WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════════════
--  RPCs
-- ══════════════════════════════════════════════════════════════════════════

-- Top contributors
CREATE OR REPLACE FUNCTION public.community_top_contributors(
  p_module TEXT DEFAULT 'general',
  p_limit  INTEGER DEFAULT 10
)
RETURNS TABLE (
  rank         BIGINT,
  user_id      UUID,
  display_name TEXT,
  avatar_color TEXT,
  reputation   INTEGER,
  badge_count  BIGINT,
  answer_count BIGINT,
  is_me        BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY p.reputation DESC) AS rank,
    p.user_id,
    p.display_name,
    p.avatar_color,
    p.reputation,
    (SELECT COUNT(*) FROM community_badges b WHERE b.user_id = p.user_id) AS badge_count,
    (SELECT COUNT(*) FROM community_answers a
       JOIN community_questions q ON q.id = a.question_id
       WHERE a.author_id = p.user_id AND q.module = p_module) AS answer_count,
    (p.user_id = auth.uid()) AS is_me
  FROM community_profiles p
  WHERE p.reputation > 0
  ORDER BY p.reputation DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.community_top_contributors(TEXT,INTEGER) TO authenticated;

-- Unread counts
CREATE OR REPLACE FUNCTION public.community_unread_counts()
RETURNS TABLE (notifications BIGINT, messages BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT COUNT(*) FROM community_notifications
      WHERE user_id = auth.uid() AND read = false) AS notifications,
    (SELECT COUNT(*) FROM community_messages m
       JOIN community_chat_rooms r ON r.id = m.room_id
       LEFT JOIN community_read_receipts rr ON rr.room_id = m.room_id AND rr.user_id = auth.uid()
       WHERE m.author_id != auth.uid()
         AND (rr.last_read_at IS NULL OR m.created_at > rr.last_read_at)) AS messages;
$$;
GRANT EXECUTE ON FUNCTION public.community_unread_counts() TO authenticated;

-- Accept answer (validates question ownership)
CREATE OR REPLACE FUNCTION public.community_accept_answer(p_answer_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_question_id UUID;
  v_author_id   UUID;
BEGIN
  SELECT question_id INTO v_question_id FROM community_answers WHERE id = p_answer_id;
  SELECT author_id   INTO v_author_id   FROM community_questions WHERE id = v_question_id;
  IF v_author_id != auth.uid() THEN RAISE EXCEPTION 'Not your question'; END IF;
  UPDATE community_answers  SET is_accepted = false WHERE question_id = v_question_id;
  UPDATE community_answers  SET is_accepted = true  WHERE id = p_answer_id;
  UPDATE community_questions SET status = 'answered', accepted_answer_id = p_answer_id WHERE id = v_question_id;
  UPDATE community_profiles SET reputation = reputation + 15
    WHERE user_id = (SELECT author_id FROM community_answers WHERE id = p_answer_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.community_accept_answer(UUID) TO authenticated;

-- Mark all notifications read
CREATE OR REPLACE FUNCTION public.community_mark_all_read()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE community_notifications SET read = true WHERE user_id = auth.uid() AND read = false;
$$;
GRANT EXECUTE ON FUNCTION public.community_mark_all_read() TO authenticated;

-- Cast vote (+1/-1), update target score, update reputation
CREATE OR REPLACE FUNCTION public.community_cast_vote(
  p_target_type TEXT,
  p_target_id   UUID,
  p_value       SMALLINT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_existing SMALLINT;
  v_delta    INTEGER;
  v_target_author UUID;
BEGIN
  SELECT value INTO v_existing FROM community_votes
    WHERE user_id = auth.uid() AND target_type = p_target_type AND target_id = p_target_id;

  IF v_existing IS NOT NULL THEN
    IF v_existing = p_value THEN
      DELETE FROM community_votes WHERE user_id = auth.uid() AND target_type = p_target_type AND target_id = p_target_id;
      v_delta := -p_value;
    ELSE
      UPDATE community_votes SET value = p_value WHERE user_id = auth.uid() AND target_type = p_target_type AND target_id = p_target_id;
      v_delta := p_value * 2;
    END IF;
  ELSE
    INSERT INTO community_votes(user_id, target_type, target_id, value) VALUES (auth.uid(), p_target_type, p_target_id, p_value);
    v_delta := p_value;
  END IF;

  IF p_target_type = 'answer' THEN
    UPDATE community_answers  SET vote_score = vote_score + v_delta WHERE id = p_target_id RETURNING author_id INTO v_target_author;
  ELSIF p_target_type = 'question' THEN
    UPDATE community_questions SET vote_score = vote_score + v_delta WHERE id = p_target_id RETURNING author_id INTO v_target_author;
  ELSIF p_target_type = 'discussion' THEN
    UPDATE community_discussions SET like_count = like_count + v_delta WHERE id = p_target_id RETURNING author_id INTO v_target_author;
  END IF;

  IF v_target_author IS NOT NULL AND v_target_author != auth.uid() THEN
    UPDATE community_profiles SET reputation = GREATEST(0, reputation + (v_delta * 5)) WHERE user_id = v_target_author;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.community_cast_vote(TEXT,UUID,SMALLINT) TO authenticated;

CREATE POLICY "allow_delete_room_messages" ON community_messages
  FOR DELETE USING (auth.uid() IS NOT NULL);
