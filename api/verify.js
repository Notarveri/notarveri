import { createHmac } from 'crypto';

const SIGNING_KEY = process.env.SIGNING_KEY;
if (!SIGNING_KEY) throw new Error('Missing SIGNING_KEY environment variable');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let receipt;
  try {
    receipt = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { request_hash, response_hash, model, timestamp, signature } = receipt;
  if (!request_hash || !response_hash || !model || !timestamp || !signature) {
    return res.status(400).json({ error: 'Missing receipt fields' });
  }

  const payload = `${request_hash}:${response_hash}:${model}:${timestamp}`;
  const expected = createHmac('sha256', SIGNING_KEY).update(payload).digest('hex');
  const valid = signature === expected;

  return res.status(200).json({ valid, receipt: valid ? receipt : null });
}
