// api/openapi.js – Minimal OpenAPI spec
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'https://project-drm42.vercel.app';
  const spec = {
    openapi: '3.0.0',
    info: { title: 'NotarVeri API', version: '1.0.0' },
    servers: [{ url: baseUrl }],
    paths: {
      '/api/attest': { post: { summary: 'Attest an AI output' } },
      '/api/registry': { get: { summary: 'Get chain info' }, post: { summary: 'Register, verify, proof' } },
      '/api/health': { get: { summary: 'Health check' } }
    }
  };
  res.status(200).json(spec);
}
