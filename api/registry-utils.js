import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return supabase;
}

// Get the latest block in the chain
export async function getLatestBlock() {
  const { data, error } = await getSupabase()
    .from('registry')
    .select('block_hash, id')
    .order('id', { ascending: false })
    .limit(1);
  if (error) throw new Error(`Failed to get latest block: ${error.message}`);
  return data?.[0] || null;
}

// Compute block hash from previous hash, receipt hash, and timestamp
export function computeBlockHash(prevHash, receiptHash, timestamp) {
  const payload = `${prevHash}:${receiptHash}:${timestamp}`;
  return createHash('sha256').update(payload).digest('hex');
}

// Add a new block to the registry
export async function addToRegistry(receiptJson, receiptHash, timestamp) {
  const prevBlock = await getLatestBlock();
  const prevHash = prevBlock ? prevBlock.block_hash : '0'.repeat(64);
  const blockHash = computeBlockHash(prevHash, receiptHash, timestamp);
  const { error } = await getSupabase()
    .from('registry')
    .insert([{
      prev_hash: prevHash,
      receipt_hash: receiptHash,
      timestamp,
      receipt_json: receiptJson,
      block_hash: blockHash
    }]);
  if (error) throw new Error(`Registry insert failed: ${error.message}`);
  return blockHash;
}
