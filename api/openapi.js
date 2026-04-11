// api/openapi.js – OpenAPI 3.0 specification for NotarVeri

export default async function handler(req, res) {
  // CORS for spec access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://project-drm42.vercel.app';

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'NotarVeri Registry API',
      description: 'Public, immutable, Merkle‑tree‑based audit log for AI outputs. Comply with EU AI Act Article 12.',
      version: '2.0.0',
      contact: {
        name: 'Notar',
        email: 'notarveri@proton.me',
        url: 'https://notarveri.vercel.app'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      { url: baseUrl, description: 'Production server' },
      { url: 'http://localhost:3000', description: 'Local development' }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'Authorization',
          description: 'Bearer your-api-key-here'
        }
      },
      schemas: {
        Receipt: {
          type: 'object',
          properties: {
            request_hash: { type: 'string', description: 'SHA‑256 of the prompt' },
            response_hash: { type: 'string', description: 'SHA‑256 of the AI output' },
            model: { type: 'string', description: 'Model identifier (e.g., gpt-4o)' },
            timestamp: { type: 'integer', description: 'Unix timestamp' },
            signature: { type: 'string', description: 'HMAC‑SHA‑256 signature' }
          },
          required: ['request_hash', 'response_hash', 'model', 'timestamp', 'signature']
        },
        ProofResponse: {
          type: 'object',
          properties: {
            receipt_hash: { type: 'string' },
            merkle_root: { type: 'string' },
            block_hash: { type: 'string' },
            block_height: { type: 'integer' },
            position: { type: 'integer' },
            proof: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  position: { type: 'string', enum: ['left', 'right'] },
                  hash: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/api/attest': {
        post: {
          summary: 'Attest an AI output',
          description: 'Generate a signed receipt for a prompt+output pair.',
          security: [{ ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['prompt', 'output', 'model'],
                  properties: {
                    prompt: { type: 'string', description: 'Input prompt' },
                    output: { type: 'string', description: 'AI generated output' },
                    model: { type: 'string', description: 'Model name' }
                  }
                },
                example: {
                  prompt: 'What is the capital of France?',
                  output: 'Paris',
                  model: 'gpt-4o'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Receipt created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      receipt: { $ref: '#/components/schemas/Receipt' },
                      stored: { type: 'boolean' },
                      db_error: { type: 'string', nullable: true }
                    }
                  }
                }
              }
            },
            401: { description: 'Invalid API key' },
            400: { description: 'Missing or invalid fields' }
          }
        }
      },
      '/api/registry': {
        get: {
          summary: 'Get chain info',
          parameters: [
            { name: 'action', in: 'query', required: true, schema: { type: 'string', enum: ['chain'] } }
          ],
          responses: {
            200: {
              description: 'Chain information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      chain_height: { type: 'integer' },
                      latest_block_hash: { type: 'string' },
                      latest_block_height: { type: 'integer' },
                      genesis: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Registry actions',
          description: 'Register a receipt, verify, or get Merkle proof.',
          parameters: [
            { name: 'action', in: 'query', required: true, schema: { type: 'string', enum: ['register', 'verify', 'proof'] } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    { $ref: '#/components/schemas/Receipt' },
                    {
                      type: 'object',
                      properties: { request_hash: { type: 'string' } },
                      required: ['request_hash']
                    },
                    {
                      type: 'object',
                      properties: { receipt_hash: { type: 'string' } },
                      required: ['receipt_hash']
                    }
                  ]
                }
              }
            }
          },
          responses: {
            202: { description: 'Receipt queued (action=register)' },
            200: { description: 'Verification or proof response' },
            404: { description: 'Not found' }
          }
        }
      },
      '/api/health': {
        get: {
          summary: 'Health check',
          responses: { 200: { description: 'OK' } }
        }
      }
    }
  };

  res.status(200).json(spec);
}
