import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = '.env';
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/(^"|"$)/g, '');
    }
  }
});
Object.assign(process.env, envVars);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('ordenes_fabricacion_muebles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error ordenes_fabricacion_muebles:', error);
  } else {
    console.log('Columns in ordenes_fabricacion_muebles:', Object.keys(data[0]));
    console.log('Sample row:', data[0]);
  }

  const { data: qData, error: qError } = await supabase
    .from('query_of_muebles')
    .select('*')
    .limit(1);

  if (qError) {
    console.error('Error query_of_muebles:', qError);
  } else {
    console.log('Columns in query_of_muebles:', Object.keys(qData[0]));
    console.log('Sample query row:', qData[0]);
  }
}

main();
