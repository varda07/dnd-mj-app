import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://llqiojlwbrhiqgztizun.supabase.co',
  'sb_publishable_3RT19DTr1n3yiKbmAl84wQ_Pu53c4XQ',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)