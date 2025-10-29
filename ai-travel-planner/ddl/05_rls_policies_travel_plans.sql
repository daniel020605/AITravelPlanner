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
