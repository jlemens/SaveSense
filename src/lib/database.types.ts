// Database types matching the actual schema
export type Database = {
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
        Insert: {
          id: string;
          email: string;
          role?: 'user' | 'creator';
          creator_id?: string | null;
          referral_code_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'user' | 'creator';
          creator_id?: string | null;
          referral_code_used?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      creators: {
        Row: {
          id: string;
          display_name: string;
          referral_code: string;
          payout_preference: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          referral_code: string;
          payout_preference?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          referral_code?: string;
          payout_preference?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
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
        Insert: {
          id?: string;
          user_id: string;
          status?: 'in_progress' | 'completed';
          title: string;
          started_at?: string;
          completed_at?: string | null;
          expires_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: 'in_progress' | 'completed';
          title?: string;
          started_at?: string;
          completed_at?: string | null;
          expires_at?: string;
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
        Insert: {
          id?: string;
          session_id: string;
          flow_type: 'income' | 'expense';
          question_id: string;
          category?: string | null;
          raw_value?: unknown;
          normalized_monthly_value?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          flow_type?: 'income' | 'expense';
          question_id?: string;
          category?: string | null;
          raw_value?: unknown;
          normalized_monthly_value?: number | null;
          created_at?: string;
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
        Insert: {
          session_id: string;
          total_income?: number;
          total_expenses?: number;
          net_monthly?: number;
          unlocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          total_income?: number;
          total_expenses?: number;
          net_monthly?: number;
          unlocked?: boolean;
          created_at?: string;
          updated_at?: string;
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
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          creator_id?: string | null;
          amount_cents: number;
          currency?: string;
          provider?: string;
          provider_payment_intent_id?: string | null;
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          creator_id?: string | null;
          amount_cents?: number;
          currency?: string;
          provider?: string;
          provider_payment_intent_id?: string | null;
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      calculate_session_summary: {
        Args: {
          p_session_id: string;
        };
        Returns: void;
      };
      get_creator_stats: {
        Args: {
          p_creator_id: string;
        };
        Returns: {
          referred_users_count: number;
          total_paid_unlocks: number;
        }[];
      };
    };
  };
};

