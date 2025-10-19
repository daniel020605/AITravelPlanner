-- Create expenses table
CREATE TABLE expenses (
  id TEXT PRIMARY KEY,
  travel_plan_id TEXT REFERENCES travel_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);