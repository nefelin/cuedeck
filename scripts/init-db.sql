-- Run once in Neon SQL editor (Vercel Marketplace → Neon → Query).
CREATE TABLE IF NOT EXISTS user_libraries (
  user_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
