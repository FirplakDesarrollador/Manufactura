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
  const orders = ['10074302', '10074300', '10074301', '10074299', '10074521', '10074522', '10074261'];
  const { data, error } = await supabase
    .from('ordenes_fabricacion_muebles')
    .select('orden_fabricacion, numero_pedido, producto_sku, producto_descripcion, cantidad, cliente')
    .in('orden_fabricacion', orders);

  if (error) {
    console.error('Error:', error);
  } else {
    console.table(data);
  }
}

main();
