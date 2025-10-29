-- Full Supabase Database Setup for AI Travel Planner
-- This script contains all the necessary SQL commands to set up the database

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create travel_plans table
CREATE TABLE travel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget NUMERIC DEFAULT 0 CHECK (budget >= 0),
  travelers INTEGER DEFAULT 1 CHECK (travelers > 0),
  preferences JSONB DEFAULT '[]'::jsonb,
  itinerary JSONB DEFAULT '[]'::jsonb,
  expenses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

-- Create expenses table
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_plan_id UUID REFERENCES travel_plans(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  description TEXT,
  date DATE NOT NULL,
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
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
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own travel plans" 
  ON travel_plans FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own travel plans" 
  ON travel_plans FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own travel plans" 
  ON travel_plans FOR DELETE 
  USING (auth.uid() = user_id);

-- Policies for expenses
CREATE POLICY "Users can view expenses for their travel plans" 
  ON expenses FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM travel_plans 
    WHERE travel_plans.id = expenses.travel_plan_id 
    AND travel_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert expenses for their travel plans" 
  ON expenses FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM travel_plans 
    WHERE travel_plans.id = expenses.travel_plan_id 
    AND travel_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can update expenses for their travel plans" 
  ON expenses FOR UPDATE 
  USING (EXISTS (
    SELECT 1 FROM travel_plans 
    WHERE travel_plans.id = expenses.travel_plan_id 
    AND travel_plans.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete expenses for their travel plans" 
  ON expenses FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM travel_plans 
    WHERE travel_plans.id = expenses.travel_plan_id 
    AND travel_plans.user_id = auth.uid()
  ));

-- Updated-at triggers
CREATE OR REPLACE FUNCTION public.set_current_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_travel_plans_updated_at
BEFORE UPDATE ON travel_plans
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp();

CREATE TRIGGER set_expenses_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION public.set_current_timestamp();
