// api/report.js – Compliance Report Generator (Premium Feature)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const API_KEY = process.env.API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !API_KEY) {
  throw new Error('Missing required environment variables');
}

let supabase = null;
function getSupabase() {
  if (!supabase) supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  return supabase;
}

export default async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }
  const token = auth.slice(7);
  if (token !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Parse request body
  let startDate, endDate;
  try {
    const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body);
    startDate = body.start_date;
    endDate = body.end_date;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Missing start_date or end_date (YYYY-MM-DD)' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Convert to timestamp range (start of day to end of day)
  const startTimestamp = Math.floor(new Date(startDate + 'T00:00:00Z').getTime() / 1000);
  const endTimestamp = Math.floor(new Date(endDate + 'T23:59:59Z').getTime() / 1000);

  const sup = getSupabase();

  // Query receipts within the date range
  const { data: receipts, error } = await sup
    .from('receipts_in_block')
    .select(`
      receipt_json,
      position,
      blocks!inner (
        block_height,
        block_hash,
        merkle_root,
        timestamp_start,
        timestamp_end
      )
    `)
    .gte('blocks.timestamp_start', startTimestamp)
    .lte('blocks.timestamp_end', endTimestamp)
    .order('blocks.block_height', { ascending: false });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database query failed' });
  }

  // Generate HTML report
  const reportTitle = `NotarVeri Compliance Report – ${startDate} to ${endDate}`;
  const generatedAt = new Date().toISOString();

  const rows = receipts.map(r => {
    const receipt = r.receipt_json;
    return `
      <tr>
        <td>${receipt.request_hash?.substring(0, 16)}…</td>
        <td>${receipt.model || 'N/A'}</td>
        <td>${new Date(receipt.timestamp * 1000).toISOString()}</td>
        <td>${r.blocks.block_height}</td>
        <td>${r.blocks.block_hash?.substring(0, 16)}…</td>
        <td>${r.position}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${reportTitle}</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 2rem; background: white; color: black; }
    h1 { color: #10b981; }
    .summary { background: #f3f4f6; padding: 1rem; border-radius: 0.5rem; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
    th { background: #10b981; color: white; }
    footer { margin-top: 2rem; font-size: 0.8rem; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <h1>NotarVeri Registry</h1>
  <h2>Compliance Report</h2>
  <div class="summary">
    <p><strong>Period:</strong> ${startDate} – ${endDate}</p>
    <p><strong>Total receipts:</strong> ${receipts.length}</p>
    <p><strong>Generated:</strong> ${generatedAt}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Request Hash (trunc)</th>
        <th>Model</th>
        <th>Timestamp</th>
        <th>Block Height</th>
        <th>Block Hash (trunc)</th>
        <th>Position</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6">No receipts found in this period.</td></tr>'}
    </tbody>
  </table>
  <footer>
    <p>NotarVeri Registry – Public, immutable audit log for AI outputs. <br>This report is verifiable via /api/registry?action=proof with the receipt_hash.</p>
  </footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
