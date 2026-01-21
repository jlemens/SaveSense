import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { SurveyFlow, QuestionNode, SurveyAnswer } from '../types';
import { Button } from './Button';
import { Card } from './Card';

interface SurveyEngineProps {
  flow: SurveyFlow;
  startQuestionId: string;
  sessionId: string;
  flowType: 'income' | 'expense';
  onComplete: () => void;
}

export function SurveyEngine({ flow, startQuestionId, sessionId, flowType, onComplete }: SurveyEngineProps) {
  const [searchParams] = useSearchParams();
  const questionParam = searchParams.get('question');
  const [currentQuestionId, setCurrentQuestionId] = useState<string>(startQuestionId);
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [answerHistory, setAnswerHistory] = useState<string[]>([]);
  const [questionQueue, setQuestionQueue] = useState<string[]>([]); // Queue for chained follow-up questions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answersLoaded, setAnswersLoaded] = useState(false);
  const navigate = useNavigate();

  const currentQuestion = flow[currentQuestionId];
  if (!currentQuestion) {
    // Question was removed from flow but exists in database
    // Redirect to dashboard with error message
    console.error(`Question ${currentQuestionId} not found in flow. This question may have been removed.`);
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Question Not Found</h2>
            <p className="text-gray-700 mb-4">
              The question you're trying to edit no longer exists in the survey flow.
              This may have been removed in a recent update.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              <Button variant="outline" onClick={() => navigate(`/session/${sessionId}`)}>
                Continue Survey
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Auto-complete when reaching summary question
  useEffect(() => {
    if (currentQuestion.type === 'summary') {
      // Small delay to ensure the question is rendered, then complete
      const timer = setTimeout(() => {
        onComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentQuestionId, currentQuestion.type, onComplete]);

  // Load existing answers on mount and clear state when session changes
  useEffect(() => {
    // Clear answers state when session changes to prevent stale data
    setAnswers({});
    setAnswerHistory([]);
    setQuestionQueue([]);
    setCurrentQuestionId(startQuestionId);
    setAnswersLoaded(false);
    
    loadAnswers();
  }, [sessionId, flowType]);

  // Update current question if question param changes (only after answers are loaded)
  useEffect(() => {
    if (answersLoaded && questionParam && flow[questionParam]) {
      setCurrentQuestionId(questionParam);
      // Clear URL param after setting
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('question');
      const newSearch = newSearchParams.toString();
      navigate({ search: newSearch ? `?${newSearch}` : '' }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionParam, answersLoaded]);

  // Find the furthest unanswered question in the flow
  const findFurthestUnansweredQuestion = (
    flow: SurveyFlow,
    startId: string,
    answers: Record<string, SurveyAnswer>
  ): string => {
    const visited = new Set<string>();
    let furthestAnswered = startId;
    
    const getNextQuestionId = (question: QuestionNode, answer: unknown): string | null => {
      if (question.type === 'summary') return null;
      
      if (question.type === 'yes_no') {
        const boolAnswer = answer as boolean;
        return boolAnswer ? question.if_yes || question.next || null : question.if_no || question.next || null;
      }
      
      if (question.type === 'single_select') {
        const selectedOption = answer as string;
        const branchKey = `if_${selectedOption}` as keyof QuestionNode;
        const branchId = question[branchKey] as string | undefined;
        return branchId || question.next || null;
      }
      
      if (question.type === 'multi_select' && question.multi_branch) {
        const selectedOptions = answer as string[];
        const followUpQuestions: string[] = [];
        selectedOptions.forEach((option) => {
          const followUp = question.multi_branch![option];
          if (followUp) followUpQuestions.push(followUp);
        });
        return followUpQuestions.length > 0 ? followUpQuestions[0] : question.next || null;
      }
      
      return question.next || null;
    };
    
    const traverse = (questionId: string): void => {
      if (visited.has(questionId) || !flow[questionId]) return;
      visited.add(questionId);
      
      const question = flow[questionId];
      const answer = answers[questionId];
      
      // If this question is answered, it's a candidate for furthest
      if (answer && answer.value !== undefined && answer.value !== null && answer.value !== '') {
        furthestAnswered = questionId;
        
        // Get the next question based on the actual answer
        const nextQuestionId = getNextQuestionId(question, answer.value);
        if (nextQuestionId) {
          traverse(nextQuestionId);
        }
      }
    };
    
    traverse(startId);
    
    // Now find the first unanswered question after the furthest answered one
    const findNextUnanswered = (questionId: string): string | null => {
      if (!flow[questionId]) return null;
      
      const answer = answers[questionId];
      if (!answer || answer.value === undefined || answer.value === null || answer.value === '') {
        return questionId;
      }
      
      const question = flow[questionId];
      const nextQuestionId = getNextQuestionId(question, answer.value);
      if (nextQuestionId) {
        const next = findNextUnanswered(nextQuestionId);
        if (next) return next;
      }
      
      return null;
    };
    
    const nextUnanswered = findNextUnanswered(furthestAnswered);
    return nextUnanswered || furthestAnswered;
  };

  const loadAnswers = async () => {
    try {
      const { data, error } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('session_id', sessionId)
        .eq('flow_type', flowType);

      if (error) throw error;

      const loadedAnswers: Record<string, SurveyAnswer> = {};
      
      (data as any)?.forEach((response: any) => {
        loadedAnswers[response.question_id] = {
          question_id: response.question_id,
          value: response.raw_value,
          category: response.category || undefined,
          normalized_monthly_value: response.normalized_monthly_value || undefined,
        };
      });

      setAnswers(loadedAnswers);
      
      // Find the furthest unanswered question
      let initialQuestionId = startQuestionId;
      if (questionParam && flow[questionParam]) {
        // If there's a question param, use it (for editing)
        initialQuestionId = questionParam;
      } else if (Object.keys(loadedAnswers).length > 0) {
        // Find the furthest unanswered question using actual answers
        initialQuestionId = findFurthestUnansweredQuestion(flow, startQuestionId, loadedAnswers);
      }
      
      setCurrentQuestionId(initialQuestionId);
      setAnswersLoaded(true);
    } catch (err) {
      console.error('Error loading answers:', err);
      setAnswersLoaded(true);
    }
  };

  const saveAnswer = async (questionId: string, value: unknown, normalizedValue?: number) => {
    try {
      const question = flow[questionId];
      const category = question.maps_to_category || null;

      const { error } = await supabase
        .from('survey_responses')
        .upsert(
          {
            session_id: sessionId,
            flow_type: flowType,
            question_id: questionId,
            category,
            raw_value: value,
            normalized_monthly_value: normalizedValue || null,
          },
          {
            onConflict: 'session_id,flow_type,question_id',
          }
        );

      if (error) throw error;
    } catch (err) {
      console.error('Error saving answer:', err);
      throw err;
    }
  };

  const getNextQuestionId = (question: QuestionNode, answer: unknown): string | null => {
    // Handle summary type (end of flow)
    if (question.type === 'summary') {
      return null;
    }

    // Handle yes/no branching
    if (question.type === 'yes_no') {
      const boolAnswer = answer as boolean;
      return boolAnswer ? question.if_yes || question.next || null : question.if_no || question.next || null;
    }

    // Handle single_select branching
    if (question.type === 'single_select') {
      const selectedOption = answer as string;
      const branchKey = `if_${selectedOption}` as keyof QuestionNode;
      const branchId = question[branchKey] as string | undefined;
      return branchId || question.next || null;
    }

    // Handle multi_select with multi_branch (for chained follow-up questions)
    if (question.type === 'multi_select' && question.multi_branch) {
      const selectedOptions = answer as string[];
      // Build queue of follow-up questions based on selections
      const followUpQuestions: string[] = [];
      selectedOptions.forEach((option) => {
        const followUp = question.multi_branch![option];
        if (followUp) {
          followUpQuestions.push(followUp);
        }
      });
      
      // If there are follow-up questions, queue them and return the first one
      if (followUpQuestions.length > 0) {
        // Store the queue in state (this will be used in handleAnswer)
        // We need to return the first question, but the queue management happens in handleAnswer
        return followUpQuestions[0];
      }
      
      // Otherwise, go to next question
      return question.next || null;
    }

    // Default to next
    return question.next || null;
  };

  const handleAnswer = async (value: unknown, normalizedValue?: number) => {
    setLoading(true);
    setError(null);

    try {
      // Save answer
      await saveAnswer(currentQuestionId, value, normalizedValue);

      // Update local state
      setAnswers((prev) => ({
        ...prev,
        [currentQuestionId]: {
          question_id: currentQuestionId,
          value,
          category: currentQuestion.maps_to_category || undefined,
          normalized_monthly_value: normalizedValue,
        },
      }));

      // Add to history for back navigation
      setAnswerHistory((prev) => [...prev, currentQuestionId]);

      // Get next question (this may set up a queue for multi-branch questions)
      const nextQuestionId = getNextQuestionId(currentQuestion, value);
      
      // If this was a multi-select with multi_branch, set up the queue
      if (currentQuestion.type === 'multi_select' && currentQuestion.multi_branch) {
        const selectedOptions = value as string[];
        const followUpQuestions: string[] = [];
        selectedOptions.forEach((option) => {
          const followUp = currentQuestion.multi_branch![option];
          if (followUp) {
            followUpQuestions.push(followUp);
          }
        });
        
        if (followUpQuestions.length > 1) {
          // Set queue with all follow-up questions except the first (which we're about to show)
          setQuestionQueue(followUpQuestions.slice(1));
        }
      }
      
      // Check if we're processing a queued question (not the initial multi-select)
      if (questionQueue.length > 0 && questionQueue[0] === currentQuestionId) {
        // Remove current question from queue
        const newQueue = questionQueue.slice(1);
        setQuestionQueue(newQueue);
        
        // If there are more questions in queue, go to next one
        if (newQueue.length > 0) {
          setCurrentQuestionId(newQueue[0]);
          setLoading(false);
          return;
        }
        // Queue is empty, check for default next
        const defaultNext = currentQuestion.next;
        if (defaultNext) {
          setCurrentQuestionId(defaultNext);
          setLoading(false);
          return;
        }
      }

      if (!nextQuestionId) {
        // Check if there are queued questions
        if (questionQueue.length > 0) {
          setCurrentQuestionId(questionQueue[0]);
          setQuestionQueue(questionQueue.slice(1));
        } else {
          // Check for default next (for questions that are part of a chain)
          const defaultNext = currentQuestion.next;
          if (defaultNext) {
            setCurrentQuestionId(defaultNext);
          } else {
            // Flow complete
            onComplete();
          }
        }
      } else {
        // If we have queued questions, we need to handle them after this next question
        // For now, proceed to next question and queue will be processed after
        setCurrentQuestionId(nextQuestionId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save answer';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (answerHistory.length > 0) {
      const previousQuestionId = answerHistory[answerHistory.length - 1];
      setAnswerHistory((prev) => prev.slice(0, -1));
      setCurrentQuestionId(previousQuestionId);
      // Clear queue when going back
      setQuestionQueue([]);
    }
  };

  const handleSaveAndContinueLater = async () => {
    // Save current answer if there's a value
    const currentAnswer = answers[currentQuestionId]?.value;
    if (currentAnswer !== undefined && currentAnswer !== null && currentAnswer !== '') {
      try {
        setLoading(true);
        await saveAnswer(currentQuestionId, currentAnswer, answers[currentQuestionId]?.normalized_monthly_value);
      } catch (err) {
        console.error('Error saving answer:', err);
        alert('Failed to save your progress. Please try again.');
        setLoading(false);
        return;
      }
    }
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  // Calculate progress (rough estimate based on questions answered)
  const totalQuestions = Object.keys(flow).length;
  const answeredQuestions = Object.keys(answers).length;
  const progress = Math.round((answeredQuestions / totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">
            {currentQuestion.questionNumber 
              ? (
                <>
                  <span className="text-gray-500 font-normal">
                    {currentQuestion.categoryLabel ? `${currentQuestion.categoryLabel} - ` : ''}Question #{currentQuestion.questionNumber}:
                  </span>{' '}
                  {currentQuestion.question}
                </>
              )
              : currentQuestion.question}
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}

          <QuestionRenderer
            key={currentQuestionId}
            question={currentQuestion}
            value={answers[currentQuestionId]?.value}
            onAnswer={handleAnswer}
            loading={loading}
            answers={answers}
            getPreviousQuestionId={(id) => {
              const historyIndex = answerHistory.indexOf(id);
              return historyIndex > 0 ? answerHistory[historyIndex - 1] : undefined;
            }}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={answerHistory.length === 0 || loading}
            >
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
            >
              Home
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={handleSaveAndContinueLater}
            disabled={loading}
          >
            Save & Continue Later
          </Button>
        </div>
      </Card>
    </div>
  );
}

// Question Renderer Component
interface QuestionRendererProps {
  question: QuestionNode;
  value: unknown;
  // normalizedValue is an optional second argument used for dollar amounts
  onAnswer: (value: unknown, normalizedValue?: number) => void;
  loading: boolean;
  answers: Record<string, SurveyAnswer>;
  getPreviousQuestionId: (currentId: string) => string | undefined;
}

function QuestionRenderer({ question, value, onAnswer, loading, answers, getPreviousQuestionId }: QuestionRendererProps) {
  switch (question.type) {
    case 'yes_no':
      return (
        <YesNoQuestion
          value={value as boolean | undefined}
          onAnswer={onAnswer}
          loading={loading}
        />
      );
    case 'single_select':
      return (
        <SingleSelectQuestion
          options={question.options || []}
          value={value as string | undefined}
          onAnswer={onAnswer}
          loading={loading}
        />
      );
    case 'multi_select':
      return (
        <MultiSelectQuestion
          options={question.options || []}
          value={value as string[] | undefined}
          onAnswer={onAnswer}
          loading={loading}
        />
      );
    case 'currency':
      return (
        <CurrencyQuestion
          value={value as number | undefined}
          onAnswer={onAnswer}
          loading={loading}
        />
      );
    case 'number':
      return (
        <NumberQuestion
          min={question.min}
          value={value as number | undefined}
          onAnswer={onAnswer}
          loading={loading}
        />
      );
    case 'table':
      // For table questions, try to find the previous question's answer
      // Look for common patterns: housing.utilities_check -> housing.utilities_amounts
      let previousQuestionId: string | undefined;
      if (question.id === 'housing.utilities_amounts') {
        previousQuestionId = 'housing.utilities_check';
      } else if (question.id === 'insurance.life_disability_amounts') {
        previousQuestionId = 'insurance.life_disability';
      } else if (question.id === 'debt.amounts') {
        previousQuestionId = 'debt.start';
      } else if (question.id === 'personal.amounts') {
        previousQuestionId = 'personal.start';
      } else if (question.id === 'misc.amounts') {
        previousQuestionId = 'misc.start';
      } else {
        previousQuestionId = getPreviousQuestionId(question.id);
      }
      
      return (
        <TableQuestion
          question={question}
          previousAnswer={previousQuestionId ? answers[previousQuestionId]?.value : undefined}
          rows={question.rows}
          columns={question.columns || []}
          value={value as Record<string, number> | undefined}
          onAnswer={onAnswer}
          loading={loading}
          answers={answers}
        />
      );
    case 'summary':
      // Summary question - auto-complete will be handled by useEffect
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Completing survey...</p>
        </div>
      );
    default:
      return <div>Unknown question type</div>;
  }
}

function YesNoQuestion({
  value,
  onAnswer,
  loading,
}: {
  value?: boolean;
  onAnswer: (value: boolean, normalizedValue?: number) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <Button
        variant={value === true ? 'primary' : 'outline'}
        onClick={() => onAnswer(true)}
        disabled={loading}
        className="w-full"
      >
        Yes
      </Button>
      <Button
        variant={value === false ? 'primary' : 'outline'}
        onClick={() => onAnswer(false)}
        disabled={loading}
        className="w-full"
      >
        No
      </Button>
    </div>
  );
}

function SingleSelectQuestion({
  options,
  value,
  onAnswer,
  loading,
}: {
  options: string[];
  value?: string;
  onAnswer: (value: string, normalizedValue?: number) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <Button
          key={option}
          variant={value === option ? 'primary' : 'outline'}
          onClick={() => onAnswer(option)}
          disabled={loading}
          className="w-full"
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

function MultiSelectQuestion({
  options,
  value = [],
  onAnswer,
  loading,
}: {
  options: string[];
  value?: string[];
  onAnswer: (value: string[], normalizedValue?: number) => void;
  loading: boolean;
}) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(value || []);

  const toggleOption = (option: string) => {
    const newValue = selectedOptions.includes(option)
      ? selectedOptions.filter((v) => v !== option)
      : [...selectedOptions, option];
    setSelectedOptions(newValue);
  };

  const handleContinue = () => {
    if (selectedOptions.length > 0) {
      onAnswer(selectedOptions);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={selectedOptions.includes(option) ? 'primary' : 'outline'}
            onClick={() => toggleOption(option)}
            disabled={loading}
            className="w-full"
          >
            {selectedOptions.includes(option) ? '✓ ' : ''}{option}
          </Button>
        ))}
      </div>
      <Button
        onClick={handleContinue}
        disabled={loading || selectedOptions.length === 0}
        className="w-full"
      >
        Continue
      </Button>
      {selectedOptions.length === 0 && (
        <p className="text-sm text-gray-500 text-center">Please select at least one option</p>
      )}
    </div>
  );
}

function CurrencyQuestion({
  value,
  onAnswer,
  loading,
}: {
  value?: number;
  // For expenses, the raw value is already monthly, so we also pass it as normalized
  onAnswer: (value: number, normalizedValue?: number) => void;
  loading: boolean;
}) {
  const [inputValue, setInputValue] = useState('');

  // Reset input when value prop changes (new question or cleared answer)
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(value.toString());
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(inputValue);
    if (!isNaN(numValue) && numValue >= 0) {
      onAnswer(numValue, numValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="number"
          step="0.01"
          min="0"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        Continue
      </Button>
    </form>
  );
}

function NumberQuestion({
  min,
  value,
  onAnswer,
  loading,
}: {
  min?: number;
  value?: number;
  onAnswer: (value: number, normalizedValue?: number) => void;
  loading: boolean;
}) {
  const [inputValue, setInputValue] = useState('');

  // Reset input when value prop changes (new question or cleared answer)
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInputValue(value.toString());
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseInt(inputValue);
    if (!isNaN(numValue) && (!min || numValue >= min)) {
      onAnswer(numValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="number"
          min={min}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        Continue
      </Button>
    </form>
  );
}

function TableQuestion({
  question,
  previousAnswer,
  rows,
  columns,
  value = {},
  onAnswer,
  loading,
  answers,
}: {
  question: QuestionNode;
  previousAnswer?: unknown;
  rows?: string[];
  columns: string[];
  value?: Record<string, number>;
  onAnswer: (value: Record<string, number>, normalizedValue?: number) => void;
  loading: boolean;
  answers: Record<string, SurveyAnswer>;
}) {
  const [tableData, setTableData] = useState<Record<string, number>>({});
  const previousQuestionIdRef = useRef<string>('');

  // Reset table data when question changes (not when value prop updates)
  useEffect(() => {
    if (question.id !== previousQuestionIdRef.current) {
      previousQuestionIdRef.current = question.id;
      if (value && Object.keys(value).length > 0) {
        setTableData(value);
      } else {
        setTableData({});
      }
    }
  }, [question.id, value]);

  const handleCellChange = (key: string, newValue: string) => {
    // Allow empty string while typing, but store 0 if empty
    if (newValue === '' || newValue === null || newValue === undefined) {
      setTableData((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    } else {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && numValue >= 0) {
        setTableData((prev) => ({ ...prev, [key]: numValue }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate normalized monthly value (sum of all values in table)
    const total = Object.values(tableData).reduce((sum, val) => sum + (val || 0), 0);
    onAnswer(tableData, total);
  };

  // Determine table rows:
  // 1. If rows are predefined, use them
  // 2. If previous answer was a multi_select (array), use those options
  // 3. Otherwise use keys from existing value or show empty table
  let tableRows: string[] = [];
  if (rows) {
    tableRows = rows;
  } else if (Array.isArray(previousAnswer) && previousAnswer.length > 0) {
    tableRows = previousAnswer.filter((item) => item !== 'None' && item !== 'Neither');
  } else if (Object.keys(value || {}).length > 0) {
    tableRows = Object.keys(value || {});
  } else {
    // For dynamic tables without previous answer, show empty state
    // In practice, this should rarely happen as the flow should provide the previous answer
    tableRows = [];
  }

  if (tableRows.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-md text-gray-600">
        <p>No items to enter. You can continue to the next question.</p>
        <Button onClick={() => onAnswer({}, 0)} disabled={loading} className="mt-4">
          Continue
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th key={col} className="text-left p-2 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row} className="border-b">
                <td className="p-2">{row}</td>
                <td className="p-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tableData[row] !== undefined ? (tableData[row] === 0 ? '0' : tableData[row].toString()) : ''}
                    onChange={(e) => handleCellChange(row, e.target.value)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        Continue
      </Button>
    </form>
  );
}

