-- Create travel_plans table
CREATE TABLE travel_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC DEFAULT 0,
  travelers INTEGER DEFAULT 1,
  preferences JSONB DEFAULT '[]',
  itinerary JSONB DEFAULT '[]',
  expenses JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);