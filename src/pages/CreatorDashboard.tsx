import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { Creator, CreatorStats } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function CreatorDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'creator') {
      loadCreatorData();
    } else {
      navigate('/dashboard');
    }
  }, [user, profile]);

  const loadCreatorData = async () => {
    try {
      // Load creator record
      const { data: creatorData, error: creatorError } = await supabase
        .from('creators')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (creatorError) throw creatorError;
      setCreator(creatorData);

      // Load stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_creator_stats', {
        p_creator_id: user!.id,
      });

      if (statsError) throw statsError;
      setStats(statsData || { referred_users_count: 0, total_paid_unlocks: 0 });
    } catch (err) {
      console.error('Error loading creator data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <p>Creator profile not found.</p>
        </Card>
      </div>
    );
  }

  const referralUrl = `${window.location.origin}/signup?ref=${creator.referral_code}`;
  const referralLinkShort = `/r/${creator.referral_code}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
          <div className="space-x-4">
            <Link to="/dashboard">
              <Button variant="outline">User Dashboard</Button>
            </Link>
            <Button variant="outline" onClick={() => supabase.auth.signOut()}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Your Referral Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code</label>
              <div className="flex items-center space-x-2">
                <code className="px-3 py-2 bg-gray-100 rounded font-mono text-lg">{creator.referral_code}</code>
                <Button variant="outline" onClick={() => copyToClipboard(creator.referral_code)}>
                  Copy
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referral Link</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={referralUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
                <Button variant="outline" onClick={() => copyToClipboard(referralUrl)}>
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Statistics</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{stats?.referred_users_count || 0}</div>
              <div className="text-gray-600 mt-1">Referred Users</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{stats?.total_paid_unlocks || 0}</div>
              <div className="text-gray-600 mt-1">Paid Unlocks</div>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

