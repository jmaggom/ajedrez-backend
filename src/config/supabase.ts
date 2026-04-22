import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export const verifySupabaseConnection = async (): Promise<void> => {
  const { error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error('Supabase Storage connection failed: ' + error.message);
  }
  console.log('✅ Supabase Storage connected');
};
