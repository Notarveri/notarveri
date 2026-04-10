// NotarVeri - Cryptographic Attestation for AI Outputs
// Production-grade, defense-ready, open-source dependencies

import { createHmac, randomBytes } from 'crypto';

// ============================================================
// ENVIRONMENT VARIABLES (set in Vercel)
// SIGNING_KEY: 64+ character random hex string
// SUPABASE_URL: https://your-project.supabase.co
// SUPABASE_ANON_KEY: public anon key
// ============================================================

// Supabase client (lazy initialization)
let supabaseClient = null;

function getSupabase() {
  if (!supabaseClient) {
    const { createClient } = require('@supabase/supabase-js');
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        auth: { persistSession: false },
        db: { schema: 'public' }
      }
    );
  }
  return supabaseClient;
}

// SHA-256 hash (hex)
export async function sha256(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA256 signature
export function sign(payload, key) {
  return createHmac('sha256', key).update(payload).digest('hex');
}

// Verify signature
export function verifySignature(payload, signature, key) {
  const expected = sign(payload, key);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// Generate a secure API key (for future enterprise use)
export function generateApiKey() {
  return randomBytes(32).toString('hex');
}

// Audit logging (writes to Supabase 'audit_logs' table)
export async function auditLog(entry) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('audit_logs')
    .insert([{
      api_key_id: entry.api_key_id || null,
      action: entry.action,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent,
      request_hash: entry.request_hash || null,
      response_status: entry.response_status,
      details: entry.details || null
    }]);
  if (error) console.error('Audit log error:', error);
}

// Rate limiting stub (Vercel edge functions have built‑in rate limiting;
// we implement a simple per‑IP memory store – for production scale, use Upstash Redis)
const rateLimitStore = new Map();
export function checkRateLimit(ip, limit = 100, windowMs = 60000) {
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

// Validate receipt format
export function isValidReceipt(receipt) {
  return receipt &&
    typeof receipt.request_hash === 'string' &&
    typeof receipt.response_hash === 'string' &&
    typeof receipt.model === 'string' &&
    typeof receipt.timestamp === 'number' &&
    typeof receipt.signature === 'string';
}

// Store receipt in Supabase
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
      blockchain_tx: null  // reserved for future Solana integration
    }])
    .select('id');
  if (error) throw new Error(`Database insert failed: ${error.message}`);
  return data[0].id;
}

// Retrieve receipt by request_hash (for verification)
export async function getReceiptByHash(requestHash) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('request_hash', requestHash)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
