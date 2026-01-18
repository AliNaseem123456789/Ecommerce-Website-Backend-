import { createClient } from '@supabase/supabase-js';

// export const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );

const SUPABASE_URL = 'https://qcpgbnmbcpxtoxctweil.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__MUWBuFaG0BoVLbfNHjfvg_NdutXLVb';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
