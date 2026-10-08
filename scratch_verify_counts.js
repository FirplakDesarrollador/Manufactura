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
  const { count: countTotal } = await supabase.from('ordenes_fabricacion_muebles').select('*', { count: 'exact', head: true });
  const { count: countPendienteTrue } = await supabase.from('ordenes_fabricacion_muebles').select('*', { count: 'exact', head: true }).eq('pendiente', true);
  const { count: countPendienteFalse } = await supabase.from('ordenes_fabricacion_muebles').select('*', { count: 'exact', head: true }).eq('pendiente', false);
  const { count: countViewTotal } = await supabase.from('query_of_muebles').select('*', { count: 'exact', head: true });
  const { count: countViewPendienteTrue } = await supabase.from('query_of_muebles').select('*', { count: 'exact', head: true }).eq('pendiente', true);
  const { count: countViewPendienteFalse } = await supabase.from('query_of_muebles').select('*', { count: 'exact', head: true }).eq('pendiente', false);

  console.log({
    table_total: countTotal,
    table_pendiente_true: countPendienteTrue,
    table_pendiente_false: countPendienteFalse,
    view_total: countViewTotal,
    view_pendiente_true: countViewPendienteTrue,
    view_pendiente_false: countViewPendienteFalse
  });
}

main();
