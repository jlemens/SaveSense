-- Add DELETE policy for survey_sessions
-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions" ON survey_sessions
  FOR DELETE USING (auth.uid() = user_id);


