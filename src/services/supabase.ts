import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xxddsrneuiaeyrczqhob.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_uiOmVGIi1Ap9Nj7mH-ComA_KYxT1_tg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);