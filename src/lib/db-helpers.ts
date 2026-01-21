// Helper functions to work around Supabase type inference issues
// These help TypeScript understand the query results until we can properly generate types

import type { SurveyResponse, SurveySession, Summary } from '../types';

// Type assertions for Supabase query results
export function asSurveyResponse(data: unknown): SurveyResponse {
  return data as SurveyResponse;
}

export function asSurveyResponses(data: unknown): SurveyResponse[] {
  return (data || []) as SurveyResponse[];
}

export function asSurveySession(data: unknown): SurveySession {
  return data as SurveySession;
}

export function asSummary(data: unknown): Summary {
  return data as Summary;
}
