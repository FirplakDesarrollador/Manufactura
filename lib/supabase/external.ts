import { createClient } from '@supabase/supabase-js'

export function createExternalClient() {
  return createClient(
    process.env.NEXT_PUBLIC_TALENTO_HUMANO_URL || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_TALENTO_HUMANO_ANON_KEY || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY!
  )
}
