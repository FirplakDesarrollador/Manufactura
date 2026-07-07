import { createClient } from '@supabase/supabase-js'

export function createExternalClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_TALENTO_HUMANO_URL || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_TALENTO_HUMANO_ANON_KEY || process.env.NEXT_PUBLIC_EXTERNAL_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('Warning: External Supabase environment variables are missing.');
    }
  }

  return createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key'
  )
}
