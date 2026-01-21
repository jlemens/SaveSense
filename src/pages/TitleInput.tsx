import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export function TitleInput() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please enter a survey title');
      return;
    }

    if (!sessionId) {
      setError('Session ID is missing');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('survey_sessions')
        .update({ title: title.trim() } as any)
        .eq('id', sessionId!);

      if (updateError) throw updateError;

      // Navigate to income flow
      navigate(`/session/${sessionId}/income`);
    } catch (err) {
      console.error('Error saving title:', err);
      setError(err instanceof Error ? err.message : 'Failed to save title');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Name Your Survey</h1>
        <p className="text-gray-600 mb-6">
          Give your survey a name to help you identify it later. You can change this anytime.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Survey Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., January 2024 Budget, Q1 Analysis, etc."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              disabled={loading}
              autoFocus
              maxLength={100}
            />
            <p className="text-xs text-gray-500 mt-1">
              {title.length}/100 characters
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()} className="flex-1">
              {loading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


