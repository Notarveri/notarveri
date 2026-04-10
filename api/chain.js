import { getLatestBlock } from './registry-helpers.js';
import { getSupabase } from './registry-helpers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const latest = await getLatestBlock();
    const sup = getSupabase();
    const { count } = await sup.from('blocks').select('*', { count: 'exact', head: true });
    res.status(200).json({
      chain_height: count || 0,
      latest_block_hash: latest?.block_hash || null,
      latest_block_height: latest?.block_height || 0,
      genesis: count === 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
