import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_TALENTO_HUMANO_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_TALENTO_HUMANO_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('Warning: Supabase environment variables for Talento Humano client are missing.');
  }
}

export const supabaseTalentoHumano = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
