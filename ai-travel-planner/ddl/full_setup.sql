-- Full Supabase Database Setup for AI Travel Planner
-- This script contains all the necessary SQL commands to set up the database

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

-- Create indexes for better performance
CREATE INDEX travel_plans_user_id_idx ON travel_plans (user_id);
CREATE INDEX travel_plans_updated_at_idx ON travel_plans (updated_at);
CREATE INDEX expenses_travel_plan_id_idx ON expenses (travel_plan_id);
CREATE INDEX expenses_date_idx ON expenses (date);

-- Enable RLS
ALTER TABLE travel_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies for travel_plans
CREATE POLICY "Users can view their own travel plans" 
  ON travel_plans FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own travel plans" 
  ON travel_plans FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own travel plans" 
  ON travel_plans FOR UPDATE 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own travel plans" 
  ON travel_plans FOR DELETE 
  USING (auth.uid()::text = user_id);

-- Policies for expenses
CREATE POLICY "Users can view expenses for their travel plans" 
  ON expenses FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM travel_plans 
    WHERE travel_plans.id = expenses.travel_plan_id 
    AND travel_plans.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert expenses for their travel plans" 
  ON expenses FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM travel_plans 
    WHERE travel_plans.id = expenses.travel_plan_id 
    AND travel_plans.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update expenses for their travel plans" 
  ON expenses FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM travel_plans 
    WHERE travel_plans.id = expenses.travel_plan_id 
    AND travel_plans.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete expenses for their travel plans" 
  ON expenses FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM travel_plans 
    WHERE travel_plans.id = expenses.travel_plan_id 
    AND travel_plans.user_id = auth.uid()::text
  ));