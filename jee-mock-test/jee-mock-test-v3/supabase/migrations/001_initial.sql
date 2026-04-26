-- ════════════════════════════════════════════════════════════════════
-- JEE Mock Test Generator — Supabase Migration (Supabase Auth edition)
-- Run this in: Supabase Dashboard → SQL Editor
-- ════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TESTS TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT NOT NULL,          -- stores Supabase auth.uid()
  title           TEXT NOT NULL,
  description     TEXT,
  slug            TEXT NOT NULL UNIQUE,
  subject         TEXT NOT NULL CHECK (subject IN ('physics','chemistry','mathematics','mixed')),
  difficulty      TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  duration_mins   INTEGER NOT NULL DEFAULT 180,
  is_public       BOOLEAN NOT NULL DEFAULT FALSE,
  source_pdf_name TEXT,
  total_marks     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── QUESTIONS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id         UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text   TEXT NOT NULL,
  question_type   TEXT NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq','numerical','multi_correct')),
  options         JSONB,
  correct_answer  TEXT NOT NULL,
  explanation     TEXT,
  marks_correct   INTEGER NOT NULL DEFAULT 4,
  marks_incorrect NUMERIC NOT NULL DEFAULT -1,
  diagram_url     TEXT,
  topic           TEXT,
  subtopic        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ATTEMPTS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attempts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id           UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  clerk_user_id     TEXT NOT NULL,        -- stores Supabase auth.uid()
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at      TIMESTAMPTZ,
  time_taken_secs   INTEGER,
  answers           JSONB NOT NULL DEFAULT '{}',
  score             NUMERIC,
  max_score         INTEGER,
  correct_count     INTEGER,
  incorrect_count   INTEGER,
  unattempted_count INTEGER,
  percentage        NUMERIC,
  subject_scores    JSONB,
  status            TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','abandoned'))
);

-- ─── INDEXES ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tests_user     ON tests(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_tests_slug     ON tests(slug);
CREATE INDEX IF NOT EXISTS idx_tests_public   ON tests(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_questions_test ON questions(test_id);
CREATE INDEX IF NOT EXISTS idx_questions_num  ON questions(test_id, question_number);
CREATE INDEX IF NOT EXISTS idx_attempts_test  ON attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user  ON attempts(clerk_user_id);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tests_updated_at
  BEFORE UPDATE ON tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────
ALTER TABLE tests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts  ENABLE ROW LEVEL SECURITY;

-- Tests: owner full access using Supabase auth.uid()
CREATE POLICY "tests_owner_all" ON tests
  FOR ALL USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "tests_public_read" ON tests
  FOR SELECT USING (is_public = TRUE);

-- Questions: accessible if test is owned or public
CREATE POLICY "questions_owner_all" ON questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.clerk_user_id = auth.uid()::text)
  );

CREATE POLICY "questions_public_read" ON questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tests WHERE tests.id = questions.test_id AND tests.is_public = TRUE)
  );

-- Attempts: users manage their own
CREATE POLICY "attempts_owner_all" ON attempts
  FOR ALL USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "attempts_test_owner_read" ON attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM tests WHERE tests.id = attempts.test_id AND tests.clerk_user_id = auth.uid()::text)
  );

-- ─── STORAGE BUCKET ──────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagrams', 'diagrams', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "diagrams_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'diagrams');

CREATE POLICY "diagrams_auth_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'diagrams' AND auth.role() = 'authenticated');

CREATE POLICY "diagrams_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'diagrams' AND auth.uid()::text = (storage.foldername(name))[1]);
