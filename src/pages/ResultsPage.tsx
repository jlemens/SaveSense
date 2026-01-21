import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency, maskCurrency } from '../lib/utils';
import type { Summary, SurveyResponse } from '../types';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { expenseFlow } from '../lib/expenseFlow';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// Stripe integration - simplified for V1
// In production, create a backend endpoint to handle Stripe Checkout Session creation

export function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId && user) {
      loadSummary();
    }
  }, [sessionId, user]);

  // Check if user has paid before (any successful payment)
  const checkUserHasPaid = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'succeeded')
        .limit(1);

      if (error) {
        console.error('Error checking payments:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (err) {
      console.error('Error checking user payments:', err);
      return false;
    }
  };

  const loadSummary = async () => {
    try {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error) throw error;
      
      // If summary is locked, check if user has paid before
      if (data && !data.unlocked && user) {
        const hasPaid = await checkUserHasPaid(user.id);
        if (hasPaid) {
          // User has paid before, auto-unlock this session
          const { error: unlockError } = await supabase
            .from('summaries')
            .update({ unlocked: true })
            .eq('session_id', sessionId);

          if (!unlockError) {
            // Reload summary with unlocked status
            const { data: updatedData } = await supabase
              .from('summaries')
              .select('*')
              .eq('session_id', sessionId)
              .single();
            
            setSummary(updatedData);
            setLoading(false);
            return;
          }
        }
      }
      
      setSummary(data);
    } catch (err) {
      console.error('Error loading summary:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!summary.unlocked) {
    return <ResultsLocked summary={summary} sessionId={sessionId!} onUnlock={loadSummary} />;
  }

  return <ResultsUnlocked summary={summary} sessionId={sessionId!} />;
}

function ResultsLocked({
  summary,
  sessionId,
  onUnlock,
}: {
  summary: Summary;
  sessionId: string;
  onUnlock: () => void;
}) {
  const { user } = useAuth();
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showBypass, setShowBypass] = useState(false);
  const [bypassCode, setBypassCode] = useState('');
  const [bypassLoading, setBypassLoading] = useState(false);
  const [hasPaidBefore, setHasPaidBefore] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(true);

  useEffect(() => {
    checkPaymentStatus();
  }, [user]);

  const checkPaymentStatus = async () => {
    if (!user) {
      setCheckingPayment(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'succeeded')
        .limit(1);

      if (error) {
        console.error('Error checking payments:', error);
        setHasPaidBefore(false);
      } else {
        setHasPaidBefore((data?.length || 0) > 0);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      setHasPaidBefore(false);
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleUnlock = async () => {
    // TODO: Implement Stripe Checkout
    // You'll need to create a backend endpoint (e.g., /api/create-checkout-session)
    // that creates a Stripe Checkout Session and returns the URL
    
    // For now, this is a placeholder - you'll need to:
    // 1. Create a serverless function (Vercel/Netlify) or API route
    // 2. Use Stripe Node.js SDK to create checkout session
    // 3. Redirect user to checkout session URL
    // 4. Set up webhook to handle payment success and unlock results
    
    alert('Payment integration needs backend setup. See README for Stripe setup instructions.');
  };

  const handleBypass = async () => {
    // Bypass code for testing: "TEST123" or "BYPASS"
    const validCodes = ['TEST123', 'BYPASS', 'DEV'];
    
    if (!validCodes.includes(bypassCode.toUpperCase())) {
      alert('Invalid bypass code');
      return;
    }

    setBypassLoading(true);
    try {
      // Unlock the results directly in Supabase
      const { error } = await supabase
        .from('summaries')
        .update({ unlocked: true })
        .eq('session_id', sessionId);

      if (error) throw error;

      // Create a test payment record
      const { data: sessionData } = await supabase
        .from('survey_sessions')
        .select('user_id')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        await supabase.from('payments').insert({
          session_id: sessionId,
          user_id: sessionData.user_id,
          amount_cents: 499,
          currency: 'usd',
          provider: 'test',
          provider_payment_intent_id: `bypass_${Date.now()}`,
          status: 'succeeded',
        });
      }

      // Reload summary to show unlocked results
      onUnlock();
    } catch (err) {
      console.error('Error bypassing payment:', err);
      alert('Failed to unlock results. Please try again.');
    } finally {
      setBypassLoading(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Results Are Ready!</h1>
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
          >
            Home
          </Button>
        </div>

        <div className="space-y-6 mb-8">
          <div className="p-6 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-4">Monthly Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Income:</span>
                <span className="font-mono text-xl blur-sm">{maskCurrency(summary.total_income)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Expenses:</span>
                <span className="font-mono text-xl blur-sm">{maskCurrency(summary.total_expenses)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Net Monthly:</span>
                <span className="font-mono text-2xl font-bold blur-sm">{maskCurrency(summary.net_monthly)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Disclaimer:</strong> This tool is for educational tracking only and does not provide financial advice.
            </p>
          </div>
        </div>

        <div>
          {checkingPayment ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-600">Checking payment status...</p>
            </div>
          ) : hasPaidBefore ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md mb-4">
              <p className="text-sm text-green-800 text-center">
                <strong>You've already paid!</strong> Your results should be unlocked automatically. 
                If you're seeing this message, please refresh the page.
              </p>
            </div>
          ) : (
            <>
              <Button onClick={handleUnlock} className="w-full text-lg py-3">
                Unlock Results ($4.99)
              </Button>
              <p className="text-sm text-gray-600 text-center mt-4">
                One-time payment. No refunds. Secure payment via Stripe.
                <br />
                <span className="text-xs text-gray-500">
                  After your first payment, all future surveys will be automatically unlocked.
                </span>
              </p>
            </>
          )}
          
          {/* Bypass for testing */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setShowBypass(!showBypass)}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              {showBypass ? 'Hide' : 'Show'} Test Bypass
            </button>
            
            {showBypass && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-xs text-yellow-800 mb-2">
                  <strong>Testing Only:</strong> Enter bypass code to unlock results without payment
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bypassCode}
                    onChange={(e) => setBypassCode(e.target.value)}
                    placeholder="Enter bypass code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleBypass();
                      }
                    }}
                  />
                  <Button
                    onClick={handleBypass}
                    disabled={bypassLoading || !bypassCode}
                    variant="outline"
                    className="text-sm"
                  >
                    {bypassLoading ? 'Unlocking...' : 'Unlock'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Valid codes: TEST123, BYPASS, DEV
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}


function ResultsUnlocked({ summary, sessionId }: { summary: Summary; sessionId: string }) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInvestments, setIncludeInvestments] = useState(true);
  const [viewMode, setViewMode] = useState<'summary' | 'charts'>('summary');
  
  // Scenario/hypothetical state
  const [scenarios, setScenarios] = useState({
    addPartnerIncome: { enabled: false, amount: 0 },
    incomeRaise: { enabled: false, percent: 0 },
    sideHustle: { enabled: false, amount: 0 },
    partnerCoversExpenses: { enabled: false, percent: 0 },
    reduceDining: { enabled: false, percent: 0 },
    reduceSubscriptions: { enabled: false, percent: 0 },
    cheaperHousing: { enabled: false, amount: 0 },
    increaseSavings: { enabled: false, percent: 0 },
    coffeeSavings: { enabled: false, monthlyAmount: 0 },
  });

  useEffect(() => {
    loadResponses();
  }, [sessionId]);

  const loadResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setResponses(data || []);
    } catch (err) {
      console.error('Error loading responses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if a specific expense item is an investment
  const isInvestmentItem = (itemName: string): boolean => {
    const investmentKeys = [
      'Retirement (401k/IRA/Solo 401k)',
      'Brokerage/Taxable',
      'College fund (if applicable)'
    ];
    return investmentKeys.includes(itemName);
  };

  // Helper function to get investment amount from a savings.allocations response
  const getInvestmentAmountFromResponse = (response: SurveyResponse): number => {
    if (response.question_id !== 'savings.allocations') return 0;
    
    if (typeof response.raw_value === 'object' && response.raw_value !== null) {
      const rawValue = response.raw_value as Record<string, number>;
      let investmentAmount = 0;
      
      Object.entries(rawValue).forEach(([key, value]) => {
        if (isInvestmentItem(key) && value > 0) {
          investmentAmount += value;
        }
      });
      
      return investmentAmount;
    }
    
    return 0;
  };

  // Helper to get the numeric value of an expense response.
  // Prefer normalized_monthly_value, but fall back to raw_value if it's a number
  const getExpenseValue = (r: SurveyResponse): number => {
    if (typeof r.normalized_monthly_value === 'number') {
      return r.normalized_monthly_value;
    }
    if (typeof r.raw_value === 'number') {
      return r.raw_value;
    }
    return 0;
  };

  // Calculate base values and scenario-adjusted values for income, expenses, and net
  const calculatedSummary = useMemo(() => {
    // Only treat income_stream_* responses as actual income
    const incomeResponses = responses.filter(
      (r) => r.flow_type === 'income' && r.question_id.startsWith('income_stream_')
    );
    const expenseResponses = responses.filter((r) => r.flow_type === 'expense');
    
    // Investment amount from savings.allocations responses (used in both base and scenarios)
    let investmentAmount = 0;
    expenseResponses.forEach((r) => {
      investmentAmount += getInvestmentAmountFromResponse(r);
    });

    // ----- Base income & expenses (no scenarios) -----
    const baseIncome = incomeResponses.reduce(
      (sum, r) => sum + (r.normalized_monthly_value || 0),
      0
    );

    const baseExpensesWithInvestments = expenseResponses.reduce(
      (sum, r) => sum + getExpenseValue(r),
      0
    );
    const baseExpensesWithoutInvestments = baseExpensesWithInvestments - investmentAmount;

    // ----- Income scenarios (deltas only) -----
    const incomeAdjustments: string[] = [];
    let incomeDelta = 0;

    if (scenarios.addPartnerIncome.enabled && scenarios.addPartnerIncome.amount > 0) {
      incomeDelta += scenarios.addPartnerIncome.amount;
      incomeAdjustments.push(`+${formatCurrency(scenarios.addPartnerIncome.amount)} partner income`);
    }

    if (scenarios.incomeRaise.enabled && scenarios.incomeRaise.percent > 0) {
      const raiseAmount = baseIncome * (scenarios.incomeRaise.percent / 100);
      incomeDelta += raiseAmount;
      incomeAdjustments.push(`+${scenarios.incomeRaise.percent}% raise (${formatCurrency(raiseAmount)})`);
    }

    if (scenarios.sideHustle.enabled && scenarios.sideHustle.amount > 0) {
      incomeDelta += scenarios.sideHustle.amount;
      incomeAdjustments.push(`+${formatCurrency(scenarios.sideHustle.amount)} side hustle`);
    }

    if (scenarios.coffeeSavings.enabled && scenarios.coffeeSavings.monthlyAmount > 0) {
      // Annual amount with 3.6% S&P growth: monthly * 12 * 1.036
      const annualWithGrowth = scenarios.coffeeSavings.monthlyAmount * 12 * 1.036;
      const monthlyInvestmentIncome = annualWithGrowth / 12;
      incomeDelta += monthlyInvestmentIncome;
      incomeAdjustments.push(
        `+${formatCurrency(monthlyInvestmentIncome)} coffee savings investment (${formatCurrency(
          annualWithGrowth
        )}/yr)`
      );
    }

    const totalIncome = baseIncome;
    const totalIncomeWithScenarios = baseIncome + incomeDelta;

    // ----- Expense scenarios (deltas only) -----
    const expenseAdjustments: string[] = [];
    let expenseDelta = 0;

    if (scenarios.partnerCoversExpenses.enabled && scenarios.partnerCoversExpenses.percent > 0) {
      const reduction = baseExpensesWithInvestments * (scenarios.partnerCoversExpenses.percent / 100);
      expenseDelta -= reduction;
      expenseAdjustments.push(
        `-${scenarios.partnerCoversExpenses.percent}% partner covers expenses (${formatCurrency(reduction)})`
      );
    }

    // Category-specific reductions
    const diningExpenses = expenseResponses
      .filter((r) => r.category?.includes('Dining out'))
      .reduce((sum, r) => sum + getExpenseValue(r), 0);
    if (scenarios.reduceDining.enabled && scenarios.reduceDining.percent > 0 && diningExpenses > 0) {
      const reduction = diningExpenses * (scenarios.reduceDining.percent / 100);
      expenseDelta -= reduction;
      expenseAdjustments.push(
        `-${scenarios.reduceDining.percent}% dining out reduction (${formatCurrency(reduction)})`
      );
    }

    if (scenarios.coffeeSavings.enabled && scenarios.coffeeSavings.monthlyAmount > 0) {
      expenseDelta -= scenarios.coffeeSavings.monthlyAmount;
      const annualWithGrowth = scenarios.coffeeSavings.monthlyAmount * 12 * 1.036;
      expenseAdjustments.push(
        `-${formatCurrency(
          scenarios.coffeeSavings.monthlyAmount
        )} coffee expenses → ${formatCurrency(annualWithGrowth)}/yr investment return`
      );
    }

    const subscriptionExpenses = expenseResponses
      .filter(
        (r) =>
          r.category?.includes('Streaming') ||
          r.raw_value?.toString().toLowerCase().includes('streaming')
      )
      .reduce((sum, r) => sum + getExpenseValue(r), 0);
    if (
      scenarios.reduceSubscriptions.enabled &&
      scenarios.reduceSubscriptions.percent > 0 &&
      subscriptionExpenses > 0
    ) {
      const reduction = subscriptionExpenses * (scenarios.reduceSubscriptions.percent / 100);
      expenseDelta -= reduction;
      expenseAdjustments.push(
        `-${scenarios.reduceSubscriptions.percent}% subscriptions reduction (${formatCurrency(
          reduction
        )})`
      );
    }

    const housingExpenses = expenseResponses
      .filter(
        (r) =>
          r.category?.includes('Housing') &&
          (r.category.includes('Rent') || r.category.includes('Mortgage'))
      )
      .reduce((sum, r) => sum + getExpenseValue(r), 0);
    if (scenarios.cheaperHousing.enabled && scenarios.cheaperHousing.amount > 0 && housingExpenses > 0) {
      const reduction = Math.min(scenarios.cheaperHousing.amount, housingExpenses);
      expenseDelta -= reduction;
      expenseAdjustments.push(`-${formatCurrency(reduction)} cheaper housing`);
    }

    // Apply savings increase scenario as additional expense
    if (scenarios.increaseSavings.enabled && scenarios.increaseSavings.percent > 0) {
      const additionalSavings = baseIncome * (scenarios.increaseSavings.percent / 100);
      expenseDelta += additionalSavings;
      expenseAdjustments.push(
        `+${scenarios.increaseSavings.percent}% additional savings (${formatCurrency(additionalSavings)})`
      );
    }

    // Base vs scenario-adjusted expenses (respecting investment toggle)
    const baseExpensesToUse = includeInvestments
      ? baseExpensesWithInvestments
      : baseExpensesWithoutInvestments;
    const totalExpensesWithScenarios = Math.max(0, baseExpensesToUse + expenseDelta);

    // ----- Taxes & net (base vs with scenarios) -----
    const taxRateResponse = responses.find(
      (r) => r.flow_type === 'income' && r.question_id === 'income.tax_rate'
    );
    let taxRatePercent = 0;
    if (typeof taxRateResponse?.raw_value === 'number') {
      taxRatePercent = taxRateResponse.raw_value;
    }
    const taxRate = taxRatePercent / 100;

    const estimatedTaxesBase = totalIncome * taxRate;
    const afterTaxIncomeBase = totalIncome - estimatedTaxesBase;

    const estimatedTaxesWithScenarios = totalIncomeWithScenarios * taxRate;
    const afterTaxIncomeWithScenarios = totalIncomeWithScenarios - estimatedTaxesWithScenarios;

    const netMonthlyBase = afterTaxIncomeBase - baseExpensesToUse;
    const netMonthlyWithScenarios = afterTaxIncomeWithScenarios - totalExpensesWithScenarios;
    
    return {
      baseIncome,
      totalIncome: totalIncomeWithScenarios,
      baseExpenses: baseExpensesToUse,
      totalExpenses: totalExpensesWithScenarios,
      netMonthly: netMonthlyWithScenarios,
      taxRatePercent,
      estimatedTaxes: estimatedTaxesWithScenarios,
      afterTaxIncome: afterTaxIncomeWithScenarios,
      investmentAmount,
      incomeAdjustments,
      expenseAdjustments,
    };
  }, [responses, includeInvestments, scenarios]);

  // Prepare chart data with detailed expense breakdown for tooltips
  const expenseChartData = useMemo(() => {
    const expenseResponses = responses.filter((r) => r.flow_type === 'expense');
    
    // Group by category and track individual expenses
    const categoryMap = new Map<string, { value: number; expenses: Array<{ name: string; value: number; questionId: string }> }>();
    
    expenseResponses.forEach((r) => {
      // For savings.allocations, we need to handle it specially
      if (r.question_id === 'savings.allocations' && typeof r.raw_value === 'object' && r.raw_value !== null) {
        const rawValue = r.raw_value as Record<string, number>;
        const category = r.category || 'Other';
        const mainCategory = category.split(' > ')[0];
        
        // Only include investment items if toggle is on
        Object.entries(rawValue).forEach(([key, value]) => {
          if (value > 0) {
            const isInvestment = isInvestmentItem(key);
            if (includeInvestments || !isInvestment) {
              const current = categoryMap.get(mainCategory) || { value: 0, expenses: [] };
              current.value += value;
              current.expenses.push({ name: key, value, questionId: r.question_id });
              categoryMap.set(mainCategory, current);
            }
          }
        });
      } else {
        const value = getExpenseValue(r);
        // Skip items that don't actually contribute any dollars
        if (value <= 0) {
          return;
        }

        const category = r.category || 'Other';
        const mainCategory = category.split(' > ')[0];
        const current = categoryMap.get(mainCategory) || { value: 0, expenses: [] };
        current.value += value;
        
        // Get a readable name for this expense
        let expenseName = '';

        // Prefer the survey question text (shortened) if available
        const flowQuestion = expenseFlow[r.question_id as keyof typeof expenseFlow];
        if (flowQuestion?.question) {
          let q = flowQuestion.question;
          // Remove anything in parentheses and trailing question mark for a cleaner label
          if (q.includes('(')) {
            q = q.split('(')[0];
          }
          if (q.endsWith('?')) {
            q = q.slice(0, -1);
          }
          expenseName = q.trim();
        } else if (category) {
          // Fallback to the last part of the category label
          expenseName = category.includes('>') ? category.split('>').slice(-1)[0].trim() : category;
        } else {
          // Last resort: use the question id
          expenseName = r.question_id;
        }

        // For table-style responses where raw_value is an object, use the single key if there's only one
        if (typeof r.raw_value === 'object' && r.raw_value !== null) {
          const keys = Object.keys(r.raw_value as Record<string, unknown>);
          if (keys.length === 1) {
            expenseName = keys[0];
          }
        }
        
        current.expenses.push({
          name: expenseName,
          value,
          questionId: r.question_id
        });
        categoryMap.set(mainCategory, current);
      }
    });
    
    let chartData = Array.from(categoryMap.entries())
      .map(([name, data]) => ({ 
        name: name.replace(/^[A-Z]\.\s*/, ''), 
        value: data.value,
        expenses: data.expenses
      }))
      .filter((item) => item.value > 0);
    
    // Apply expense scenario adjustments to chart data
    if (scenarios.partnerCoversExpenses.enabled && scenarios.partnerCoversExpenses.percent > 0) {
      const reductionPercent = scenarios.partnerCoversExpenses.percent / 100;
      chartData = chartData.map(item => ({
        ...item,
        value: item.value * (1 - reductionPercent),
        expenses: item.expenses.map(e => ({
          ...e,
          value: e.value * (1 - reductionPercent)
        }))
      }));
    }
    
    // Category-specific reductions
    const diningCategoryIndex = chartData.findIndex(c => c.name.includes('Food'));
    if (scenarios.reduceDining.enabled && scenarios.reduceDining.percent > 0 && diningCategoryIndex >= 0) {
      const reductionPercent = scenarios.reduceDining.percent / 100;
      const diningCategory = chartData[diningCategoryIndex];
      const diningExpenses = diningCategory.expenses.filter(e => 
        e.name.toLowerCase().includes('dining') || e.name.toLowerCase().includes('coffee')
      );
      const diningReduction = diningExpenses.reduce((sum, e) => sum + e.value, 0) * reductionPercent;
      chartData[diningCategoryIndex] = {
        ...diningCategory,
        value: diningCategory.value - diningReduction,
        expenses: diningCategory.expenses.map(e => {
          const isDiningExpense = e.name.toLowerCase().includes('dining') || e.name.toLowerCase().includes('coffee');
          return isDiningExpense 
            ? { ...e, value: e.value * (1 - reductionPercent) }
            : e;
        })
      };
    }
    // Coffee savings scenario - reduces coffee expenses from dining
    if (scenarios.coffeeSavings.enabled && scenarios.coffeeSavings.monthlyAmount > 0 && diningCategoryIndex >= 0) {
      const diningCategory = chartData[diningCategoryIndex];
      const coffeeAmount = scenarios.coffeeSavings.monthlyAmount;
      // Find coffee-related expenses and reduce them
      chartData[diningCategoryIndex] = {
        ...diningCategory,
        value: Math.max(0, diningCategory.value - coffeeAmount),
        expenses: diningCategory.expenses.map(e => {
          const isCoffeeExpense = e.name.toLowerCase().includes('coffee') || e.name.toLowerCase().includes('dining');
          if (isCoffeeExpense) {
            // Reduce by coffee amount, but don't go negative
            const newValue = Math.max(0, e.value - coffeeAmount);
            return { ...e, value: newValue };
          }
          return e;
        }).filter(e => e.value > 0) // Remove zero-value expenses
      };
    }
    
    const subscriptionsCategoryIndex = chartData.findIndex(c => c.name.includes('Personal'));
    if (scenarios.reduceSubscriptions.enabled && scenarios.reduceSubscriptions.percent > 0 && subscriptionsCategoryIndex >= 0) {
      const reductionPercent = scenarios.reduceSubscriptions.percent / 100;
      const subscriptionsCategory = chartData[subscriptionsCategoryIndex];
      const subscriptionExpenses = subscriptionsCategory.expenses.filter(e => 
        e.name.toLowerCase().includes('streaming') || e.name.toLowerCase().includes('subscription')
      );
      const subscriptionReduction = subscriptionExpenses.reduce((sum, e) => sum + e.value, 0) * reductionPercent;
      chartData[subscriptionsCategoryIndex] = {
        ...subscriptionsCategory,
        value: subscriptionsCategory.value - subscriptionReduction,
        expenses: subscriptionsCategory.expenses.map(e => {
          const isSubscriptionExpense = e.name.toLowerCase().includes('streaming') || e.name.toLowerCase().includes('subscription');
          return isSubscriptionExpense 
            ? { ...e, value: e.value * (1 - reductionPercent) }
            : e;
        })
      };
    }
    
    const housingCategoryIndex = chartData.findIndex(c => c.name.includes('Housing'));
    if (scenarios.cheaperHousing.enabled && scenarios.cheaperHousing.amount > 0 && housingCategoryIndex >= 0) {
      const housingCategory = chartData[housingCategoryIndex];
      const housingExpenses = housingCategory.expenses.filter(e => 
        e.name.toLowerCase().includes('rent') || e.name.toLowerCase().includes('mortgage')
      );
      const housingReduction = Math.min(scenarios.cheaperHousing.amount, housingExpenses.reduce((sum, e) => sum + e.value, 0));
      chartData[housingCategoryIndex] = {
        ...housingCategory,
        value: Math.max(0, housingCategory.value - housingReduction),
        expenses: housingCategory.expenses.map(e => {
          const isHousingExpense = e.name.toLowerCase().includes('rent') || e.name.toLowerCase().includes('mortgage');
          if (!isHousingExpense) return e;
          const reduction = Math.min(e.value, housingReduction);
          return { ...e, value: Math.max(0, e.value - reduction) };
        })
      };
    }
    
    // Increase savings scenario
    if (scenarios.increaseSavings.enabled && scenarios.increaseSavings.percent > 0) {
      const baseIncome = responses
        .filter((r) => r.flow_type === 'income' && r.question_id.startsWith('income_stream_'))
        .reduce((sum, r) => sum + (r.normalized_monthly_value || 0), 0);
      const additionalSavings = baseIncome * (scenarios.increaseSavings.percent / 100);
      const savingsCategoryIndex = chartData.findIndex(c => c.name.includes('Savings'));
      if (savingsCategoryIndex >= 0) {
        chartData[savingsCategoryIndex].value += additionalSavings;
        chartData[savingsCategoryIndex].expenses.push({
          name: `Additional savings (${scenarios.increaseSavings.percent}%)`,
          value: additionalSavings,
          questionId: 'scenario.increase_savings'
        });
      } else {
        // Create new savings category if it doesn't exist
        chartData.push({
          name: 'Savings & Investments',
          value: additionalSavings,
          expenses: [{
            name: `Additional savings (${scenarios.increaseSavings.percent}%)`,
            value: additionalSavings,
            questionId: 'scenario.increase_savings'
          }]
        });
      }
    }
    
    return chartData
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [responses, includeInvestments, scenarios]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'];

  // Shorten long category labels so they fit cleanly on the bar chart axis
  const formatCategoryLabel = (name: string): string => {
    if (name === 'Savings & Investments') return 'Savings & Invest.';
    if (name === 'Personal & Lifestyle') return 'Personal & Lifestyle';
    if (name === 'Housing & Living') return 'Housing & Living';
    return name;
  };

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Card className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Your Monthly Cashflow Results</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Home
            </Button>
            <Button
              variant={viewMode === 'summary' ? 'primary' : 'outline'}
              onClick={() => setViewMode('summary')}
            >
              Summary
            </Button>
            <Button
              variant={viewMode === 'charts' ? 'primary' : 'outline'}
              onClick={() => setViewMode('charts')}
            >
              Charts
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/session/${sessionId}/review`)}
            >
              Review Survey
            </Button>
          </div>
        </div>

        {viewMode === 'summary' ? (
          <>
            {/* Investments Toggle - only show in summary mode */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInvestments}
                  onChange={(e) => setIncludeInvestments(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">
                  Include Savings & Investments in expenses
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">
                Toggle to see how much you have left over after excluding investment contributions
              </p>
            </div>
          <div className="space-y-6 mb-8">
            <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Income:</span>
                  <span className="font-mono text-xl">{formatCurrency(calculatedSummary.baseIncome)}</span>
                </div>
                {calculatedSummary.incomeAdjustments && calculatedSummary.incomeAdjustments.length > 0 && (
                  <div className="pt-2 pb-2 border-t border-blue-200">
                    <p className="text-xs text-blue-700 font-medium mb-1">Income Adjustments:</p>
                    {calculatedSummary.incomeAdjustments.map((adj, idx) => (
                      <p key={idx} className="text-xs text-blue-600">{adj}</p>
                    ))}
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total Income:</span>
                  <span className="font-mono text-xl">{formatCurrency(calculatedSummary.totalIncome)}</span>
                </div>
                {calculatedSummary.taxRatePercent > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-gray-700">
                      <span>Estimated Taxes ({calculatedSummary.taxRatePercent}%):</span>
                      <span className="font-mono text-base">
                        {formatCurrency(calculatedSummary.estimatedTaxes)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>After-Tax Income:</span>
                      <span className="font-mono text-xl">
                        {formatCurrency(calculatedSummary.afterTaxIncome)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between pt-3 border-t border-blue-300">
                  <span>Expenses{includeInvestments ? '' : ' (excluding investments)'}:</span>
                  <span className="font-mono text-xl">{formatCurrency(calculatedSummary.baseExpenses)}</span>
                </div>
                {!includeInvestments && calculatedSummary.investmentAmount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Investments/Savings:</span>
                    <span className="font-mono">{formatCurrency(calculatedSummary.investmentAmount)}</span>
                  </div>
                )}
                {calculatedSummary.expenseAdjustments &&
                  calculatedSummary.expenseAdjustments.length > 0 && (
                    <div className="pt-2 pb-2 border-t border-purple-200">
                      <p className="text-xs text-purple-700 font-medium mb-1">
                        Expense Adjustments:
                      </p>
                      {calculatedSummary.expenseAdjustments.map((adj, idx) => (
                        <p key={idx} className="text-xs text-purple-600">
                          {adj}
                        </p>
                      ))}
                    </div>
                  )}
                <div className="flex justify-between font-semibold">
                  <span>Total Expenses:</span>
                  <span className="font-mono text-xl">{formatCurrency(calculatedSummary.totalExpenses)}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-blue-300">
                  <span className="font-semibold text-lg">
                    {calculatedSummary.netMonthly >= 0 ? 'Monthly Surplus:' : 'Monthly Deficit:'}
                  </span>
                  <span
                    className={`font-mono text-2xl font-bold ${
                      calculatedSummary.netMonthly >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(calculatedSummary.netMonthly)}
                  </span>
                </div>
              </div>
            </div>

            {/* Scenarios Subsection */}
            <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
              <h2 className="text-lg font-semibold mb-4">Explore Scenarios</h2>
              <p className="text-sm text-gray-600 mb-4">
                Test "what-if" scenarios to see how changes would affect your budget:
              </p>
              <div className="space-y-4">
                {/* Income Scenarios */}
                <div>
                  <h3 className="font-medium mb-2 text-sm">Income Adjustments:</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.addPartnerIncome.enabled}
                        onChange={(e) => setScenarios({...scenarios, addPartnerIncome: {...scenarios.addPartnerIncome, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Add partner/spouse income:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scenarios.addPartnerIncome.amount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            addPartnerIncome: {
                              ...scenarios.addPartnerIncome,
                              amount: value,
                              enabled: value > 0 || scenarios.addPartnerIncome.enabled
                            }
                          });
                        }}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.incomeRaise.enabled}
                        onChange={(e) => setScenarios({...scenarios, incomeRaise: {...scenarios.incomeRaise, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Income raise/promotion:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.incomeRaise.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            incomeRaise: {
                              ...scenarios.incomeRaise,
                              percent: value,
                              enabled: value > 0 || scenarios.incomeRaise.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.sideHustle.enabled}
                        onChange={(e) => setScenarios({...scenarios, sideHustle: {...scenarios.sideHustle, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Side hustle/extra income:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scenarios.sideHustle.amount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            sideHustle: {
                              ...scenarios.sideHustle,
                              amount: value,
                              enabled: value > 0 || scenarios.sideHustle.enabled
                            }
                          });
                        }}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.coffeeSavings.enabled}
                        onChange={(e) => setScenarios({...scenarios, coffeeSavings: {...scenarios.coffeeSavings, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Coffee savings (monthly spent):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scenarios.coffeeSavings.monthlyAmount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            coffeeSavings: {
                              ...scenarios.coffeeSavings,
                              monthlyAmount: value,
                              enabled: value > 0 || scenarios.coffeeSavings.enabled
                            }
                          });
                        }}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">→ invests at 3.6% S&P growth</span>
                    </label>
                  </div>
                </div>
                
                {/* Expense Scenarios */}
                <div>
                  <h3 className="font-medium mb-2 text-sm">Expense Adjustments:</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.partnerCoversExpenses.enabled}
                        onChange={(e) => setScenarios({...scenarios, partnerCoversExpenses: {...scenarios.partnerCoversExpenses, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Partner covers:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.partnerCoversExpenses.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            partnerCoversExpenses: {
                              ...scenarios.partnerCoversExpenses,
                              percent: value,
                              enabled: value > 0 || scenarios.partnerCoversExpenses.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">% of expenses</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.reduceDining.enabled}
                        onChange={(e) => setScenarios({...scenarios, reduceDining: {...scenarios.reduceDining, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Reduce dining out by:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.reduceDining.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            reduceDining: {
                              ...scenarios.reduceDining,
                              percent: value,
                              enabled: value > 0 || scenarios.reduceDining.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.reduceSubscriptions.enabled}
                        onChange={(e) => setScenarios({...scenarios, reduceSubscriptions: {...scenarios.reduceSubscriptions, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Reduce subscriptions by:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.reduceSubscriptions.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            reduceSubscriptions: {
                              ...scenarios.reduceSubscriptions,
                              percent: value,
                              enabled: value > 0 || scenarios.reduceSubscriptions.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.cheaperHousing.enabled}
                        onChange={(e) => setScenarios({...scenarios, cheaperHousing: {...scenarios.cheaperHousing, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Cheaper housing (reduce by):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scenarios.cheaperHousing.amount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            cheaperHousing: {
                              ...scenarios.cheaperHousing,
                              amount: value,
                              enabled: value > 0 || scenarios.cheaperHousing.enabled
                            }
                          });
                        }}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.increaseSavings.enabled}
                        onChange={(e) => setScenarios({...scenarios, increaseSavings: {...scenarios.increaseSavings, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Increase savings by:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.increaseSavings.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            increaseSavings: {
                              ...scenarios.increaseSavings,
                              percent: value,
                              enabled: value > 0 || scenarios.increaseSavings.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">% of income</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Disclaimer:</strong> This tool is for educational tracking only and does not provide financial advice.
              </p>
            </div>
          </div>
          </>
        ) : (
          <div className="space-y-6 mb-8">
            {/* Investments Toggle - visible in chart mode */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeInvestments}
                  onChange={(e) => setIncludeInvestments(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">
                  Include Investments (401K, Roth IRA, Brokerage, etc.) in expenses
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">
                Excludes emergency fund and home payments (mortgage/rent)
              </p>
            </div>

            {/* Income and Expenses Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income Indicator */}
              <div className="p-6 bg-green-50 rounded-lg border border-green-200">
                <h2 className="text-lg font-semibold mb-4 text-green-800">Monthly Income</h2>
                <div className="text-center space-y-2">
                  <div>
                    <div className="text-sm text-green-700">Income</div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatCurrency(calculatedSummary.baseIncome)}
                    </div>
                  </div>
                  {calculatedSummary.incomeAdjustments && calculatedSummary.incomeAdjustments.length > 0 && (
                    <div className="pt-2 pb-2 border-t border-green-300">
                      <p className="text-xs text-green-700 font-medium mb-1">Income Adjustments:</p>
                      {calculatedSummary.incomeAdjustments.map((adj, idx) => (
                        <p key={idx} className="text-xs text-green-600">{adj}</p>
                      ))}
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-green-700 font-semibold">Total Income</div>
                    <div className="text-2xl font-bold text-green-700">
                      {formatCurrency(calculatedSummary.totalIncome)}
                    </div>
                  </div>
                  {calculatedSummary.taxRatePercent > 0 && (
                    <>
                      <div>
                        <div className="text-xs text-green-700">
                          Estimated Taxes ({calculatedSummary.taxRatePercent}%)
                        </div>
                        <div className="text-lg font-semibold text-green-800">
                          {formatCurrency(calculatedSummary.estimatedTaxes)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-green-700">After-Tax Income</div>
                        <div className="text-2xl font-bold text-green-700">
                          {formatCurrency(calculatedSummary.afterTaxIncome)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Expenses Pie Chart */}
              <div className="p-6 bg-white rounded-lg border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Expense Breakdown</h2>
                {expenseChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expenseChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        // Show only percentage on the slices to keep text inside the chart area
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={95}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {expenseChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload[0]) {
                            const data = payload[0].payload as typeof expenseChartData[0];
                            return (
                              <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
                                <p className="font-semibold mb-2">{data.name}</p>
                                <p className="text-sm mb-2">Total: {formatCurrency(data.value)}</p>
                                {data.expenses && data.expenses.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <p className="text-xs font-semibold mb-1">Breakdown:</p>
                                    <div className="space-y-1">
                                      {data.expenses.map((expense, idx) => (
                                        <div key={idx} className="text-xs flex justify-between gap-2">
                                          <span className="text-gray-600">{expense.name}:</span>
                                          <span className="font-mono">{formatCurrency(expense.value)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        layout="horizontal"
                        verticalAlign="bottom"
                        align="center"
                        wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No expense data available</p>
                )}
                {calculatedSummary.expenseAdjustments && calculatedSummary.expenseAdjustments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <p className="text-xs text-purple-700 font-medium mb-1">Expense Adjustments:</p>
                    {calculatedSummary.expenseAdjustments.map((adj, idx) => (
                      <p key={idx} className="text-xs text-purple-600">{adj}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="p-6 bg-white rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold mb-4">Expenses by Category</h2>
              {expenseChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-35}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatCategoryLabel}
                    />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload as typeof expenseChartData[0];
                          return (
                            <div className="bg-white p-4 border border-gray-300 rounded-lg shadow-lg">
                              <p className="font-semibold mb-2">{data.name}</p>
                              <p className="text-sm mb-2">Total: {formatCurrency(data.value)}</p>
                              {data.expenses && data.expenses.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-xs font-semibold mb-1">Breakdown:</p>
                                  <div className="space-y-1">
                                    {data.expenses.map((expense, idx) => (
                                      <div key={idx} className="text-xs flex justify-between gap-2">
                                        <span className="text-gray-600">{expense.name}:</span>
                                        <span className="font-mono">{formatCurrency(expense.value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No expense data available</p>
              )}
              {calculatedSummary.expenseAdjustments && calculatedSummary.expenseAdjustments.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-purple-700 font-medium mb-1">Expense Adjustments:</p>
                  {calculatedSummary.expenseAdjustments.map((adj, idx) => (
                    <p key={idx} className="text-xs text-purple-600">{adj}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Scenarios Subsection */}
            <div className="p-6 bg-purple-50 rounded-lg border border-purple-200">
              <h2 className="text-lg font-semibold mb-4">Explore Scenarios</h2>
              <p className="text-sm text-gray-600 mb-4">
                Test "what-if" scenarios to see how changes would affect your budget:
              </p>
              <div className="space-y-4">
                {/* Income Scenarios */}
                <div>
                  <h3 className="font-medium mb-2 text-sm">Income Adjustments:</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.addPartnerIncome.enabled}
                        onChange={(e) => setScenarios({...scenarios, addPartnerIncome: {...scenarios.addPartnerIncome, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Add partner/spouse income:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scenarios.addPartnerIncome.amount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            addPartnerIncome: {
                              ...scenarios.addPartnerIncome,
                              amount: value,
                              enabled: value > 0 || scenarios.addPartnerIncome.enabled
                            }
                          });
                        }}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.incomeRaise.enabled}
                        onChange={(e) => setScenarios({...scenarios, incomeRaise: {...scenarios.incomeRaise, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Income raise/promotion:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.incomeRaise.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            incomeRaise: {
                              ...scenarios.incomeRaise,
                              percent: value,
                              enabled: value > 0 || scenarios.incomeRaise.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.sideHustle.enabled}
                        onChange={(e) => setScenarios({...scenarios, sideHustle: {...scenarios.sideHustle, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Side hustle/extra income:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scenarios.sideHustle.amount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            sideHustle: {
                              ...scenarios.sideHustle,
                              amount: value,
                              enabled: value > 0 || scenarios.sideHustle.enabled
                            }
                          });
                        }}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.coffeeSavings.enabled}
                        onChange={(e) => setScenarios({...scenarios, coffeeSavings: {...scenarios.coffeeSavings, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Coffee savings (monthly spent):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scenarios.coffeeSavings.monthlyAmount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            coffeeSavings: {
                              ...scenarios.coffeeSavings,
                              monthlyAmount: value,
                              enabled: value > 0 || scenarios.coffeeSavings.enabled
                            }
                          });
                        }}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">→ invests at 3.6% S&P growth</span>
                    </label>
                  </div>
                </div>
                
                {/* Expense Scenarios */}
                <div>
                  <h3 className="font-medium mb-2 text-sm">Expense Adjustments:</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.partnerCoversExpenses.enabled}
                        onChange={(e) => setScenarios({...scenarios, partnerCoversExpenses: {...scenarios.partnerCoversExpenses, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Partner covers:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.partnerCoversExpenses.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            partnerCoversExpenses: {
                              ...scenarios.partnerCoversExpenses,
                              percent: value,
                              enabled: value > 0 || scenarios.partnerCoversExpenses.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">% of expenses</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.reduceDining.enabled}
                        onChange={(e) => setScenarios({...scenarios, reduceDining: {...scenarios.reduceDining, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Reduce dining out by:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.reduceDining.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            reduceDining: {
                              ...scenarios.reduceDining,
                              percent: value,
                              enabled: value > 0 || scenarios.reduceDining.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.reduceSubscriptions.enabled}
                        onChange={(e) => setScenarios({...scenarios, reduceSubscriptions: {...scenarios.reduceSubscriptions, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Reduce subscriptions by:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.reduceSubscriptions.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            reduceSubscriptions: {
                              ...scenarios.reduceSubscriptions,
                              percent: value,
                              enabled: value > 0 || scenarios.reduceSubscriptions.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.cheaperHousing.enabled}
                        onChange={(e) => setScenarios({...scenarios, cheaperHousing: {...scenarios.cheaperHousing, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Cheaper housing (reduce by):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={scenarios.cheaperHousing.amount || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            cheaperHousing: {
                              ...scenarios.cheaperHousing,
                              amount: value,
                              enabled: value > 0 || scenarios.cheaperHousing.enabled
                            }
                          });
                        }}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={scenarios.increaseSavings.enabled}
                        onChange={(e) => setScenarios({...scenarios, increaseSavings: {...scenarios.increaseSavings, enabled: e.target.checked}})}
                        className="w-4 h-4"
                      />
                      <span>Increase savings by:</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={scenarios.increaseSavings.percent || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setScenarios({
                            ...scenarios,
                            increaseSavings: {
                              ...scenarios.increaseSavings,
                              percent: value,
                              enabled: value > 0 || scenarios.increaseSavings.enabled
                            }
                          });
                        }}
                        placeholder="0"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500">% of income</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </Card>
    </div>
  );
}

