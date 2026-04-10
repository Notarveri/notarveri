import { createHash, createHmac, randomBytes } from 'crypto';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Simple API key check (hardcoded for test)
  const auth = req.headers.authorization;
  if (!auth || auth !== 'Bearer test-key-2026') {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  let body;
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const { prompt, output, model } = body;
  if (!prompt || !output || !model) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const requestHash = createHash('sha256').update(prompt).digest('hex');
  const responseHash = createHash('sha256').update(output).digest('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${requestHash}:${responseHash}:${model}:${timestamp}`;
  const signature = createHmac('sha256', 'my-secret-key').update(payload).digest('hex');

  const receipt = { request_hash: requestHash, response_hash: responseHash, model, timestamp, signature };
  return res.status(200).json({ receipt });
}
