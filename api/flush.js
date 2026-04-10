import { flushPendingToBlock, getLatestBlock } from './registry-helpers.js';

export default async function handler(req, res) {
  // Secure with a secret token to prevent unauthorized flushes
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.FLUSH_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const result = await flushPendingToBlock();
    if (!result) {
      return res.status(200).json({ message: 'No pending receipts', block: null });
    }
    const latest = await getLatestBlock();
    return res.status(200).json({ message: 'Block created', block: result, latest });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
