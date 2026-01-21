-- Function to calculate and update summary for a session
CREATE OR REPLACE FUNCTION calculate_session_summary(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_income NUMERIC(12, 2) := 0;
  v_total_expenses NUMERIC(12, 2) := 0;
  v_net_monthly NUMERIC(12, 2) := 0;
BEGIN
  -- Calculate total income
  SELECT COALESCE(SUM(normalized_monthly_value), 0)
  INTO v_total_income
  FROM survey_responses
  WHERE session_id = p_session_id
    AND flow_type = 'income'
    AND normalized_monthly_value IS NOT NULL;

  -- Calculate total expenses
  SELECT COALESCE(SUM(normalized_monthly_value), 0)
  INTO v_total_expenses
  FROM survey_responses
  WHERE session_id = p_session_id
    AND flow_type = 'expense'
    AND normalized_monthly_value IS NOT NULL;

  -- Calculate net monthly
  v_net_monthly := v_total_income - v_total_expenses;

  -- Insert or update summary
  INSERT INTO summaries (session_id, total_income, total_expenses, net_monthly)
  VALUES (p_session_id, v_total_income, v_total_expenses, v_net_monthly)
  ON CONFLICT (session_id) 
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    total_expenses = EXCLUDED.total_expenses,
    net_monthly = EXCLUDED.net_monthly,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to recalculate summary when responses are inserted/updated
CREATE OR REPLACE FUNCTION trigger_calculate_summary()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_session_summary(NEW.session_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_response_insert_calculate_summary
  AFTER INSERT OR UPDATE ON survey_responses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_summary();

-- Function for creators to get aggregate stats (read-only, no raw user data)
CREATE OR REPLACE FUNCTION get_creator_stats(p_creator_id UUID)
RETURNS TABLE (
  referred_users_count BIGINT,
  total_paid_unlocks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id)::BIGINT as referred_users_count,
    COUNT(DISTINCT py.id) FILTER (WHERE py.status = 'succeeded')::BIGINT as total_paid_unlocks
  FROM profiles p
  LEFT JOIN payments py ON py.user_id = p.id AND py.creator_id = p_creator_id
  WHERE p.creator_id = p_creator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

