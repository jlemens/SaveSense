export type UserRole = 'user' | 'creator';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  creator_id: string | null;
  referral_code_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface Creator {
  id: string;
  display_name: string;
  referral_code: string;
  payout_preference: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type SessionStatus = 'in_progress' | 'completed';

export interface SurveySession {
  id: string;
  user_id: string;
  status: SessionStatus;
  title: string;
  started_at: string;
  completed_at: string | null;
  expires_at: string;
}

export type FlowType = 'income' | 'expense';

export interface SurveyResponse {
  id: string;
  session_id: string;
  flow_type: FlowType;
  question_id: string;
  category: string | null;
  raw_value: unknown;
  normalized_monthly_value: number | null;
  created_at: string;
}

export interface Summary {
  session_id: string;
  total_income: number;
  total_expenses: number;
  net_monthly: number;
  unlocked: boolean;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  session_id: string;
  user_id: string;
  creator_id: string | null;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_payment_intent_id: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatorStats {
  referred_users_count: number;
  total_paid_unlocks: number;
}

// Survey Engine Types
export type QuestionType = 
  | 'yes_no'
  | 'single_select'
  | 'multi_select'
  | 'currency'
  | 'number'
  | 'table'
  | 'summary';

export interface QuestionNode {
  id: string;
  question: string;
  type: QuestionType;
  questionNumber?: string; // Hard-coded question number (e.g., "2", "3a", "3b")
  categoryLabel?: string; // Category label for the question group (e.g., "Housing", "Transportation")
  options?: string[];
  rows?: string[];
  columns?: string[];
  min?: number;
  max?: number;
  if_yes?: string;
  if_no?: string;
  [key: `if_${string}`]: string; // Dynamic branching based on option values
  multi_branch?: Record<string, string | null>; // For multi-select questions: maps each option to a follow-up question
  next?: string;
  maps_to_category?: string;
  help_text?: string;
  default?: unknown;
}

export interface SurveyFlow {
  [questionId: string]: QuestionNode;
}

export interface SurveyAnswer {
  question_id: string;
  value: unknown;
  category?: string;
  normalized_monthly_value?: number;
}

// Income Stream Types
export type IncomeType = 'W2' | '1099' | 'Business' | 'Rental' | 'Investment' | 'Partner' | 'Other';
export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'annual';

export interface IncomeStream {
  type: IncomeType;
  amount: number;
  frequency: IncomeFrequency;
}

