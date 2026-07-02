import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_TALENTO_HUMANO_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_TALENTO_HUMANO_ANON_KEY!

export const supabaseTalentoHumano = createClient(supabaseUrl, supabaseAnonKey)
