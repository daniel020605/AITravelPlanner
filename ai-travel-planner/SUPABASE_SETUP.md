# Supabase Setup Guide

This guide explains how to set up Supabase for the AI Travel Planner application.

## Prerequisites

1. Create a Supabase account at [https://supabase.com/](https://supabase.com/)
2. Create a new Supabase project

## Database Schema Setup

You can set up the database schema in two ways:

### Option 1: Run Individual DDL Files (Recommended)
Navigate to the [ddl](ddl) folder and run the SQL files in numerical order:
1. [01_create_travel_plans_table.sql](ddl/01_create_travel_plans_table.sql)
2. [02_create_expenses_table.sql](ddl/02_create_expenses_table.sql)
3. [03_create_indexes.sql](ddl/03_create_indexes.sql)
4. [04_enable_rls.sql](ddl/04_enable_rls.sql)
5. [05_rls_policies_travel_plans.sql](ddl/05_rls_policies_travel_plans.sql)
6. [06_rls_policies_expenses.sql](ddl/06_rls_policies_expenses.sql)

### Option 2: Run Single Combined Script
Run the full setup script: [full_setup.sql](ddl/full_setup.sql)

### Option 3: Manual Copy-Paste
Run the following SQL commands in your Supabase SQL editor to create the required tables:

```sql
-- Create travel_plans table
create table travel_plans (
  id text primary key,
  user_id text not null,
  title text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  budget numeric default 0,
  travelers integer default 1,
  preferences jsonb default '[]',
  itinerary jsonb default '[]',
  expenses jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create expenses table
create table expenses (
  id text primary key,
  travel_plan_id text references travel_plans(id) on delete cascade,
  category text not null,
  amount numeric not null,
  description text,
  date date not null,
  location jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better performance
create index travel_plans_user_id_idx on travel_plans (user_id);
create index travel_plans_updated_at_idx on travel_plans (updated_at);
create index expenses_travel_plan_id_idx on expenses (travel_plan_id);
create index expenses_date_idx on expenses (date);
```

## Configuration

1. Get your Supabase URL and Anon Key from the Supabase project settings
2. In the AI Travel Planner app, go to Settings page
3. Configure the "云端同步（Supabase）" section with:
   - Supabase URL: Your project URL (e.g., `https://your-project.supabase.co`)
   - Anon Key: Your public API key

## RLS (Row Level Security) - Optional but Recommended

To secure your data, you can enable RLS with the following policies:

```sql
-- Enable RLS
alter table travel_plans enable row level security;
alter table expenses enable row level security;

-- Policies for travel_plans
create policy "Users can view their own travel plans" 
  on travel_plans for select 
  using (auth.uid()::text = user_id);

create policy "Users can insert their own travel plans" 
  on travel_plans for insert 
  with check (auth.uid()::text = user_id);

create policy "Users can update their own travel plans" 
  on travel_plans for update 
  using (auth.uid()::text = user_id);

create policy "Users can delete their own travel plans" 
  on travel_plans for delete 
  using (auth.uid()::text = user_id);

-- Policies for expenses
create policy "Users can view expenses for their travel plans" 
  on expenses for select 
  using (exists (
    select 1 from travel_plans 
    where travel_plans.id = expenses.travel_plan_id 
    and travel_plans.user_id = auth.uid()::text
  ));

create policy "Users can insert expenses for their travel plans" 
  on expenses for insert 
  with check (exists (
    select 1 from travel_plans 
    where travel_plans.id = expenses.travel_plan_id 
    and travel_plans.user_id = auth.uid()::text
  ));

create policy "Users can update expenses for their travel plans" 
  on expenses for update 
  using (exists (
    select 1 from travel_plans 
    where travel_plans.id = expenses.travel_plan_id 
    and travel_plans.user_id = auth.uid()::text
  ));

create policy "Users can delete expenses for their travel plans" 
  on expenses for delete 
  using (exists (
    select 1 from travel_plans 
    where travel_plans.id = expenses.travel_plan_id 
    and travel_plans.user_id = auth.uid()::text
  ));
```

## Testing the Connection

After configuration:
1. Restart the application
2. Create a new travel plan
3. Check the Supabase table browser to verify data is being stored