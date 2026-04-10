import { hmacSign, checkRateLimit, auditLog, getSigningKey, isEnvironmentReady } from './_utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!isEnvironmentReady()) {
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp, 200, 60000)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  let receipt;
  try {
    receipt = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const { request_hash, response_hash, model, timestamp, signature } = receipt;
  if (!request_hash || !response_hash || !model || !timestamp || !signature) {
    return res.status(400).json({ error: 'Missing receipt fields' });
  }

  const payload = `${request_hash}:${response_hash}:${model}:${timestamp}`;
  const expectedSignature = hmacSign(payload, getSigningKey());
  const valid = (signature === expectedSignature);

  await auditLog({ action: 'verify', ip_address: clientIp, user_agent: req.headers['user-agent'] || 'unknown', request_hash, response_status: 200, details: { valid } });
  return res.status(200).json({ valid, receipt: valid ? receipt : null });
}
