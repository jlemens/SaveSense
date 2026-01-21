# Inputs → Outputs

A production-ready web application that helps users understand their monthly cashflow by collecting income + expense inputs via a guided survey, then calculating monthly net surplus/deficit.

## Tech Stack

- React + TypeScript + Vite
- React Router DOM
- Supabase (Auth + Postgres)
- Stripe (Payments)
- Tailwind CSS (Styling)
- Vercel (Deployment)

## Features

- ✅ User authentication with referral code support
- ✅ Creator/affiliate system with referral tracking
- ✅ Guided income survey (multi-stream with frequency normalization)
- ✅ Comprehensive expense survey (decision-tree based on flowsheet)
- ✅ Server-side summary calculation
- ✅ Payment-gated results ($4.99 one-time)
- ✅ CSV export
- ✅ Session management (save & continue later, 10-day expiration)
- ✅ Clean, minimal UI

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Create `.env.local` file (copy from `.env.example`):**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

3. **Set up Supabase:**
   - Create a new Supabase project at https://supabase.com
   - Go to SQL Editor and run migrations in order:
     - `supabase/migrations/001_initial_schema.sql`
     - `supabase/migrations/002_rls_policies.sql`
     - `supabase/migrations/003_summary_calculation_function.sql`
   - Get your project URL and anon key from Settings > API
   - Copy to `.env.local`

4. **Run development server:**
```bash
npm run dev
```

5. **Set up Stripe (see `STRIPE_SETUP.md` for detailed instructions):**
   - Create a Stripe account
   - Get your publishable key from Stripe Dashboard
   - **Important:** Set up backend endpoint for checkout session creation (required for payments)
   - Set up webhook to handle payment success

## Database Schema

The app uses the following tables:
- `profiles` - User profiles with role and referral tracking
- `creators` - Creator metadata and referral codes
- `survey_sessions` - Survey session tracking
- `survey_responses` - Individual question responses
- `summaries` - Calculated summaries (server-side via trigger)
- `payments` - Payment records

See `supabase/migrations/` for complete SQL schema.

## Payment Integration

**Important:** The payment flow requires backend implementation. The frontend is ready, but you need to:

1. Create a backend endpoint (API route/serverless function) to create Stripe Checkout Sessions
2. Set up a Stripe webhook endpoint to handle payment success and unlock results

See `STRIPE_SETUP.md` for complete setup instructions with code examples.

## User Flows

### Regular User Flow:
1. Sign up (optionally with referral code)
2. Start a survey session
3. Complete income flow (add multiple income streams)
4. Complete expense flow (guided decision-tree)
5. View locked results (blurred)
6. Pay $4.99 to unlock results
7. View full results and export CSV

### Creator Flow:
1. Sign up as creator
2. Get unique referral code
3. Share referral link
4. View dashboard with referral stats

## Deployment

Built for Vercel deployment.

### Vercel Setup:
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_STRIPE_PUBLISHABLE_KEY`
3. Deploy

The `vercel.json` file includes rewrites for client-side routing.

### Backend Requirements:
- Set up serverless functions for Stripe Checkout Session creation
- Set up Stripe webhook endpoint
- See `STRIPE_SETUP.md` for implementation details

## Development Notes

- Session expiration: 10 days (configurable in schema)
- Payment amount: $4.99 (hardcoded, can be made configurable)
- No refunds policy (as per requirements)
- Results calculation happens server-side via database trigger
- Table questions with dynamic rows use previous multi-select answers

## Project Structure

```
src/
  components/     # Reusable UI components
  context/        # React context (Auth)
  lib/           # Utilities, flows, Supabase client
  pages/         # Page components
  types/         # TypeScript types
  styles/        # Global styles
supabase/
  migrations/    # Database migrations
```

## License

Private - All rights reserved
