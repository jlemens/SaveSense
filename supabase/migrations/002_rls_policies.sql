-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Creators can read basic info for referral validation (public read for referral codes)
CREATE POLICY "Anyone can view creator referral codes" ON creators
  FOR SELECT USING (true);

-- Creators can update their own creator record
CREATE POLICY "Creators can update own record" ON creators
  FOR UPDATE USING (auth.uid() = id);

-- Survey sessions policies
CREATE POLICY "Users can view own sessions" ON survey_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON survey_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON survey_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Survey responses policies
CREATE POLICY "Users can view own responses" ON survey_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM survey_sessions
      WHERE survey_sessions.id = survey_responses.session_id
      AND survey_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own responses" ON survey_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_sessions
      WHERE survey_sessions.id = survey_responses.session_id
      AND survey_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own responses" ON survey_responses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM survey_sessions
      WHERE survey_sessions.id = survey_responses.session_id
      AND survey_sessions.user_id = auth.uid()
    )
  );

-- Summaries policies
CREATE POLICY "Users can view own summaries" ON summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM survey_sessions
      WHERE survey_sessions.id = summaries.session_id
      AND survey_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own summaries" ON summaries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_sessions
      WHERE survey_sessions.id = summaries.session_id
      AND survey_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own summaries" ON summaries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM survey_sessions
      WHERE survey_sessions.id = summaries.session_id
      AND survey_sessions.user_id = auth.uid()
    )
  );

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

