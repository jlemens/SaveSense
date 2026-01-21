import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { SurveyResponse, SurveySession } from '../types';
import { formatCurrency, normalizeToMonthly } from '../lib/utils';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { expenseFlow } from '../lib/expenseFlow';
import type { IncomeStream } from '../types';

export function ReviewSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<SurveySession | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId && user) {
      loadData();
    }
  }, [sessionId, user]);

  const loadData = async () => {
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

      // Load all responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (responsesError) throw responsesError;
      setResponses(responsesData || []);
    } catch (err) {
      console.error('Error loading data:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionText = (questionId: string, flowType: string): string => {
    if (flowType === 'income') {
      const rawValue = responses.find(r => r.question_id === questionId)?.raw_value as IncomeStream | undefined;
      if (rawValue) {
        return `${rawValue.type}: $${rawValue.amount.toLocaleString()} / ${rawValue.frequency}`;
      }
      return questionId;
    } else {
      return expenseFlow[questionId]?.question || questionId;
    }
  };

  const formatAnswer = (response: SurveyResponse): string => {
    const value = response.raw_value;
    
    if (response.flow_type === 'income') {
      const stream = value as IncomeStream;
      return `$${stream.amount.toLocaleString()} / ${stream.frequency} = ${formatCurrency(normalizeToMonthly(stream.amount, stream.frequency))} / month`;
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object' && value !== null) {
      // Table data
      const entries = Object.entries(value as Record<string, number>);
      if (entries.length > 0) {
        return entries.map(([key, val]) => `${key}: ${formatCurrency(val)}`).join('; ');
      }
      return JSON.stringify(value);
    }

    if (typeof value === 'number') {
      return formatCurrency(value);
    }

    return String(value);
  };

  const incomeResponses = responses.filter(
    r => r.flow_type === 'income' && r.question_id.startsWith('income_stream_')
  );
  const expenseResponses = responses.filter(r => r.flow_type === 'expense');

  const taxRateResponse = responses.find(
    r => r.flow_type === 'income' && r.question_id === 'income.tax_rate'
  );
  const taxApplicableResponse = responses.find(
    r => r.flow_type === 'income' && r.question_id === 'income.tax_applicable'
  );

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Card className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Review Survey Answers</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Home
            </Button>
            <Button onClick={() => navigate(`/session/${sessionId}`)}>
              Continue Survey
            </Button>
          </div>
        </div>

        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Income Section */}
          {incomeResponses.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-blue-600">Income Sources</h2>
              <div className="space-y-3">
                {incomeResponses.map((response) => (
                  <div key={response.id} className="p-4 bg-gray-50 rounded border">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {getQuestionText(response.question_id, 'income')}
                        </p>
                        {response.category && (
                          <p className="text-sm text-gray-500 mt-1">{response.category}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatAnswer(response)}
                          </p>
                          {response.normalized_monthly_value && (
                            <p className="text-sm text-gray-500">
                              Monthly: {formatCurrency(response.normalized_monthly_value)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/session/${sessionId}/income?edit=${response.id}`)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                <h3 className="text-md font-semibold mb-2 text-blue-800">Tax Settings</h3>
                <p className="text-sm text-gray-700">
                  {typeof taxApplicableResponse?.raw_value === 'boolean' && taxApplicableResponse.raw_value === false
                    ? 'You indicated that you do not expect to owe income taxes on this income.'
                    : typeof taxRateResponse?.raw_value === 'number'
                    ? `Estimated tax rate: ${taxRateResponse.raw_value}% of your income.`
                    : 'No tax preference recorded yet.'}
                </p>
              </div>
            </div>
          )}

          {/* Expense Section */}
          {expenseResponses.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 text-green-600">Expenses</h2>
              <div className="space-y-3">
                {expenseResponses.map((response) => (
                  <div key={response.id} className="p-4 bg-gray-50 rounded border">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {getQuestionText(response.question_id, 'expense')}
                        </p>
                        {response.category && (
                          <p className="text-sm text-gray-500 mt-1">{response.category}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatAnswer(response)}
                          </p>
                          {response.normalized_monthly_value && (
                            <p className="text-sm text-gray-500">
                              Monthly: {formatCurrency(response.normalized_monthly_value)}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Check if question exists in flow before navigating
                            if (expenseFlow[response.question_id]) {
                              navigate(`/session/${sessionId}?question=${response.question_id}`);
                            } else {
                              alert(`This question ("${response.question_id}") is no longer available in the survey flow. It may have been removed in a recent update.`);
                            }
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {responses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No answers recorded yet.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

