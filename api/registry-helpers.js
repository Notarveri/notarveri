import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
let supabase = null;

function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return supabase;
}

// Compute Merkle root from an array of leaf hashes
export function merkleRoot(hashes) {
  if (!hashes.length) return '0'.repeat(64);
  let layer = [...hashes];
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = (i + 1 < layer.length) ? layer[i + 1] : left;
      next.push(createHash('sha256').update(left + right).digest('hex'));
    }
    layer = next;
  }
  return layer[0];
}

// Generate Merkle proof for a leaf at given index
export function merkleProof(hashes, leafIndex) {
  if (!hashes.length) return [];
  let layer = [...hashes];
  let proof = [];
  let idx = leafIndex;
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = (i + 1 < layer.length) ? layer[i + 1] : left;
      if (i === idx || i + 1 === idx) {
        const siblingIdx = (i === idx) ? i + 1 : i;
        if (siblingIdx < layer.length) {
          proof.push({ position: (siblingIdx > idx) ? 'right' : 'left', hash: layer[siblingIdx] });
        } else {
          // duplicate left if no right sibling
          proof.push({ position: 'right', hash: left });
        }
      }
      next.push(createHash('sha256').update(left + right).digest('hex'));
      if (i === idx || i + 1 === idx) idx = Math.floor(idx / 2);
    }
    layer = next;
  }
  return proof;
}

// Get latest block
export async function getLatestBlock() {
  const { data, error } = await getSupabase()
    .from('blocks')
    .select('*')
    .order('block_height', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

// Add a pending receipt (called by register.js)
export async function addPendingReceipt(receiptHash, receiptJson, requestHash, timestamp) {
  const sup = getSupabase();
  const { error } = await sup.from('pending_receipts').insert([{
    receipt_hash: receiptHash,
    receipt_json: receiptJson,
    request_hash: requestHash,
    timestamp
  }]);
  if (error) throw new Error(`Pending insert failed: ${error.message}`);
}

// Flush pending receipts into a new block (called by /api/flush)
export async function flushPendingToBlock() {
  const sup = getSupabase();
  // Get all pending receipts
  const { data: pending, error: fetchErr } = await sup
    .from('pending_receipts')
    .select('*')
    .order('id', { ascending: true });
  if (fetchErr) throw new Error(`Fetch pending failed: ${fetchErr.message}`);
  if (!pending.length) return null;

  const receipts = pending.map(p => ({
    hash: p.receipt_hash,
    json: p.receipt_json,
    request_hash: p.request_hash,
    timestamp: p.timestamp
  }));
  const leafHashes = receipts.map(r => r.hash);
  const merkleRootHash = merkleRoot(leafHashes);
  const timestampStart = receipts[0].timestamp;
  const timestampEnd = receipts[receipts.length - 1].timestamp;
  const prevBlock = await getLatestBlock();
  const prevBlockHash = prevBlock ? prevBlock.block_hash : '0'.repeat(64);
  const blockHeight = (prevBlock ? prevBlock.block_height : 0) + 1;
  const blockPayload = `${prevBlockHash}:${merkleRootHash}:${timestampStart}:${timestampEnd}`;
  const blockHash = createHash('sha256').update(blockPayload).digest('hex');

  // Insert block
  const { data: blockData, error: blockErr } = await sup
    .from('blocks')
    .insert([{
      block_height: blockHeight,
      prev_block_hash: prevBlockHash,
      merkle_root: merkleRootHash,
      timestamp_start: timestampStart,
      timestamp_end: timestampEnd,
      receipt_count: receipts.length,
      block_hash: blockHash
    }])
    .select('id');
  if (blockErr) throw new Error(`Block insert failed: ${blockErr.message}`);
  const blockId = blockData[0].id;

  // Insert receipts_in_block
  for (let i = 0; i < receipts.length; i++) {
    const { error: insErr } = await sup
      .from('receipts_in_block')
      .insert([{
        block_id: blockId,
        receipt_hash: receipts[i].hash,
        receipt_json: receipts[i].json,
        position: i,
        request_hash: receipts[i].request_hash
      }]);
    if (insErr) throw new Error(`Receipt insert failed: ${insErr.message}`);
  }

  // Delete pending receipts
  const { error: delErr } = await sup.from('pending_receipts').delete().neq('id', 0);
  if (delErr) throw new Error(`Delete pending failed: ${delErr.message}`);

  return { blockHeight, blockHash, merkleRoot: merkleRootHash, count: receipts.length };
}
