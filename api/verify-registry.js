import { getSupabase } from './_utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let { request_hash } = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  if (!request_hash) return res.status(400).json({ error: 'Missing request_hash' });

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('registry')
    .select('receipt_json, block_hash, timestamp, id')
    .eq('receipt_json->>request_hash', request_hash)
    .limit(1);
  if (error) return res.status(500).json({ error: error.message });
  if (!data || data.length === 0) {
    return res.status(404).json({ found: false, message: 'Receipt not found in registry' });
  }

  res.status(200).json({
    found: true,
    receipt: data[0].receipt_json,
    block_hash: data[0].block_hash,
    registered_at: data[0].timestamp
  });
}
