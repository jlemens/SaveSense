-- Add INSERT policy for profiles (needed if trigger fails or for manual inserts)
-- This allows users to insert their own profile (though trigger should handle it)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

