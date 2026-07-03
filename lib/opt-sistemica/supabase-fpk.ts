import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This client points specifically to the "Sistema FPK" schema
export const supabaseFPK = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'Sistema FPK' }
});
