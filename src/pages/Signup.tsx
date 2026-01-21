import { useState, FormEvent, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Toast } from '../components/Toast';
import { parseReferralCodeFromUrl, generateReferralCode } from '../lib/utils';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'creator'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || parseReferralCodeFromUrl();

  useEffect(() => {
    // Store referral code in sessionStorage if present
    if (referralCode) {
      sessionStorage.setItem('referral_code', referralCode);
    }
  }, [referralCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign up user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Failed to create user');

      // Check if email confirmation is required
      // Supabase returns a user even when confirmation is required, but no session
      if (!data.session) {
        // Email confirmation required - trigger will create profile, but we can't update it yet
        setToast({ 
          message: 'Account created! Please check your email to verify your account before signing in.', 
          type: 'success' 
        });
        setError(null);
        setLoading(false);
        // Clear the form
        setEmail('');
        setPassword('');
        return;
      }

      // Wait a moment for the trigger to create the profile, then update role
      // The trigger should create the profile, but we'll handle it if it doesn't exist yet
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
      
      // Check if profile exists, if not create it, otherwise update it
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is okay
        console.error('Error checking profile:', checkError);
      }

      if (!existingProfile) {
        // Profile doesn't exist (trigger didn't fire), create it manually
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({ id: data.user.id, email: data.user.email || email, role } as any);
        
        if (insertError) {
          console.error('Error inserting profile:', insertError);
          throw new Error(`Failed to create profile: ${insertError.message}`);
        }
      } else {
        // Profile exists, update the role
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role } as any)
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
          throw new Error(`Failed to update profile: ${profileError.message}`);
        }
      }

      // Handle referral code if present
      if (referralCode || sessionStorage.getItem('referral_code')) {
        const code = referralCode || sessionStorage.getItem('referral_code');
        
        if (code) {
          // Look up creator by referral code
          const { data: creator, error: creatorError } = await supabase
            .from('creators')
            .select('id')
            .eq('referral_code', code)
            .single() as any;

          if (!creatorError && creator) {
            // Update profile with creator_id
            await supabase
              .from('profiles')
              .update({
                creator_id: (creator as any).id,
                referral_code_used: code,
              } as any)
              .eq('id', data.user.id);
          }
          
          sessionStorage.removeItem('referral_code');
        }
      }

      // If creator, create creator record
      if (role === 'creator') {
        // Generate unique referral code
        let newReferralCode = generateReferralCode();
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
          const { data: existing } = await supabase
            .from('creators')
            .select('id')
            .eq('referral_code', newReferralCode)
            .single() as any;
          
          if (!existing) {
            isUnique = true;
          } else {
            newReferralCode = generateReferralCode();
            attempts++;
          }
        }

        const { error: creatorError } = await supabase
          .from('creators')
          .insert({
            id: data.user.id,
            display_name: email.split('@')[0], // Default to email prefix
            referral_code: newReferralCode,
          } as any);

        if (creatorError) throw creatorError;
      }

      setToast({ message: 'Account created! Please check your email to confirm.', type: 'success' });
      
      // Redirect based on role
      setTimeout(() => {
        navigate(role === 'creator' ? '/creator' : '/dashboard');
      }, 2000);
    } catch (err: unknown) {
      console.error('Signup error:', err);
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
      setToast({ message: `Error: ${message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Sign Up</h1>
        {referralCode && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
            Referral code: {referralCode}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              I am a...
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as 'user' | 'creator')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="user">Regular User</option>
              <option value="creator">Creator/Affiliate</option>
            </select>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <span className="text-gray-600">Already have an account? </span>
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}

