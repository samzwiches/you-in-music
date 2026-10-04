CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  recipient TEXT,
  tier TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  sound_style TEXT,
  feeling TEXT,
  story_center TEXT,
  phrase TEXT,
  place TEXT,
  tiny_detail TEXT,
  ending_feeling TEXT,
  song_for_name TEXT,
  relationship TEXT,
  pronunciation TEXT,
  occasion_date TEXT,
  core_story TEXT,
  memories TEXT,
  must_include TEXT,
  must_avoid TEXT,
  genre_notes TEXT,
  vocalist_pref TEXT,
  energy_notes TEXT,
  language_notes TEXT,
  private_notes TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  intake_submitted_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON orders(stripe_session_id);
