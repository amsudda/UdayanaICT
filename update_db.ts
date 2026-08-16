import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'];
const supabaseAnonKey = envVars['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseAnonKey) {
  console.log("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      alter table public.batches add column if not exists exam_date timestamptz;
      alter table public.live_classes add column if not exists event_type text;
      alter table public.live_classes add column if not exists instructor_avatar text;
      alter table public.live_classes add column if not exists description jsonb default '[]'::jsonb;
    `
  });
  console.log("Result:", data);
  console.log("Error:", error);
}

run();
