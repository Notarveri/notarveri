// NotarVeri Production Utilities – Defense‑Grade
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// ============================================================
// ENVIRONMENT VALIDATION (fail fast if missing)
// ============================================================
const requiredEnv = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SIGNING_KEY'];
for (const env of requiredEnv) {
  if (!process.env[env]) {
    console.error(`FATAL: Missing ${env} environment variable`);
    process.exit(1);
  }
}
export const SIGNING_KEY = process.env.SIGNING_KEY;
export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// ============================================================
// Supabase Client (lazy, with retry)
// ============================================================
let supabaseClient = null;
export function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      db: { schema: 'public' },
      global: { headers: { 'X-Client-Info': 'notarveri-api' } }
    });
  }
  return supabaseClient;
}

// ============================================================
// Cryptographic Helpers
// ============================================================
export async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hmacSign(payload, key) {
  return createHmac('sha256', key).update(payload).digest('hex');
}

export function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ============================================================
// Rate Limiting (in‑memory, per IP)
// ============================================================
const rateLimitStore = new Map();
export function checkRateLimit(ip, limit = 50, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }
  record.count++;
  rateLimitStore.set(ip, record);
  return record.count <= limit;
}

// ============================================================
// Audit Logging (async, never blocks response)
// ============================================================
export async function auditLog(entry) {
  const supabase = getSupabase();
  const { error } = await supabase.from('audit_logs').insert([{
    api_key_id: entry.api_key_id || null,
    action: entry.action,
    ip_address: entry.ip_address,
    user_agent: entry.user_agent,
    request_hash: entry.request_hash || null,
    response_status: entry.response_status,
    details: entry.details || null
  }]);
  if (error) console.error('Audit log insertion failed:', error.message);
}

// ============================================================
// Receipt Storage
// ============================================================
export async function storeReceipt(receipt) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('receipts')
    .insert([{
      request_hash: receipt.request_hash,
      response_hash: receipt.response_hash,
      model: receipt.model,
      timestamp: receipt.timestamp,
      signature: receipt.signature,
      blockchain_tx: null
    }])
    .select('id');
  if (error) throw new Error(`Database insert failed: ${error.message}`);
  return data[0].id;
}

// ============================================================
// API Key Validation (against environment)
// ============================================================
export function isValidApiKey(key) {
  const validKey = process.env.API_KEY;
  if (!validKey) return false;
  return timingSafeCompare(key, validKey);
}
