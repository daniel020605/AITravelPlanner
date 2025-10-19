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