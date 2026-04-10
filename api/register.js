import { createHash, createHmac } from 'crypto';
import { addPendingReceipt } from './registry-helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${process.env.API_KEY}`) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

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
  const expectedSig = createHmac('sha256', process.env.SIGNING_KEY).update(payload).digest('hex');
  if (signature !== expectedSig) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const receiptHash = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');

  // Check if already pending or in a block
  const supabase = (await import('./registry-helpers.js')).getSupabase();
  const { data: existingPending } = await supabase
    .from('pending_receipts')
    .select('id')
    .eq('receipt_hash', receiptHash)
    .maybeSingle();
  if (existingPending) {
    return res.status(409).json({ error: 'Receipt already pending' });
  }
  const { data: existingBlock } = await supabase
    .from('receipts_in_block')
    .select('id')
    .eq('receipt_hash', receiptHash)
    .maybeSingle();
  if (existingBlock) {
    return res.status(409).json({ error: 'Receipt already in a block' });
  }

  await addPendingReceipt(receiptHash, receipt, request_hash, timestamp);
  return res.status(202).json({ message: 'Receipt queued for batching', receipt_hash: receiptHash });
}
