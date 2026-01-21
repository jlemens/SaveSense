import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Database types (minimal, can be expanded)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'user' | 'creator';
          creator_id: string | null;
          referral_code_used: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      creators: {
        Row: {
          id: string;
          display_name: string;
          referral_code: string;
          payout_preference: unknown;
          created_at: string;
          updated_at: string;
        };
      };
      survey_sessions: {
        Row: {
          id: string;
          user_id: string;
          status: 'in_progress' | 'completed';
          title: string;
          started_at: string;
          completed_at: string | null;
          expires_at: string;
        };
      };
      survey_responses: {
        Row: {
          id: string;
          session_id: string;
          flow_type: 'income' | 'expense';
          question_id: string;
          category: string | null;
          raw_value: unknown;
          normalized_monthly_value: number | null;
          created_at: string;
        };
      };
      summaries: {
        Row: {
          session_id: string;
          total_income: number;
          total_expenses: number;
          net_monthly: number;
          unlocked: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          creator_id: string | null;
          amount_cents: number;
          currency: string;
          provider: string;
          provider_payment_intent_id: string | null;
          status: 'pending' | 'succeeded' | 'failed' | 'refunded';
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}

