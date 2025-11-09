'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setLoading(true);
      
      // Check auth
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        setError('Auth error: ' + authError.message);
        return;
      }
      
      setUser(userData?.user || null);
      
      // Check profile
      if (userData?.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .maybeSingle();
        
        if (profileError) {
          setError('Profile error: ' + profileError.message);
        } else {
          setProfile(profileData);
        }
      }
    } catch (e: any) {
      setError('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function createTestProfile() {
    try {
      if (!user) {
        alert('You need to be logged in first!');
        return;
      }
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: 'Test User',
          email: user.email,
          todays_points: 0,
          month_points: 0,
          total_points: 0,
          total_tasks: 0,
        });
      
      if (error) {
        alert('Error creating profile: ' + error.message);
      } else {
        alert('Profile created! Refresh to see it.');
        checkAuth();
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Debug Info</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          {user ? (
            <div className="space-y-2">
              <p className="text-green-600 font-semibold">✓ Logged In</p>
              <div className="bg-slate-50 p-4 rounded">
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-red-600 font-semibold">✗ Not Logged In</p>
              <p className="text-sm text-slate-600">
                You need to sign up or log in for points to be saved to the database.
              </p>
              <div className="flex gap-3 mt-4">
                <Button asChild>
                  <a href="/signup">Sign Up</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/login">Log In</a>
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Profile Status</h2>
          {!user ? (
            <p className="text-slate-500">Log in to see profile status</p>
          ) : profile ? (
            <div className="space-y-2">
              <p className="text-green-600 font-semibold">✓ Profile Exists in Database</p>
              <div className="bg-slate-50 p-4 rounded space-y-2">
                <p><strong>Name:</strong> {profile.full_name || '(none)'}</p>
                <p><strong>Email:</strong> {profile.email || '(none)'}</p>
                <p><strong>Today's Points:</strong> {profile.todays_points ?? 0}</p>
                <p><strong>Month Points:</strong> {profile.month_points ?? 0}</p>
                <p><strong>Total Points:</strong> {profile.total_points ?? 0}</p>
                <p><strong>Total Tasks:</strong> {profile.total_tasks ?? 0}</p>
                <p><strong>Last Activity:</strong> {profile.last_activity_date || '(none)'}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-amber-600 font-semibold">⚠ No Profile in Database</p>
              <p className="text-sm text-slate-600">
                Your profile hasn't been created yet. This will be created automatically when you complete your first task, or you can create it now.
              </p>
              <Button onClick={createTestProfile} className="mt-4">
                Create Profile Now
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">How Points Work</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <p><strong>1. You must be logged in</strong> - Points are saved to your Supabase profile</p>
            <p><strong>2. Profile auto-creates</strong> - First task completion creates your profile</p>
            <p><strong>3. Points accumulate</strong> - Today's, Monthly, and Total points all update</p>
            <p><strong>4. Local + Database</strong> - Points show instantly (local) and sync to database</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Open your browser console (F12) to see detailed logging when you complete tasks on the Dashboard.
          </p>
        </div>

        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
