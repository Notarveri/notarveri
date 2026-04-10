import { getSupabase } from './registry-helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let { request_hash } = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  if (!request_hash) return res.status(400).json({ error: 'Missing request_hash' });

  const sup = getSupabase();
  const { data, error } = await sup
    .from('receipts_in_block')
    .select('receipt_json, block_id, position')
    .eq('request_hash', request_hash)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) {
    return res.status(404).json({ found: false });
  }
  const receipt = data[0].receipt_json;
  // Also fetch block info
  const { data: blockData } = await sup
    .from('blocks')
    .select('block_hash, block_height, merkle_root')
    .eq('id', data[0].block_id)
    .single();
  res.status(200).json({
    found: true,
    receipt,
    block_hash: blockData.block_hash,
    block_height: blockData.block_height,
    position: data[0].position
  });
}
