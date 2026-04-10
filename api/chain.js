import { getLatestBlock } from './registry-helpers.js';
import { getSupabase } from './_utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const latest = await getLatestBlock();
    const supabase = getSupabase();
    const { count } = await supabase.from('registry').select('*', { count: 'exact', head: true });
    res.status(200).json({
      chain_height: count || 0,
      latest_block_hash: latest?.block_hash || null,
      genesis: count === 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
