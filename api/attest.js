import { 
  sha256, hmacSign, checkRateLimit, auditLog, storeReceipt, 
  isValidApiKey, getSigningKey, isEnvironmentReady, getSupabase
} from './_utils.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Environment check
    if (!isEnvironmentReady()) {
      return res.status(500).json({ error: 'Server misconfigured: missing environment variables' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Rate limit
    if (!checkRateLimit(clientIp, 50, 60000)) {
      await auditLog({ action: 'attest_rate_limit', ip_address: clientIp, user_agent: userAgent, response_status: 429 });
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await auditLog({ action: 'attest_missing_auth', ip_address: clientIp, user_agent: userAgent, response_status: 401 });
      return res.status(401).json({ error: 'Missing API key' });
    }
    const apiKey = authHeader.slice(7);
    if (!isValidApiKey(apiKey)) {
      await auditLog({ action: 'attest_invalid_key', ip_address: clientIp, user_agent: userAgent, response_status: 401 });
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Parse body
    let body;
    try {
      body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    const { prompt, output, model } = body;
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt' });
    if (!output || typeof output !== 'string') return res.status(400).json({ error: 'Missing output' });
    if (!model || typeof model !== 'string') return res.status(400).json({ error: 'Missing model' });

    // Generate receipt
    const requestHash = await sha256(prompt);
    const responseHash = await sha256(output);
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = `${requestHash}:${responseHash}:${model}:${timestamp}`;
    const signature = hmacSign(payload, getSigningKey());

    const receipt = { request_hash: requestHash, response_hash: responseHash, model, timestamp, signature, version: '2.0' };
    const receiptId = await storeReceipt(receipt);

    await auditLog({ action: 'attest_success', ip_address: clientIp, user_agent: userAgent, request_hash: requestHash, response_status: 200 });
    return res.status(200).json({ receipt, id: receiptId });

  } catch (err) {
    console.error('Attestation handler error:', err);
    // Always return a JSON error, never crash
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
}
