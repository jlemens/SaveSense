import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { normalizeToMonthly } from '../lib/utils';
import type { IncomeStream, IncomeType, IncomeFrequency } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function IncomeFlow() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const editResponseId = searchParams.get('edit');
  const [streams, setStreams] = useState<IncomeStream[]>([]);
  const [editingResponseId, setEditingResponseId] = useState<string | null>(null);
  const [currentStream, setCurrentStream] = useState<Partial<IncomeStream>>({
    type: 'W2',
    amount: 0,
    frequency: 'monthly',
  });
  const [showAddForm, setShowAddForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'income' | 'tax'>('income');
  const [taxApplicable, setTaxApplicable] = useState<boolean | null>(null);
  const [taxOption, setTaxOption] = useState<'20' | '25' | '30' | '35' | 'other'>('30');
  const [customTaxRate, setCustomTaxRate] = useState<number | ''>('');
  const navigate = useNavigate();

  useEffect(() => {
    loadExistingStreams();
  }, [sessionId]);

  useEffect(() => {
    if (editResponseId) {
      loadStreamForEdit(editResponseId);
    }
  }, [editResponseId, sessionId]);

  const loadExistingStreams = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('flow_type', 'income')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const allResponses = data || [];

      // Load income streams (only responses created as income_stream_*)
      const loadedStreams: IncomeStream[] = allResponses
        .filter((response) => response.question_id.startsWith('income_stream_'))
        .map((response) => {
          const rawValue = response.raw_value as { type: IncomeType; amount: number; frequency: IncomeFrequency };
          return rawValue;
        });

      setStreams(loadedStreams);
      if (loadedStreams.length > 0 && !editResponseId) {
        setShowAddForm(false);
      }

      // Load tax settings if they exist
      const taxApplicableResponse = allResponses.find((r) => r.question_id === 'income.tax_applicable');
      const taxRateResponse = allResponses.find((r) => r.question_id === 'income.tax_rate');

      if (typeof taxApplicableResponse?.raw_value === 'boolean') {
        setTaxApplicable(taxApplicableResponse.raw_value);
      }

      if (typeof taxRateResponse?.raw_value === 'number') {
        const pct = taxRateResponse.raw_value;
        if (pct === 20 || pct === 25 || pct === 30 || pct === 35) {
          setTaxOption(String(pct) as '20' | '25' | '30' | '35');
        } else {
          setTaxOption('other');
          setCustomTaxRate(pct);
        }
      }
    } catch (err) {
      console.error('Error loading streams:', err);
    }
  };

  const loadStreamForEdit = async (responseId: string) => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('id', responseId)
        .eq('session_id', sessionId)
        .eq('flow_type', 'income')
        .single();

      if (error) throw error;
      if (!data) return;

      const stream = data.raw_value as IncomeStream;
      setCurrentStream(stream);
      setEditingResponseId(responseId);
      setShowAddForm(true);
    } catch (err) {
      console.error('Error loading stream for edit:', err);
    }
  };

  const saveStream = async (stream: IncomeStream, isUpdate = false) => {
    if (!sessionId) return;

    const normalizedMonthly = normalizeToMonthly(stream.amount, stream.frequency);

    if (isUpdate && editingResponseId) {
      // Update existing response
      const { error } = await supabase
        .from('survey_responses')
        .update({
          category: `Income: ${stream.type}`,
          raw_value: stream,
          normalized_monthly_value: normalizedMonthly,
        })
        .eq('id', editingResponseId);

      if (error) throw error;
    } else {
      // Insert new response
      const questionId = `income_stream_${Date.now()}`;

      const { error } = await supabase
        .from('survey_responses')
        .insert({
          session_id: sessionId,
          flow_type: 'income',
          question_id: questionId,
          category: `Income: ${stream.type}`,
          raw_value: stream,
          normalized_monthly_value: normalizedMonthly,
        });

      if (error) throw error;
    }
  };

  const handleAddStream = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const stream: IncomeStream = {
        type: currentStream.type || 'W2',
        amount: currentStream.amount || 0,
        frequency: currentStream.frequency || 'monthly',
      };

      const isUpdate = !!editingResponseId;
      await saveStream(stream, isUpdate);

      if (isUpdate) {
        // Update the stream in the list
        setStreams((prev) => {
          const index = prev.findIndex((s, idx) => {
            // Find the stream that matches the edited one
            // Since we don't have a direct mapping, we'll reload
            return false;
          });
          return prev;
        });
        // Reload streams to reflect the update
        await loadExistingStreams();
        setEditingResponseId(null);
        setCurrentStream({ type: 'W2', amount: 0, frequency: 'monthly' });
        setShowAddForm(false);
        // Remove edit param from URL
        navigate(`/session/${sessionId}/income`, { replace: true });
      } else {
        setStreams((prev) => [...prev, stream]);
        setCurrentStream({ type: 'W2', amount: 0, frequency: 'monthly' });
        setShowAddForm(false);
      }
    } catch (err) {
      console.error('Error adding stream:', err);
      alert('Failed to save income stream');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!sessionId) {
      console.error('No sessionId available');
      return;
    }
    
    // Ensure we have at least one income stream
    if (streams.length === 0) {
      alert('Please add at least one income source before continuing.');
      return;
    }

    try {
      // Verify income streams are saved in database
      const { data: incomeData, error } = await supabase
        .from('survey_responses')
        .select('id')
        .eq('session_id', sessionId)
        .eq('flow_type', 'income')
        .limit(1);

      if (error) {
        console.error('Error checking income data:', error);
        alert('Error verifying income data. Please try again.');
        return;
      }

      if (!incomeData || incomeData.length === 0) {
        alert('Please save at least one income source before continuing. Make sure you click "Add Income Source" after entering your income.');
        return;
      }

      // Move to tax step instead of directly to expenses
      setStep('tax');
    } catch (err) {
      console.error('Error in handleContinue:', err);
      alert('An error occurred. Please try again.');
    }
  };

  const handleAddAnother = () => {
    setShowAddForm(true);
  };

  const totalMonthly = streams.reduce((sum, stream) => {
    return sum + normalizeToMonthly(stream.amount, stream.frequency);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {step === 'income' ? (
              <>
                <span className="text-gray-500 font-normal">Income - Question #1:</span> Income Sources
              </>
            ) : (
              <>
                <span className="text-gray-500 font-normal">Income - Question #2:</span> Taxes on Your Income
              </>
            )}
          </h1>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Home
          </Button>
        </div>

        {step === 'income' ? (
          <>
            {streams.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-4">Your Income Streams</h2>
                <div className="space-y-2 mb-4">
                  {streams.map((stream, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between">
                        <span className="font-medium">{stream.type}</span>
                        <span>
                          ${stream.amount.toLocaleString()} / {stream.frequency} = $
                          {normalizeToMonthly(stream.amount, stream.frequency).toLocaleString()} / month
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-blue-50 rounded border border-blue-200">
                  <div className="flex justify-between font-semibold">
                    <span>Total Monthly Income:</span>
                    <span>${totalMonthly.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {showAddForm ? (
              <form onSubmit={handleAddStream} className="space-y-4">
                {editingResponseId && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">Editing income source</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Income Type
                  </label>
                  <select
                    value={currentStream.type || 'W2'}
                    onChange={(e) => setCurrentStream({ ...currentStream, type: e.target.value as IncomeType })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="W2">W-2 (Employee)</option>
                    <option value="1099">1099 (Contractor)</option>
                    <option value="Business">Business</option>
                    <option value="Rental">Rental / Property Income</option>
                    <option value="Investment">Investment / Passive Income</option>
                    <option value="Partner">Partner Income</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={currentStream.amount || ''}
                    onChange={(e) => setCurrentStream({ ...currentStream, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency
                  </label>
                  <select
                    value={currentStream.frequency || 'monthly'}
                    onChange={(e) => setCurrentStream({ ...currentStream, frequency: e.target.value as IncomeFrequency })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" disabled={loading} className="flex-1">
                    {editingResponseId ? 'Update Income Source' : 'Add Income Source'}
                  </Button>
                  {editingResponseId && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setEditingResponseId(null);
                        setCurrentStream({ type: 'W2', amount: 0, frequency: 'monthly' });
                        setShowAddForm(false);
                        navigate(`/session/${sessionId}/income`, { replace: true });
                      }} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  {streams.length > 0 && !editingResponseId && (
                    <Button type="button" variant="outline" onClick={handleContinue} className="flex-1">
                      Continue to Taxes
                    </Button>
                  )}
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <Button onClick={handleAddAnother} variant="outline" className="w-full">
                  Add Another Income Source
                </Button>
                <Button onClick={handleContinue} className="w-full">
                  Continue to Taxes
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded border border-gray-200">
              <h2 className="text-lg font-semibold mb-2">Your Monthly Gross Income</h2>
              <p className="text-2xl font-bold">${totalMonthly.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">
                We&apos;ll use this to estimate how much of your income goes to taxes.
              </p>
            </div>

            <div className="space-y-4">
              <p className="font-medium">
                Do you expect to owe additional taxes on this income (federal, state, and payroll)?
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={taxApplicable === true ? 'primary' : 'outline'}
                  onClick={() => setTaxApplicable(true)}
                  className="flex-1"
                >
                  Yes
                </Button>
                <Button
                  type="button"
                  variant={taxApplicable === false ? 'primary' : 'outline'}
                  onClick={() => setTaxApplicable(false)}
                  className="flex-1"
                >
                  No
                </Button>
              </div>
            </div>

            {taxApplicable && (
              <div className="space-y-4">
                <p className="font-medium">
                  Roughly what percentage of your income goes to taxes?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {['20', '25', '30', '35'].map((opt) => (
                    <Button
                      key={opt}
                      type="button"
                      variant={taxOption === opt ? 'primary' : 'outline'}
                      onClick={() => setTaxOption(opt as '20' | '25' | '30' | '35')}
                    >
                      {opt}%
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={taxOption === 'other' ? 'primary' : 'outline'}
                    onClick={() => setTaxOption('other')}
                  >
                    Other
                  </Button>
                </div>
                {taxOption === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enter your effective tax rate (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      step={0.1}
                      value={customTaxRate}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Math.min(60, parseFloat(e.target.value) || 0));
                        setCustomTaxRate(val);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. 27"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <Button
                onClick={async () => {
                  if (!sessionId) return;

                  try {
                    setLoading(true);

                    const applicable = !!taxApplicable;

                    // Determine chosen tax rate (percentage number, e.g. 30)
                    let taxRatePercent = 0;
                    if (applicable) {
                      if (taxOption === 'other') {
                        if (customTaxRate === '' || isNaN(Number(customTaxRate))) {
                          alert('Please enter a tax percentage or choose one of the presets.');
                          setLoading(false);
                          return;
                        }
                        taxRatePercent = Number(customTaxRate);
                      } else {
                        taxRatePercent = Number(taxOption);
                      }
                    }

                    // Upsert tax settings as income flow responses (no normalized_monthly_value)
                    const { error } = await supabase
                      .from('survey_responses')
                      .upsert(
                        [
                          {
                            session_id: sessionId,
                            flow_type: 'income',
                            question_id: 'income.tax_applicable',
                            category: null,
                            raw_value: applicable,
                            normalized_monthly_value: null,
                          },
                          {
                            session_id: sessionId,
                            flow_type: 'income',
                            question_id: 'income.tax_rate',
                            category: null,
                            raw_value: taxRatePercent,
                            normalized_monthly_value: null,
                          },
                        ],
                        { onConflict: 'session_id,flow_type,question_id' }
                      );

                    if (error) {
                      console.error('Error saving tax settings:', error);
                      alert('Failed to save tax settings. Please try again.');
                      setLoading(false);
                      return;
                    }

                    // Navigate to session page, which will show expense flow next
                    navigate(`/session/${sessionId}`);
                  } catch (err) {
                    console.error('Error saving tax settings:', err);
                    alert('Failed to save tax settings. Please try again.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || totalMonthly === 0 || taxApplicable === null}
                className="w-full"
              >
                Continue to Expenses
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('income')}
                className="w-full"
                disabled={loading}
              >
                Back to Income Sources
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

