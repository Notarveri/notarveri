import { createHash } from 'crypto';
import { addToRegistry, getLatestBlock } from './registry-helpers.js';
import { getSupabase } from './_utils.js'; // or re-export from registry-helpers

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Authentication – require the same API key as attestation
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

  // Validate receipt structure
  const { request_hash, response_hash, model, timestamp, signature } = receipt;
  if (!request_hash || !response_hash || !model || !timestamp || !signature) {
    return res.status(400).json({ error: 'Invalid receipt format' });
  }

  // Recompute signature to verify authenticity (using your SIGNING_KEY)
  const { createHmac } = await import('crypto');
  const payload = `${request_hash}:${response_hash}:${model}:${timestamp}`;
  const expectedSignature = createHmac('sha256', process.env.SIGNING_KEY).update(payload).digest('hex');
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid receipt signature' });
  }

  // Check if this receipt already exists in registry (by receipt_hash)
  const receiptHash = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from('registry')
    .select('id')
    .eq('receipt_hash', receiptHash)
    .maybeSingle();
  if (existing) {
    return res.status(409).json({ error: 'Receipt already registered', receipt_hash: receiptHash });
  }

  // Add to registry
  const blockHash = await addToRegistry(receipt, receiptHash, Math.floor(Date.now() / 1000));
  const latestBlock = await getLatestBlock();

  return res.status(201).json({
    message: 'Receipt registered successfully',
    receipt_hash: receiptHash,
    block_hash: blockHash,
    chain_height: latestBlock?.id || 1
  });
}
