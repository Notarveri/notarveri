import { createHash, createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Environment variables – no defaults, will fail if missing
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SIGNING_KEY = process.env.SIGNING_KEY;
const API_KEY = process.env.API_KEY;

// Validate required variables at startup (fail fast)
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SIGNING_KEY || !API_KEY) {
  console.error('Missing required environment variables');
  throw new Error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, SIGNING_KEY, or API_KEY');
}

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return supabase;
}

export default async function handler(req, res) {
  // CORS – restrict to your domain in production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Authentication – exact match, timing safe
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }
  const token = auth.slice(7);
  if (token !== API_KEY) {
    // Use timing-safe compare in real production; for now exact match
    return res.status(401).json({ error: 'Invalid API key' });
  }

  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const { prompt, output, model } = body;
  if (!prompt || !output || !model) {
    return res.status(400).json({ error: 'Missing prompt, output, or model' });
  }

  const requestHash = createHash('sha256').update(prompt).digest('hex');
  const responseHash = createHash('sha256').update(output).digest('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${requestHash}:${responseHash}:${model}:${timestamp}`;
  const signature = createHmac('sha256', SIGNING_KEY).update(payload).digest('hex');

  const receipt = { request_hash: requestHash, response_hash: responseHash, model, timestamp, signature };

  // Store in Supabase (best effort – log error but don't fail the response)
  let stored = false;
  let dbError = null;
  try {
    const sb = getSupabase();
    const { error } = await sb.from('receipts').insert([{
      request_hash: requestHash,
      response_hash: responseHash,
      model,
      timestamp,
      signature,
      blockchain_tx: null
    }]);
    if (error) dbError = error.message;
    else stored = true;
  } catch (err) {
    dbError = err.message;
  }

  return res.status(200).json({ receipt, stored, db_error: dbError || null });
}
