# Database DDL Files

This directory contains the SQL scripts to set up the Supabase database for the AI Travel Planner application.

## Files

1. `01_create_travel_plans_table.sql` - Creates the travel_plans table
2. `02_create_expenses_table.sql` - Creates the expenses table
3. `03_create_indexes.sql` - Creates indexes for better performance
4. `04_enable_rls.sql` - Enables Row Level Security on tables
5. `05_rls_policies_travel_plans.sql` - Creates RLS policies for travel_plans table
6. `06_rls_policies_expenses.sql` - Creates RLS policies for expenses table
7. `07_triggers.sql` - Adds triggers to keep `updated_at` in sync

## Usage

Run these scripts in numerical order in your Supabase SQL editor:

1. Run files 01-03 to create tables and indexes
2. Run file 04 to enable Row Level Security
3. Run files 05-07 to create security policies and triggers

## Table Structure

### travel_plans
- `id` (UUID, PRIMARY KEY, default: gen_random_uuid()) - Unique identifier for the travel plan
- `user_id` (UUID, FK auth.users) - ID of the user who owns this plan
- `title` (TEXT) - Title of the travel plan
- `destination` (TEXT) - Destination of the travel
- `start_date` (DATE) - Start date of the travel
- `end_date` (DATE) - End date of the travel
- `budget` (NUMERIC, >= 0) - Budget for the travel (default: 0)
- `travelers` (INTEGER, > 0) - Number of travelers (default: 1)
- `preferences` (JSONB) - Travel preferences (default: empty array)
- `itinerary` (JSONB) - Detailed itinerary (default: empty array)
- `expenses` (JSONB) - Expenses associated with this plan (default: empty array)
- `created_at` (TIMESTAMPTZ, UTC) - Creation timestamp (default: timezone('utc', now()))
- `updated_at` (TIMESTAMPTZ, UTC) - Last update timestamp (auto-managed trigger)

### expenses
- `id` (UUID, PRIMARY KEY, default: gen_random_uuid()) - Unique identifier for the expense
- `travel_plan_id` (UUID, FK travel_plans) - Reference to the travel plan (ON DELETE CASCADE)
- `category` (TEXT) - Category of the expense
- `amount` (NUMERIC, >= 0) - Amount of the expense
- `description` (TEXT) - Description of the expense
- `date` (DATE) - Date of the expense
- `location` (JSONB) - Location information (optional)
- `created_at` (TIMESTAMPTZ, UTC) - Creation timestamp (default: timezone('utc', now()))
- `updated_at` (TIMESTAMPTZ, UTC) - Last update timestamp (auto-managed trigger)

## Indexes

- `travel_plans_user_id_idx` - Index on user_id for faster queries
- `travel_plans_updated_at_idx` - Index on updated_at for sorting
- `expenses_travel_plan_id_idx` - Index on travel_plan_id for faster joins
- `expenses_date_idx` - Index on date for time-based queries

## Security

Row Level Security (RLS) policies ensure that users can only access their own data:
- Users can only view, insert, update, and delete their own travel plans
- Users can only view, insert, update, and delete expenses associated with their travel plans
