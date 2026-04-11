export default async function handler(req, res) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'NotarVeri Registry API',
      description: 'Public, immutable, Merkle‑tree‑based audit log for AI outputs. Compliant with EU AI Act Article 12.',
      version: '2.0.0',
      contact: { name: 'Notar', email: 'notarveri@proton.me' }
    },
    servers: [{ url: 'https://project-drm42.vercel.app', description: 'Production server' }],
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

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NotarVeri API Reference</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #1f2937;
      --border-color: #e5e7eb;
      --primary-color: #10b981;
      --secondary-bg: #f9fafb;
    }
    body.dark {
      --bg-color: #0a0a0a;
      --text-color: #e5e7eb;
      --border-color: #1f2937;
      --secondary-bg: #111827;
    }
    body {
      background-color: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      padding: 0;
      transition: background 0.2s, color 0.2s;
    }
    .topbar {
      background-color: var(--secondary-bg);
      border-bottom: 1px solid var(--border-color);
      padding: 0.5rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .topbar .logo {
      font-size: 1.5rem;
      font-weight: bold;
      background: linear-gradient(135deg, #10b981, #3b82f6);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
    }
    .theme-toggle {
      background: var(--border-color);
      border: none;
      border-radius: 2rem;
      padding: 0.3rem 0.8rem;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .api-key-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--secondary-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      z-index: 1000;
      font-size: 12px;
      font-family: monospace;
      width: 260px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .api-key-panel .close-panel {
      position: absolute;
      top: 4px;
      right: 8px;
      cursor: pointer;
      font-size: 16px;
    }
    .api-key-panel input {
      width: 100%;
      padding: 4px;
      background: var(--bg-color);
      color: var(--text-color);
      border: 1px solid var(--border-color);
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .api-key-panel button {
      background: var(--primary-color);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      margin-right: 4px;
    }
    .api-key-panel .clear-btn {
      background: #ef4444;
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="logo">NotarVeri Registry</div>
    <div>
      <button id="themeToggle" class="theme-toggle">🌙 Dark</button>
      <button id="downloadSpec" class="theme-toggle" style="margin-left: 1rem;">📥 Download OpenAPI Spec</button>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    const spec = ${JSON.stringify(spec)};

    // Theme
    const themeToggle = document.getElementById('themeToggle');
    const setTheme = (isDark) => {
      if (isDark) {
        document.body.classList.add('dark');
        themeToggle.textContent = '☀️ Light';
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark');
        themeToggle.textContent = '🌙 Dark';
        localStorage.setItem('theme', 'light');
      }
    };
    if (localStorage.getItem('theme') === 'dark') setTheme(true);
    themeToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));

    // Download spec
    document.getElementById('downloadSpec').addEventListener('click', () => {
      const dataStr = JSON.stringify(spec, null, 2);
      const blob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'notarveri-openapi.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    // Swagger UI
    window.ui = SwaggerUIBundle({
      spec: spec,
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        const storedKey = localStorage.getItem('notarveri_api_key');
        if (storedKey) req.headers['Authorization'] = `Bearer ${storedKey}`;
        return req;
      }
    });

    // API key panel
    const addApiKeyPanel = () => {
      const panel = document.createElement('div');
      panel.className = 'api-key-panel';
      panel.innerHTML = \`
        <button class="close-panel">&times;</button>
        <div style="font-weight:bold; margin-bottom:8px;">🔑 API Key</div>
        <input type="password" id="apiKeyInput" placeholder="Your API key" value="\${localStorage.getItem('notarveri_api_key') || ''}">
        <button id="saveApiKey">Save</button>
        <button id="clearApiKey" class="clear-btn">Clear</button>
      \`;
      document.body.appendChild(panel);
      panel.querySelector('.close-panel').addEventListener('click', () => panel.remove());
      panel.querySelector('#saveApiKey').addEventListener('click', () => {
        const key = panel.querySelector('#apiKeyInput').value;
        localStorage.setItem('notarveri_api_key', key);
        alert('API key saved. Refresh page to apply.');
      });
      panel.querySelector('#clearApiKey').addEventListener('click', () => {
        localStorage.removeItem('notarveri_api_key');
        panel.querySelector('#apiKeyInput').value = '';
        alert('API key cleared.');
      });
    };
    setTimeout(addApiKeyPanel, 1000);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
