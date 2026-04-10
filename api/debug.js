import { isEnvironmentReady, getSigningKey, getSupabaseUrl, getSupabaseAnonKey, getApiKey } from './_utils.js';

export default function handler(req, res) {
  const result = {
    env_ready: isEnvironmentReady(),
    signing_key_exists: !!getSigningKey(),
    supabase_url_exists: !!getSupabaseUrl(),
    supabase_anon_key_exists: !!getSupabaseAnonKey(),
    api_key_exists: !!getApiKey(),
    signing_key_length: getSigningKey()?.length || 0,
  };
  res.status(200).json(result);
}
