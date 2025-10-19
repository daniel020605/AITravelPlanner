-- Create indexes for better performance
CREATE INDEX travel_plans_user_id_idx ON travel_plans (user_id);
CREATE INDEX travel_plans_updated_at_idx ON travel_plans (updated_at);
CREATE INDEX expenses_travel_plan_id_idx ON expenses (travel_plan_id);
CREATE INDEX expenses_date_idx ON expenses (date);