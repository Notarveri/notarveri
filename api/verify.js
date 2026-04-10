// POST /api/verify
// Request body: { receipt } or { request_hash }
// Response: { valid: boolean, receipt?: object }

import { verifySignature, auditLog, checkRateLimit, getReceiptByHash, isValidReceipt } from './_utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkRateLimit(clientIp, 200, 60000)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const { receipt, request_hash } = req.body;

  let receiptToVerify = receipt;
  if (!receiptToVerify && request_hash) {
    receiptToVerify = await getReceiptByHash(request_hash);
    if (!receiptToVerify) {
      return res.status(404).json({ valid: false, error: 'Receipt not found' });
    }
  }

  if (!receiptToVerify || !isValidReceipt(receiptToVerify)) {
    return res.status(400).json({ valid: false, error: 'Invalid receipt format' });
  }

  const { request_hash: rHash, response_hash: respHash, model, timestamp, signature } = receiptToVerify;
  const payload = `${rHash}:${respHash}:${model}:${timestamp}`;
  const isValid = verifySignature(payload, signature, process.env.SIGNING_KEY);

  await auditLog({
    action: 'verify',
    ip_address: clientIp,
    user_agent: req.headers['user-agent'],
    request_hash: rHash,
    response_status: 200,
    details: { valid: isValid }
  });

  return res.status(200).json({ valid: isValid, receipt: receiptToVerify });
}
