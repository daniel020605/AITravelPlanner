-- Ensure updated_at is refreshed automatically
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
