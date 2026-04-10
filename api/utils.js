// NotarVeri Production Utilities – Defense‑Grade
// Fixed: crypto.subtle replaced with Node.js crypto.createHash
import { createClient } from '@supabase/supabase-js';
import { createHmac, randomBytes, timingSafeEqual, createHash } from 'crypto';

// ============================================================
// Environment variable access (safe, no process.exit)
// ============================================================
let _signingKey = null;
let _supabaseUrl = null;
let _supabaseAnonKey = null;
let _apiKey = null;

export function getSigningKey() {
  if (_signingKey === null) _signingKey = process.env.SIGNING_KEY || '';
  return _signingKey;
}
export function getSupabaseUrl() {
  if (_supabaseUrl === null) _supabaseUrl = process.env.SUPABASE_URL || '';
  return _supabaseUrl;
}
export function getSupabaseAnonKey() {
  if (_supabaseAnonKey === null) _supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  return _supabaseAnonKey;
}
export function getApiKey() {
  if (_apiKey === null) _apiKey = process.env.API_KEY || '';
  return _apiKey;
}

// ============================================================
// Safe timing‑safe comparison
// ============================================================
export function safeTimingCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

// ============================================================
// Supabase client (lazy, no top‑level side effects)
// ============================================================
let supabaseClient = null;
export function getSupabase() {
  if (!supabaseClient) {
    const url = getSupabaseUrl();
    const key = getSupabaseAnonKey();
    if (!url || !key) {
      throw new Error('Supabase credentials not configured');
    }
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
      db: { schema: 'public' },
      global: { headers: { 'X-Client-Info': 'notarveri-api' } }
    });
  }
  return supabaseClient;
}

// ============================================================
// Cryptographic Helpers (Node.js native)
// ============================================================
export async function sha256(message) {
  // FIXED: use Node.js crypto instead of Web crypto.subtle
  return createHash('sha256').update(message).digest('hex');
}

export function hmacSign(payload, key) {
  if (!key) throw new Error('Signing key is empty');
  return createHmac('sha256', key).update(payload).digest('hex');
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
  try {
    const supabase = getSupabase();
    await supabase.from('audit_logs').insert([{
      api_key_id: entry.api_key_id || null,
      action: entry.action,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      request_hash: entry.request_hash || null,
      response_status: entry.response_status,
      details: entry.details || null
    }]);
  } catch (error) {
    console.error('Audit log insertion failed:', error.message);
  }
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
  const validKey = getApiKey();
  if (!validKey) return false;
  return safeTimingCompare(key, validKey);
}

// ============================================================
// Environment readiness check (for debugging)
// ============================================================
export function isEnvironmentReady() {
  return !!(getSigningKey() && getSupabaseUrl() && getSupabaseAnonKey() && getApiKey());
}
