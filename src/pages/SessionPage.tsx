import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { SurveySession, SurveyResponse } from '../types';
import { IncomeFlow } from './IncomeFlow';
import { SurveyEngine } from '../components/SurveyEngine';
import { expenseFlow, expenseFlowStartId } from '../lib/expenseFlow';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

type FlowStage = 'income' | 'expense' | 'complete';

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SurveySession | null>(null);
  const [stage, setStage] = useState<FlowStage>('income');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId && user) {
      loadSession();
    }
  }, [sessionId, user]);

  const loadSession = async () => {
    try {
      // Load session
      const { data: sessionData, error: sessionError } = await supabase
        .from('survey_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user!.id)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) {
        navigate('/dashboard');
        return;
      }

      setSession(sessionData);

      // Check if title is set, if not redirect to title input
      if (!sessionData.title || sessionData.title.trim() === '') {
        navigate(`/session/${sessionId}/title`);
        return;
      }

      // Check what stage we're at
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('flow_type')
        .eq('session_id', sessionId);

      const hasIncome = responses?.some((r) => r.flow_type === 'income');
      const hasExpenses = responses?.some((r) => r.flow_type === 'expense');

      if (sessionData.status === 'completed') {
        setStage('complete');
        navigate(`/session/${sessionId}/results`);
      } else if (hasExpenses) {
        // Check if expense flow is complete by checking for last question
        const hasLastQuestion = responses?.some((r) => r.question_id === 'results.summary');
        if (hasLastQuestion) {
          setStage('complete');
        } else {
          setStage('expense');
        }
      } else if (hasIncome) {
        setStage('expense');
      } else {
        setStage('income');
      }
    } catch (err) {
      console.error('Error loading session:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleIncomeComplete = () => {
    setStage('expense');
  };

  const handleExpenseComplete = async () => {
    if (!sessionId) return;

    try {
      // Mark session as completed
      await supabase
        .from('survey_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Trigger summary calculation (will be done by trigger, but we can also call the function)
      const { error } = await supabase.rpc('calculate_session_summary', {
        p_session_id: sessionId,
      });

      if (error) {
        console.error('Error calculating summary:', error);
        // Summary will be calculated by trigger anyway
      }

      // Navigate to review page instead of results
      navigate(`/session/${sessionId}/review`);
    } catch (err) {
      console.error('Error completing session:', err);
    }
  };

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (stage === 'income') {
    return <IncomeFlow />;
  }

  if (stage === 'expense') {
    return (
      <SurveyEngine
        flow={expenseFlow}
        startQuestionId={expenseFlowStartId}
        sessionId={sessionId!}
        flowType="expense"
        onComplete={handleExpenseComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card>
        <p>Redirecting to results...</p>
      </Card>
    </div>
  );
}

