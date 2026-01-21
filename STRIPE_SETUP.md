# Stripe Payment Integration Setup

## Overview
The app uses Stripe Checkout for one-time payments to unlock survey results. Currently, the payment flow requires backend implementation.

## Required Steps

### 1. Stripe Account Setup
- Create a Stripe account at https://stripe.com
- Get your API keys from the Stripe Dashboard (Test mode for development, Live mode for production)
- Add `VITE_STRIPE_PUBLISHABLE_KEY` to your `.env.local` file

### 2. Backend Endpoint Required

You need to create a serverless function or API route that creates a Stripe Checkout Session. Examples:

#### Option A: Vercel Serverless Function

Create `api/create-checkout-session.ts`:

```typescript
import Stripe from 'stripe';
import { NextApiRequest, NextApiResponse } from 'next';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId } = req.body;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Unlock Survey Results',
            },
            unit_amount: 499, // $4.99 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/session/${sessionId}/results?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/session/${sessionId}/results?payment=cancelled`,
      metadata: {
        sessionId,
      },
    });

    return res.status(200).json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
```

#### Option B: Supabase Edge Function

Create `supabase/functions/create-checkout-session/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { sessionId } = await req.json();

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Unlock Survey Results',
            },
            unit_amount: 499,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('APP_URL')}/session/${sessionId}/results?payment=success`,
      cancel_url: `${Deno.env.get('APP_URL')}/session/${sessionId}/results?payment=cancelled`,
      metadata: {
        sessionId,
      },
    });

    return new Response(JSON.stringify({ url: checkoutSession.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 3. Stripe Webhook Setup

Create a webhook endpoint to handle payment success:

```typescript
// api/webhook-stripe.ts or similar

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sig = req.headers['stripe-signature']!;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed.`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const sessionId = session.metadata?.sessionId;

    if (sessionId) {
      // Unlock the results in Supabase
      await supabase
        .from('summaries')
        .update({ unlocked: true })
        .eq('session_id', sessionId);

      // Create payment record
      await supabase.from('payments').insert({
        session_id: sessionId,
        user_id: session.metadata?.userId,
        creator_id: session.metadata?.creatorId || null,
        amount_cents: session.amount_total || 499,
        currency: session.currency || 'usd',
        provider: 'stripe',
        provider_payment_intent_id: session.payment_intent as string,
        status: 'succeeded',
      });
    }
  }

  res.json({ received: true });
}
```

### 4. Environment Variables

Add to your `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

### 5. Update Frontend Code

Update `src/pages/ResultsPage.tsx` to call your backend endpoint:

```typescript
const handleUnlock = async () => {
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });

    const { url } = await response.json();
    window.location.href = url;
  } catch (err) {
    alert('Failed to initialize payment');
  }
};
```

## Testing

1. Use Stripe test cards: https://stripe.com/docs/testing
2. Test successful payment: `4242 4242 4242 4242`
3. Verify webhook receives events
4. Check that results are unlocked in database

## Production Checklist

- [ ] Switch to Live mode API keys
- [ ] Set up production webhook endpoint
- [ ] Test payment flow end-to-end
- [ ] Set up monitoring/alerts
- [ ] Configure refund policy (currently no refunds as per requirements)

