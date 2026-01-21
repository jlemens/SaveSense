import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { SurveySession } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SurveySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('survey_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false }) as any;

      if (error) {
        console.error('Error loading sessions:', error);
        throw error;
      }
      
      // Only update if we got valid data
      if (data) {
        setSessions(data as SurveySession[]);
      }
    } catch (err) {
      console.error('Error loading sessions:', err);
      // Don't clear sessions on error, keep existing state
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      // First, verify profile exists, create if it doesn't
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user!.id)
        .single();

      if (profileError || !profileData) {
        console.warn('Profile not found, creating it now:', profileError);
        // Profile doesn't exist, create it
        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user!.id,
            email: user!.email || '',
            role: 'user',
          } as any);

        if (createError) {
          console.error('Error creating profile:', createError);
          alert(`Failed to create profile: ${createError.message}`);
          return;
        }
      }

      const { data, error } = await supabase
        .from('survey_sessions')
        .insert({
          user_id: user!.id,
          status: 'in_progress',
          title: 'My Survey', // Default title, will be updated in TitleInput
        } as any)
        .select()
        .single() as any;

      if (error) {
        console.error('Session creation error:', error);
        throw error;
      }
      
      navigate(`/session/${data.id}/title`);
    } catch (err: unknown) {
      console.error('Error creating session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to create new session: ${errorMessage}`);
    }
  };

  const handleEditTitle = (sessionId: string, currentTitle: string) => {
    setEditingTitleId(sessionId);
    setEditingTitle(currentTitle);
  };

  const handleSaveTitle = async (sessionId: string) => {
    if (!editingTitle.trim()) {
      alert('Title cannot be empty');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('survey_sessions')
        .update({ title: editingTitle.trim() } as any)
        .eq('id', sessionId)
        .eq('user_id', user!.id)
        .select() as any;

      if (error) {
        console.error('Supabase error updating title:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No rows were updated. The session may not exist or you may not have permission.');
      }

      // Update local state
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: editingTitle.trim() } : s))
      );

      setEditingTitleId(null);
      setEditingTitle('');
    } catch (err) {
      console.error('Error updating title:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const detailedMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : errorMessage;
      alert(`Failed to update title: ${detailedMessage}\n\nPlease make sure you have run the database migration (007_add_session_title.sql) in Supabase.`);
    }
  };

  const handleCancelEditTitle = () => {
    setEditingTitleId(null);
    setEditingTitle('');
  };

  const handleDeleteSession = async (sessionId: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to delete this survey?\n\nThis will permanently delete all survey data including:\n- All income and expense answers\n- Summary calculations\n- Payment records\n\nThis action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    // Set deleting state to prevent double-clicks
    setDeletingSessionId(sessionId);

    try {
      // Delete the session (cascade will delete related responses, summaries, etc.)
      const { error, count } = await supabase
        .from('survey_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user!.id)
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      // Check if any rows were actually deleted
      // Note: Supabase delete doesn't return count in the way we expect, so we'll verify differently
      // Remove from state immediately (optimistic update)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      
      // Wait a moment for the deletion to propagate
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Reload sessions to ensure consistency with database
      const { data: freshData, error: reloadError } = await supabase
        .from('survey_sessions')
        .select('*')
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false });

      if (reloadError) {
        console.error('Error reloading sessions:', reloadError);
        // Don't throw - we already updated the UI optimistically
      } else if (freshData) {
        // Update with fresh data - if the session is still there, it will reappear
        // If it's deleted, it won't be in the list
        setSessions(freshData);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Check if it's an RLS policy error
      if (errorMessage.includes('policy') || errorMessage.includes('permission') || errorMessage.includes('row-level security')) {
        alert('You do not have permission to delete this survey. Please contact support if this issue persists.');
      } else {
        alert(`Failed to delete survey: ${errorMessage}\n\nPlease try again.`);
      }
      
      // Reload sessions to ensure UI is in sync
      await loadSessions();
    } finally {
      // Clear deleting state
      setDeletingSessionId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Inputs → Outputs</h1>
          <div className="space-x-4">
            <span className="text-gray-600">{profile?.email}</span>
            <Link to="/login">
              <Button variant="outline" onClick={() => supabase.auth.signOut()}>
                Sign Out
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-4">Your Survey Sessions</h2>
          <Button onClick={createNewSession}>Start New Survey</Button>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <p className="text-gray-600">You haven't started any surveys yet.</p>
            <Button onClick={createNewSession} className="mt-4">
              Start Your First Survey
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.id}>
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    {editingTitleId === session.id ? (
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                          maxLength={100}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveTitle(session.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEditTitle();
                            }
                          }}
                        />
                        <Button
                          onClick={() => handleSaveTitle(session.id)}
                          className="text-sm"
                          disabled={!editingTitle.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelEditTitle}
                          className="text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {session.title || `Session ${new Date(session.started_at).toLocaleDateString()}`}
                        </h3>
                        <button
                          onClick={() => handleEditTitle(session.id, session.title || 'My Survey')}
                          className="text-gray-400 hover:text-gray-600 text-sm"
                          title="Edit title"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                    <p className="text-gray-600 text-sm">
                      {new Date(session.started_at).toLocaleDateString()} • {session.status === 'completed' ? 'Completed' : 'In Progress'}
                    </p>
                  </div>
                  {editingTitleId !== session.id && (
                  <div className="flex gap-2">
                    {session.status === 'completed' ? (
                      <Link to={`/session/${session.id}/results`}>
                        <Button>View Results</Button>
                      </Link>
                    ) : (
                      <Link to={`/session/${session.id}`}>
                        <Button>Continue</Button>
                      </Link>
                    )}
                    <Link to={`/session/${session.id}/review`}>
                      <Button variant="outline">Edit</Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingSessionId === session.id}
                    >
                      {deletingSessionId === session.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

