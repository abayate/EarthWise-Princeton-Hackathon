const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function applyMigration() {
  console.log('Reading migration file...');
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'profiles.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Remove comments for cleaner execution
  const cleanSql = sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  console.log('Applying migration to Supabase...');
  console.log('URL:', supabaseUrl);
  
  try {
    // Use the Supabase REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: cleanSql })
    });

    if (!response.ok) {
      // Try alternative method: use supabase-js query
      console.log('Trying alternative method...');
      const { data, error } = await supabase.rpc('exec', { sql: cleanSql });
      
      if (error) {
        console.error('Migration failed:', error);
        process.exit(1);
      }
      
      console.log('✓ Migration applied successfully!');
      console.log('Result:', data);
    } else {
      console.log('✓ Migration applied successfully!');
    }
  } catch (err) {
    console.error('Error applying migration:', err.message);
    console.log('\n📋 Manual migration required:');
    console.log('1. Go to your Supabase dashboard: https://garbflrgwofgveqqvedl.supabase.co');
    console.log('2. Click on "SQL Editor" in the sidebar');
    console.log('3. Copy and paste the SQL from: supabase/migrations/profiles.sql');
    console.log('4. Click "Run" to execute');
    process.exit(1);
  }
}

applyMigration();
