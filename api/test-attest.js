import { getSigningKey, getSupabase, isEnvironmentReady } from './_utils.js';

export default async function handler(req, res) {
  try {
    const ready = isEnvironmentReady();
    const signingKey = getSigningKey();
    const supabase = getSupabase();
    res.status(200).json({ ready, signingKeyLength: signingKey?.length || 0, supabaseCreated: !!supabase });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
