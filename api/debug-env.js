import { getSupabaseUrl, getSupabaseAnonKey, getSigningKey, getApiKey } from './_utils.js';

export default async function handler(req, res) {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  const signingKey = getSigningKey();
  const apiKey = getApiKey();

  let supabaseStatus = 'not_initialized';
  let supabaseError = null;

  // Try to create Supabase client safely
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(url, anonKey);
    supabaseStatus = 'client_created';
    // Optionally test a simple query (e.g., check if receipts table exists)
    const { error } = await client.from('receipts').select('id').limit(1);
    if (error) supabaseError = error.message;
    else supabaseStatus = 'connected';
  } catch (err) {
    supabaseError = err.message;
    supabaseStatus = 'failed';
  }

  res.status(200).json({
    supabase_url_present: !!url,
    supabase_anon_key_present: !!anonKey,
    signing_key_present: !!signingKey,
    api_key_present: !!apiKey,
    supabase_status: supabaseStatus,
    supabase_error: supabaseError
  });
}
