# Deployment Guide for Inputs → Outputs

## Deploying to Vercel

### Prerequisites
1. A GitHub account
2. A Vercel account (sign up at [vercel.com](https://vercel.com))
3. Your Supabase project URL and anon key

### Step 1: Push to GitHub

1. Create a new GitHub repository (if you haven't already)
2. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect your project settings (it should detect Vite/React)

### Step 3: Configure Environment Variables

**Before deploying, you MUST add these environment variables in Vercel:**

1. In your Vercel project settings, go to **Settings** → **Environment Variables**
2. Add these two variables:

   - **Variable Name:** `VITE_SUPABASE_URL`
     - **Value:** Your Supabase project URL (found in Supabase Dashboard → Settings → API)
     - **Environment:** Production, Preview, Development (check all)

   - **Variable Name:** `VITE_SUPABASE_ANON_KEY`
     - **Value:** Your Supabase anon/public key (found in Supabase Dashboard → Settings → API)
     - **Environment:** Production, Preview, Development (check all)

3. Click **Save** for each variable

### Step 4: Deploy

1. Click **"Deploy"** button in Vercel
2. Wait for the build to complete (usually 1-2 minutes)
3. Once deployed, you'll get a URL like: `https://your-app-name.vercel.app`

### Step 5: Test Your Deployment

1. Visit your deployed URL
2. Test signup/login
3. Test the full survey flow
4. Verify everything works on mobile/iOS

### Updating Your App

After you make changes locally:

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   git push
   ```

2. Vercel will **automatically deploy** your changes! 
   - Every push to `main` branch triggers a new deployment
   - You can also manually trigger deployments in the Vercel dashboard

### Custom Domain (Optional)

1. In Vercel project → **Settings** → **Domains**
2. Add your custom domain
3. Follow Vercel's DNS instructions to connect it

---

## Environment Variables Reference

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase public/anonymous key | Supabase Dashboard → Settings → API → Project API keys → `anon` `public` |

---

## Troubleshooting

### Build fails?
- Check that all environment variables are set in Vercel
- Make sure your `package.json` has all dependencies listed
- Check build logs in Vercel dashboard for specific errors

### App loads but shows errors?
- Verify environment variables are correctly set
- Check browser console for specific error messages
- Ensure Supabase RLS policies allow public access where needed

### Can't access from phone?
- Make sure you're using the production URL (not localhost)
- Check that HTTPS is working (Vercel provides this automatically)
- Clear browser cache on your phone if needed
