import { getSupabase, merkleProof } from './registry-helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let { receipt_hash } = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  if (!receipt_hash) return res.status(400).json({ error: 'Missing receipt_hash' });

  const sup = getSupabase();
  // Find block and position
  const { data: entry, error } = await sup
    .from('receipts_in_block')
    .select('block_id, position')
    .eq('receipt_hash', receipt_hash)
    .single();
  if (error || !entry) return res.status(404).json({ error: 'Receipt not found' });

  // Get all hashes in that block (ordered by position)
  const { data: allReceipts, error: fetchErr } = await sup
    .from('receipts_in_block')
    .select('receipt_hash')
    .eq('block_id', entry.block_id)
    .order('position', { ascending: true });
  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  const leafHashes = allReceipts.map(r => r.receipt_hash);
  const proof = merkleProof(leafHashes, entry.position);
  // Get block merkle root for verification
  const { data: block } = await sup
    .from('blocks')
    .select('merkle_root, block_hash')
    .eq('id', entry.block_id)
    .single();
  res.status(200).json({
    receipt_hash,
    position: entry.position,
    proof,
    merkle_root: block.merkle_root,
    block_hash: block.block_hash
  });
}
