import { isEnvironmentReady } from './_utils.js';

export default function handler(req, res) {
  const ready = isEnvironmentReady();
  res.status(200).json({ 
    status: ready ? 'healthy' : 'misconfigured', 
    timestamp: Date.now(),
    env_ready: ready
  });
}
