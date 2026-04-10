// POST /api/attest
// Request body: { prompt, output, model }
// Response: { receipt }

import { sha256, sign, auditLog, checkRateLimit, storeReceipt } from './_utils.js';

export default async function handler(req, res) {
  // CORS headers (allow only specific origins in production)
  res.setHeader('Access-Control-Allow-Origin', '*');  // Restrict later
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting (per IP)
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(clientIp, 50, 60000)) {
    await auditLog({
      action: 'attest_rate_limit_exceeded',
      ip_address: clientIp,
      user_agent: req.headers['user-agent'],
      response_status: 429
    });
    return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
  }

  // Authentication (API key – for MVP we accept a test key; replace with real key validation)
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    await auditLog({ action: 'attest_missing_auth', ip_address: clientIp, response_status: 401 });
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }
  const apiKey = authHeader.slice(7);
  // In production, validate against Supabase api_keys table.
  if (apiKey !== process.env.API_KEY && apiKey !== 'test-key-2026') {
    await auditLog({ action: 'attest_invalid_key', ip_address: clientIp, response_status: 401 });
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Parse and validate input
  const { prompt, output, model } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid prompt' });
  }
  if (!output || typeof output !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid output' });
  }
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid model' });
  }

  try {
    // Generate hashes
    const requestHash = await sha256(prompt);
    const responseHash = await sha256(output);
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${requestHash}:${responseHash}:${model}:${timestamp}`;

    // Sign with SIGNING_KEY (environment variable)
    const signature = sign(payload, process.env.SIGNING_KEY);

    const receipt = {
      request_hash: requestHash,
      response_hash: responseHash,
      model,
      timestamp,
      signature,
      version: '0.1'
    };

    // Store in Supabase
    const receiptId = await storeReceipt(receipt);

    // Audit success
    await auditLog({
      action: 'attest_success',
      ip_address: clientIp,
      user_agent: req.headers['user-agent'],
      request_hash: requestHash,
      response_status: 200
    });

    return res.status(200).json({ receipt, id: receiptId });
  } catch (err) {
    console.error('Attestation error:', err);
    await auditLog({
      action: 'attest_failure',
      ip_address: clientIp,
      user_agent: req.headers['user-agent'],
      response_status: 500,
      details: err.message
    });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
