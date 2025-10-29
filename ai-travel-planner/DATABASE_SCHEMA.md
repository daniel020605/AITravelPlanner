# Database Schema Documentation

This document provides an overview of the database schema used by the AI Travel Planner application with Supabase.

## Overview

The application uses two main tables to store travel planning data:
1. `travel_plans` - Stores travel plan information
2. `expenses` - Stores expense records associated with travel plans

## Table Structures

### travel_plans

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (Primary Key) | Unique identifier for the travel plan (default: `gen_random_uuid()`) |
| user_id | UUID (FK auth.users) | ID of the user who owns this plan |
| title | TEXT | Title of the travel plan |
| destination | TEXT | Destination of the travel |
| start_date | DATE | Start date of the travel |
| end_date | DATE | End date of the travel |
| budget | NUMERIC | Budget for the travel (default: 0, must be ≥ 0) |
| travelers | INTEGER | Number of travelers (default: 1, must be > 0) |
| preferences | JSONB | Travel preferences (default: empty array) |
| itinerary | JSONB | Detailed itinerary (default: empty array) |
| expenses | JSONB | Expenses snapshot associated with this plan (default: empty array) |
| created_at | TIMESTAMPTZ | Creation timestamp (default: `timezone('utc', now())`) |
| updated_at | TIMESTAMPTZ | Last update timestamp (auto-managed trigger) |

### expenses

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (Primary Key) | Unique identifier for the expense (default: `gen_random_uuid()`) |
| travel_plan_id | UUID (Foreign Key) | Reference to the travel plan (ON DELETE CASCADE) |
| category | TEXT | Category of the expense |
| amount | NUMERIC | Amount of the expense (must be ≥ 0) |
| description | TEXT | Description of the expense |
| date | DATE | Date of the expense |
| location | JSONB | Location information (optional) |
| created_at | TIMESTAMPTZ | Creation timestamp (default: `timezone('utc', now())`) |
| updated_at | TIMESTAMPTZ | Last update timestamp (auto-managed trigger) |

## Relationships

- One-to-Many: A travel plan can have multiple expenses
- Cascade Delete: When a travel plan is deleted, all associated expenses are automatically deleted

## Indexes

The following indexes are created for performance optimization:

1. `travel_plans_user_id_idx` - On `user_id` column for faster user-based queries
2. `travel_plans_updated_at_idx` - On `updated_at` column for sorting by update time
3. `expenses_travel_plan_id_idx` - On `travel_plan_id` column for faster joins
4. `expenses_date_idx` - On `date` column for time-based queries

## Security

Row Level Security (RLS) policies ensure that users can only access their own data:

### travel_plans policies:
- Users can only view their own travel plans
- Users can only insert their own travel plans
- Users can only update their own travel plans
- Users can only delete their own travel plans

### expenses policies:
- Users can only view expenses for their travel plans
- Users can only insert expenses for their travel plans
- Users can only update expenses for their travel plans
- Users can only delete expenses for their travel plans

## DDL Files

All database schema definitions are available in the [ddl](ddl) folder:

1. [01_create_travel_plans_table.sql](ddl/01_create_travel_plans_table.sql) - Creates the travel_plans table
2. [02_create_expenses_table.sql](ddl/02_create_expenses_table.sql) - Creates the expenses table
3. [03_create_indexes.sql](ddl/03_create_indexes.sql) - Creates performance indexes
4. [04_enable_rls.sql](ddl/04_enable_rls.sql) - Enables Row Level Security
5. [05_rls_policies_travel_plans.sql](ddl/05_rls_policies_travel_plans.sql) - Creates RLS policies for travel_plans
6. [06_rls_policies_expenses.sql](ddl/06_rls_policies_expenses.sql) - Creates RLS policies for expenses
7. [full_setup.sql](ddl/full_setup.sql) - Combined script with all DDL statements

## Usage

To set up the database:

1. Create a new Supabase project
2. Navigate to the SQL editor in the Supabase dashboard
3. Run the DDL files in numerical order, or use the full_setup.sql script
4. Configure your application with the Supabase URL and Anon Key
