import { createClient } from '@supabase/supabase-js'

// storageKey unique : évite que plusieurs apps Supabase coexistant sur le
// même domaine (ex. sandbox + prod) se battent pour le même lock de
// localStorage. Sans ça, l'erreur « Lock ... was released because another
// request stole it » apparaît dès qu'un second onglet tente un refresh.
export const supabase = createClient(
  'https://llqiojlwbrhiqgztizun.supabase.co',
  'sb_publishable_3RT19DTr1n3yiKbmAl84wQ_Pu53c4XQ',
  {
    auth: {
      storageKey: 'sb-dnd-mj-app-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
)
