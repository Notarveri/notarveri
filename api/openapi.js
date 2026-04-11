// api/openapi.js – OpenAPI 3.0 specification for NotarVeri
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://project-drm42.vercel.app';

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'NotarVeri Registry API',
      description: 'Public, immutable, Merkle‑tree‑based audit log for AI outputs. Compliant with EU AI Act Article 12.',
      version: '2.0.0',
      contact: {
        name: 'Notar',
        email: 'notarveri@proton.me'
      }
    },
    servers: [{ url: baseUrl, description: 'Production server' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Bearer your-api-key-here'
        }
      }
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/api/attest': {
        post: {
          summary: 'Attest an AI output',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prompt', 'output', 'model'],
                  properties: {
                    prompt: { type: 'string' },
                    output: { type: 'string' },
                    model: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { 200: { description: 'Receipt created' } }
        }
      },
      '/api/registry': {
        get: {
          summary: 'Get chain info',
          parameters: [{ name: 'action', in: 'query', required: true, schema: { type: 'string', enum: ['chain'] } }],
          responses: { 200: { description: 'Chain information' } }
        },
        post: {
          summary: 'Registry actions (register, verify, proof)',
          parameters: [{ name: 'action', in: 'query', required: true, schema: { type: 'string', enum: ['register', 'verify', 'proof'] } }],
          responses: { 200: { description: 'Result' } }
        }
      },
      '/api/health': {
        get: { responses: { 200: { description: 'OK' } } }
      }
    }
  };
  
  res.status(200).json(spec);
}
