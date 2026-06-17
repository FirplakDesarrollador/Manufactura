import { createClient } from '@supabase/supabase-js'

export function createExternalClient() {
  return createClient(
    process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY!
  )
}
