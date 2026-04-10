import { getSupabase, isEnvironmentReady } from './_utils.js';

export default async function handler(req, res) {
  try {
    const ready = isEnvironmentReady();
    let supabase = null;
    let error = null;
    try {
      supabase = getSupabase();
    } catch (e) {
      error = e.message;
    }
    res.status(200).json({ ready, supabaseCreated: !!supabase, error });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
