const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env manually
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
    .from('usuarios')
    .select('correo, rol, permisos')
    .limit(10);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Usuarios list:', JSON.stringify(data, null, 2));
  }
}

main();
