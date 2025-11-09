'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

export default function DbTestPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const log = (msg: string) => {
    console.log(msg);
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    log('🔍 Checking authentication...');
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      log(`❌ Auth error: ${error.message}`);
      return;
    }
    
    if (data?.user) {
      setUser(data.user);
      log(`✅ Authenticated as: ${data.user.email} (ID: ${data.user.id})`);
    } else {
      log('⚠️ No authenticated user');
    }
  };

  const testRead = async () => {
    setIsLoading(true);
    log('📖 Testing READ from profiles...');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);

    if (error) {
      log(`❌ READ failed: ${error.message}`);
      log(`   Details: ${JSON.stringify(error)}`);
    } else {
      log(`✅ READ successful: Found ${data?.length || 0} profiles`);
      if (data && data.length > 0) {
        log(`   First profile: ${JSON.stringify(data[0], null, 2)}`);
      }
    }
    setIsLoading(false);
  };

  const testWrite = async () => {
    if (!user) {
      log('❌ Cannot test write - not authenticated');
      return;
    }

    setIsLoading(true);
    log('✍️ Testing WRITE to profiles...');

    const payload = {
      id: user.id,
      full_name: 'Test User',
      email: user.email,
      bio: 'Testing database write',
      updated_at: new Date().toISOString(),
    };

    log(`   Payload: ${JSON.stringify(payload, null, 2)}`);

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select();

    if (error) {
      log(`❌ WRITE failed: ${error.message}`);
      log(`   Error details: ${JSON.stringify(error, null, 2)}`);
      log(`   Hint: ${error.hint || 'N/A'}`);
      log(`   Code: ${error.code || 'N/A'}`);
    } else {
      log(`✅ WRITE successful!`);
      log(`   Result: ${JSON.stringify(data, null, 2)}`);
    }
    setIsLoading(false);
  };

  const testTaskCompletion = async () => {
    if (!user) {
      log('❌ Cannot test task completion - not authenticated');
      return;
    }

    setIsLoading(true);
    log('✍️ Testing INSERT into task_completions...');

    const payload = {
      user_id: user.id,
      task_id: 'test-task-' + Date.now(),
      points: 10,
    };

    log(`   Payload: ${JSON.stringify(payload, null, 2)}`);

    const { data, error } = await supabase
      .from('task_completions')
      .insert(payload)
      .select();

    if (error) {
      log(`❌ INSERT failed: ${error.message}`);
      log(`   Error details: ${JSON.stringify(error, null, 2)}`);
    } else {
      log(`✅ INSERT successful!`);
      log(`   Result: ${JSON.stringify(data, null, 2)}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-4">Database Upload Test</h1>
          
          {/* Auth Status */}
          <div className="mb-6 p-4 bg-slate-100 rounded">
            <h2 className="font-semibold mb-2">Authentication Status:</h2>
            {user ? (
              <div className="text-sm space-y-1">
                <p>✅ <strong>Logged in as:</strong> {user.email}</p>
                <p><strong>User ID:</strong> {user.id}</p>
              </div>
            ) : (
              <div className="text-sm">
                <p>⚠️ Not logged in</p>
                <p className="text-xs text-slate-600 mt-1">
                  Visit <a href="/login" className="text-blue-600 underline">/login</a> to authenticate first
                </p>
              </div>
            )}
          </div>

          {/* Test Buttons */}
          <div className="space-y-3 mb-6">
            <Button onClick={checkAuth} disabled={isLoading} className="w-full">
              🔄 Refresh Auth Status
            </Button>
            <Button onClick={testRead} disabled={isLoading} variant="outline" className="w-full">
              📖 Test Read Profiles
            </Button>
            <Button 
              onClick={testWrite} 
              disabled={isLoading || !user} 
              variant="outline" 
              className="w-full"
            >
              ✍️ Test Write Profile
            </Button>
            <Button 
              onClick={testTaskCompletion} 
              disabled={isLoading || !user} 
              variant="outline" 
              className="w-full"
            >
              📝 Test Task Completion
            </Button>
          </div>

          {/* Logs */}
          <div className="bg-black text-green-400 p-4 rounded font-mono text-xs h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-slate-500">Logs will appear here...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Troubleshooting Guide */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="font-bold text-blue-900 mb-3">🔧 Troubleshooting Guide</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>
              <strong>1. Not logged in?</strong>
              <br />Visit <code>/login</code> and sign in with magic link
            </li>
            <li>
              <strong>2. RLS policies blocking writes?</strong>
              <br />Check Supabase dashboard → Authentication → Policies
            </li>
            <li>
              <strong>3. Table doesn't exist?</strong>
              <br />Run migrations in <code>supabase/migrations/</code>
            </li>
            <li>
              <strong>4. Wrong user_id type?</strong>
              <br />Check if policies match UUID vs TEXT types
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
