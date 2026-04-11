// api/docs.js – Swagger UI with dark/light mode, API key management, closable panel
export default async function handler(req, res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NotarVeri API Reference</title>
  <link rel="icon" type="image/png" href="https://vercel.com/favicon.ico">
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
      background-color: var(--secondary-bg) !important;
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
    .swagger-ui .info .title {
      color: var(--text-color) !important;
    }
    .swagger-ui .info .description {
      color: var(--text-color) !important;
    }
    .swagger-ui .opblock-tag {
      color: var(--text-color) !important;
    }
    .swagger-ui .opblock .opblock-summary-method {
      background: var(--primary-color) !important;
    }
    .swagger-ui .btn.authorize {
      border-color: var(--primary-color) !important;
      color: var(--primary-color) !important;
    }
    .swagger-ui section.models {
      background: var(--secondary-bg) !important;
      border-color: var(--border-color) !important;
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
      color: var(--text-color);
      background: none;
      border: none;
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
      <a href="/api/openapi.json" download="notarveri-openapi.json" style="margin-left: 1rem; color: var(--primary-color);">📥 Download OpenAPI Spec</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
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
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setTheme(true);
    themeToggle.addEventListener('click', () => {
      const isDark = !document.body.classList.contains('dark');
      setTheme(isDark);
    });

    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      displayOperationId: false,
      filter: true,
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        const storedKey = localStorage.getItem('notarveri_api_key');
        if (storedKey) {
          req.headers['Authorization'] = `Bearer ${storedKey}`;
        }
        return req;
      },
      responseInterceptor: (res) => {
        console.log('Response:', res);
        return res;
      }
    });

    const addApiKeyPanel = () => {
      const panel = document.createElement('div');
      panel.className = 'api-key-panel';
      panel.innerHTML = \`
        <button class="close-panel">&times;</button>
        <div style="font-weight:bold; margin-bottom:8px;">🔑 API Key</div>
        <input type="password" id="apiKeyInput" placeholder="Your API key (Bearer token)" value="\${localStorage.getItem('notarveri_api_key') || ''}">
        <button id="saveApiKey">Save</button>
        <button id="clearApiKey" class="clear-btn">Clear</button>
      \`;
      document.body.appendChild(panel);
      document.querySelector('.close-panel').addEventListener('click', () => {
        panel.remove();
      });
      document.getElementById('saveApiKey').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value;
        localStorage.setItem('notarveri_api_key', key);
        alert('API key saved. Reload page or try an endpoint.');
      });
      document.getElementById('clearApiKey').addEventListener('click', () => {
        localStorage.removeItem('notarveri_api_key');
        document.getElementById('apiKeyInput').value = '';
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
