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