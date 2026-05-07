import { spawn } from 'node:child_process';

const port = 3292;
const server = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
server.stdout.on('data', (chunk) => {
  output += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  output += chunk.toString();
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch {
      await wait(250);
    }
  }

  throw new Error(`Server did not answer /api/health.\n${output}`);
}

try {
  const health = await waitForHealth();
  console.log(`Smoke test passed: server answered on port ${port}.`);
  console.log(`Model: ${health.model}`);
  console.log(`API key configured: ${health.hasKey ? 'yes' : 'no'}`);
} finally {
  server.kill();
}
