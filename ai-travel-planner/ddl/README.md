# Database DDL Files

This directory contains the SQL scripts to set up the Supabase database for the AI Travel Planner application.

## Files

1. `01_create_travel_plans_table.sql` - Creates the travel_plans table
2. `02_create_expenses_table.sql` - Creates the expenses table
3. `03_create_indexes.sql` - Creates indexes for better performance
4. `04_enable_rls.sql` - Enables Row Level Security on tables
5. `05_rls_policies_travel_plans.sql` - Creates RLS policies for travel_plans table
6. `06_rls_policies_expenses.sql` - Creates RLS policies for expenses table

## Usage

Run these scripts in numerical order in your Supabase SQL editor:

1. Run files 01-03 to create tables and indexes
2. Run file 04 to enable Row Level Security
3. Run files 05-06 to create security policies

## Table Structure

### travel_plans
- `id` (TEXT, PRIMARY KEY) - Unique identifier for the travel plan
- `user_id` (TEXT) - ID of the user who owns this plan
- `title` (TEXT) - Title of the travel plan
- `destination` (TEXT) - Destination of the travel
- `start_date` (DATE) - Start date of the travel
- `end_date` (DATE) - End date of the travel
- `budget` (NUMERIC) - Budget for the travel (default: 0)
- `travelers` (INTEGER) - Number of travelers (default: 1)
- `preferences` (JSONB) - Travel preferences (default: empty array)
- `itinerary` (JSONB) - Detailed itinerary (default: empty array)
- `expenses` (JSONB) - Expenses associated with this plan (default: empty array)
- `created_at` (TIMESTAMPTZ) - Creation timestamp (default: NOW())
- `updated_at` (TIMESTAMPTZ) - Last update timestamp (default: NOW())

### expenses
- `id` (TEXT, PRIMARY KEY) - Unique identifier for the expense
- `travel_plan_id` (TEXT) - Reference to the travel plan (REFERENCES travel_plans(id) ON DELETE CASCADE)
- `category` (TEXT) - Category of the expense
- `amount` (NUMERIC) - Amount of the expense
- `description` (TEXT) - Description of the expense
- `date` (DATE) - Date of the expense
- `location` (JSONB) - Location information (optional)
- `created_at` (TIMESTAMPTZ) - Creation timestamp (default: NOW())
- `updated_at` (TIMESTAMPTZ) - Last update timestamp (default: NOW())

## Indexes

- `travel_plans_user_id_idx` - Index on user_id for faster queries
- `travel_plans_updated_at_idx` - Index on updated_at for sorting
- `expenses_travel_plan_id_idx` - Index on travel_plan_id for faster joins
- `expenses_date_idx` - Index on date for time-based queries

## Security

Row Level Security (RLS) policies ensure that users can only access their own data:
- Users can only view, insert, update, and delete their own travel plans
- Users can only view, insert, update, and delete expenses associated with their travel plans