// ============================================================
// NOTARVERI REGISTRY – Presidential Grade, Self‑Contained
// Handles: register, verify, chain, proof, flush
// ============================================================
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// ENVIRONMENT (fail fast if missing)
// ============================================================
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SIGNING_KEY = process.env.SIGNING_KEY;
const API_KEY = process.env.API_KEY;
const FLUSH_SECRET = process.env.FLUSH_SECRET;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SIGNING_KEY || !API_KEY) {
  throw new Error('Missing required env: SUPABASE_URL, SUPABASE_ANON_KEY, SIGNING_KEY, API_KEY');
}

// ============================================================
// SUPABASE CLIENT (lazy, safe)
// ============================================================
let supabase = null;
function getSupabase() {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });
  }
  return supabase;
}

// ============================================================
// TIMING‑SAFE COMPARE (prevents timing attacks)
// ============================================================
function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

// ============================================================
// MERKLE TREE HELPERS
// ============================================================
function merkleRoot(hashes) {
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

function merkleProof(hashes, leafIndex) {
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

// ============================================================
// DATABASE OPERATIONS (atomic)
// ============================================================
async function getLatestBlock() {
  const { data, error } = await getSupabase()
    .from('blocks')
    .select('*')
    .order('block_height', { ascending: false })
    .limit(1);
  if (error) throw new Error(`Failed to get latest block: ${error.message}`);
  return data?.[0] || null;
}

async function addPendingReceipt(receiptHash, receiptJson, requestHash, timestamp) {
  const { error } = await getSupabase()
    .from('pending_receipts')
    .insert([{ receipt_hash: receiptHash, receipt_json: receiptJson, request_hash: requestHash, timestamp }]);
  if (error) throw new Error(`Pending insert failed: ${error.message}`);
}

async function flushPending() {
  const sup = getSupabase();
  // Fetch all pending receipts ordered by id
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

  // Delete pending
  const { error: delErr } = await sup.from('pending_receipts').delete().neq('id', 0);
  if (delErr) throw new Error(`Delete pending failed: ${delErr.message}`);

  return { blockHeight, blockHash, merkleRoot: merkleRootHash, count: receipts.length };
}

// ============================================================
// MAIN HANDLER (routes by query parameter ?action=)
// ============================================================
export default async function handler(req, res) {
  // CORS headers (allow all for public endpoints)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get('action');

  // ==================== REGISTER ====================
  if (action === 'register') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    // Auth
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing API key' });
    const token = auth.slice(7);
    if (!timingSafeCompare(token, API_KEY)) return res.status(401).json({ error: 'Invalid API key' });

    let receipt;
    try {
      receipt = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const { request_hash, response_hash, model, timestamp, signature } = receipt;
    if (!request_hash || !response_hash || !model || !timestamp || !signature) {
      return res.status(400).json({ error: 'Invalid receipt format' });
    }
    // Verify signature
    const payload = `${request_hash}:${response_hash}:${model}:${timestamp}`;
    const expectedSig = createHmac('sha256', SIGNING_KEY).update(payload).digest('hex');
    if (!timingSafeCompare(signature, expectedSig)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const receiptHash = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
    const sup = getSupabase();
    try {
      // Check if already pending or in a block
      const { data: pending } = await sup.from('pending_receipts').select('id').eq('receipt_hash', receiptHash).maybeSingle();
      if (pending) return res.status(409).json({ error: 'Already pending' });
      const { data: inBlock } = await sup.from('receipts_in_block').select('id').eq('receipt_hash', receiptHash).maybeSingle();
      if (inBlock) return res.status(409).json({ error: 'Already in a block' });
      await addPendingReceipt(receiptHash, receipt, request_hash, timestamp);
      return res.status(202).json({ message: 'Queued', receipt_hash: receiptHash });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal error' });
    }
  }

  // ==================== VERIFY ====================
  if (action === 'verify') {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let { request_hash } = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  if (!request_hash) return res.status(400).json({ error: 'Missing request_hash' });
  const sup = getSupabase();
  try {
    // First check pending_receipts
    let { data, error } = await sup
      .from('pending_receipts')
      .select('receipt_json')
      .eq('request_hash', request_hash)
      .maybeSingle();
    if (error) throw error;
    // If not found, check receipts_in_block
    if (!data) {
      const { data: data2, error: error2 } = await sup
        .from('receipts_in_block')
        .select('receipt_json')
        .eq('request_hash', request_hash)
        .maybeSingle();
      if (error2) throw error2;
      data = data2;
    }
    if (!data) return res.status(404).json({ found: false });
    return res.status(200).json({ found: true, receipt: data.receipt_json });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
  // ==================== CHAIN ====================
  if (action === 'chain') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
      const latest = await getLatestBlock();
      const sup = getSupabase();
      const { count } = await sup.from('blocks').select('*', { count: 'exact', head: true });
      return res.status(200).json({
        chain_height: count || 0,
        latest_block_hash: latest?.block_hash || null,
        latest_block_height: latest?.block_height || 0,
        genesis: count === 0
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ==================== PROOF ====================
  if (action === 'proof') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    let { receipt_hash } = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    if (!receipt_hash) return res.status(400).json({ error: 'Missing receipt_hash' });
    const sup = getSupabase();
    try {
      const { data: entry, error } = await sup
        .from('receipts_in_block')
        .select('block_id, position')
        .eq('receipt_hash', receipt_hash)
        .maybeSingle();
      if (error || !entry) return res.status(404).json({ error: 'Receipt not found' });
      // Get all hashes in that block
      const { data: allReceipts, error: fetchErr } = await sup
        .from('receipts_in_block')
        .select('receipt_hash')
        .eq('block_id', entry.block_id)
        .order('position', { ascending: true });
      if (fetchErr) throw fetchErr;
      const leafHashes = allReceipts.map(r => r.receipt_hash);
      const proof = merkleProof(leafHashes, entry.position);
      const { data: block } = await sup.from('blocks').select('merkle_root, block_hash').eq('id', entry.block_id).single();
      return res.status(200).json({
        receipt_hash,
        position: entry.position,
        proof,
        merkle_root: block.merkle_root,
        block_hash: block.block_hash
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ==================== FLUSH (secure, for cron) ====================
  if (action === 'flush') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing secret' });
    const token = auth.slice(7);
    if (!FLUSH_SECRET || !timingSafeCompare(token, FLUSH_SECRET)) return res.status(401).json({ error: 'Invalid secret' });
    try {
      const result = await flushPending();
      if (!result) return res.status(200).json({ message: 'No pending receipts' });
      return res.status(200).json({ message: 'Block created', block: result });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Default: list available actions
  return res.status(200).json({
    actions: ['register', 'verify', 'chain', 'proof', 'flush'],
    note: 'Use ?action=... in query string'
  });
}
