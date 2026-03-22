import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** True when real project URL + anon key are set in `.env` */
export const isSupabaseConfigured = Boolean(url && key);

// createClient throws if url or key is empty — use placeholders so the app still loads
const resolvedUrl =
  url ||
  'https://configure-your-project.supabase.co';
const resolvedKey =
  key ||
  'eyJhbGciOiJIUzI1NiJ9.e30.configure-VITE_SUPABASE_ANON_KEY-in-env-file';

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to `.env` (see .env.example), then restart `npm run dev`.'
  );
}

export const supabase = createClient(resolvedUrl, resolvedKey);
