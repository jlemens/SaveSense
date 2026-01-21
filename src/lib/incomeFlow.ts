import type { SurveyFlow } from '../types';

// Income Flow Definition
// Note: Income flow is simpler - it's handled as a custom flow in the IncomeFlow component
// This is just a placeholder structure if we want to use SurveyEngine for income too
export const incomeFlow: SurveyFlow = {
  'income.has_income': {
    id: 'income.has_income',
    question: 'Do you have income sources to add?',
    type: 'yes_no',
    if_yes: 'income.streams',
    if_no: 'income.complete',
    maps_to_category: undefined,
  },
  'income.complete': {
    id: 'income.complete',
    question: 'Income collection complete',
    type: 'summary',
    maps_to_category: undefined,
  },
};

// Income flow is handled custom in IncomeFlow component, not using SurveyEngine

