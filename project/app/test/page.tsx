'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function TestPage() {
  const [result, setResult] = useState<string>('Testing...');
  const [columns, setColumns] = useState<string[]>([]);
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    async function testConnection() {
      try {
        const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
        setUrl(envUrl);

        const { data, error } = await supabase.from('profiles').select('*').limit(1);

        if (error) {
          console.error('❌ Connection failed:', error);
          setResult('❌ Connection failed: ' + error.message);
        } else {
          console.log('✅ Connection successful:', data);
          if (data && data.length > 0) {
            const cols = Object.keys(data[0]);
            setColumns(cols);
            setResult(`✅ Connection successful! Found ${cols.length} columns.`);
          } else {
            setResult('✅ Connection successful — table exists but is empty.');
          }
        }
      } catch (err) {
        console.error('❌ Exception:', err);
        setResult(`❌ Exception: ${err}`);
      }
    }
    testConnection();
  }, []);

  const requiredCols = ['bio', 'hobbies', 'overall_contentment', 'eco_friendly_score', 'full_name', 'email'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Database Connection Test</h1>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <p className="text-sm text-slate-500 font-medium">Connecting to:</p>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded block mt-1 break-all">{url}</code>
          </div>

          <div className="text-lg font-medium text-slate-800">{result}</div>

          {columns.length > 0 && (
            <>
              <div className="border-t border-slate-200 pt-4">
                <h2 className="text-lg font-semibold text-slate-900 mb-3">Columns found:</h2>
                <div className="grid grid-cols-2 gap-2">
                  {columns.map((col) => (
                    <div key={col} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                      {col}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">Required columns check:</p>
                <ul className="space-y-1 text-sm">
                  {requiredCols.map((col) => (
                    <li key={col} className="flex items-center gap-2">
                      <span className={columns.includes(col) ? 'text-green-600' : 'text-red-600'}>
                        {columns.includes(col) ? '✅' : '❌'}
                      </span>
                      {col}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-semibold mb-1">💡 If columns are missing:</p>
          <p>Run <code className="bg-white px-2 py-1 rounded">supabase/migrations/profiles.sql</code> in your Supabase SQL editor.</p>
        </div>
      </div>
    </div>
  );
}
