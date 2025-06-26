// client/src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

// Acessando as variáveis de ambiente com o prefixo VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verifique se as variáveis de ambiente estão carregadas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("As variáveis de ambiente do Supabase não estão configuradas corretamente.");
  // Se estiver em produção, você pode querer lançar um erro ou parar a aplicação.
  // Em desenvolvimento, um console.error é suficiente.
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);