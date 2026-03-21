const { spawn } = require('child_process');
const http = require('http');
const net = require('net');

async function findFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
    server.on('error', reject);
  });
}

async function wait(ms) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url) {
  return await new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
  });
}

async function waitForReady(url, child, stdout, stderr) {
  const timeoutAt = Date.now() + 180000;
  while (Date.now() < timeoutAt) {
    if (child.exitCode !== null) {
      throw new Error(`Next dev encerrou antes do readiness. STDERR: ${stderr.join('')}`);
    }

    try {
      const response = await request(url);
      if (response.statusCode >= 200 && response.statusCode < 500) {
        return response;
      }
    } catch {
      // continua ate o timeout
    }

    await wait(2000);
  }

  throw new Error(`Timeout aguardando o boot do Next. STDOUT: ${stdout.join('')} STDERR: ${stderr.join('')}`);
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      killer.on('exit', resolve);
      killer.on('error', resolve);
    });
    return;
  }

  child.kill('SIGTERM');
  await wait(1200);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

(async () => {
  const port = await findFreePort();
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npx';
  const args = process.platform === 'win32'
    ? ['/c', 'npx', 'next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)]
    : ['next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)];
  const stdout = [];
  const stderr = [];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => stdout.push(chunk.toString('utf8')));
  child.stderr.on('data', (chunk) => stderr.push(chunk.toString('utf8')));

  try {
    const response = await waitForReady(`http://127.0.0.1:${port}/qa/financial-calendar`, child, stdout, stderr);
    if (response.statusCode !== 200) {
      throw new Error(`Smoke route respondeu HTTP ${response.statusCode}.`);
    }

    console.log(`Smoke runtime OK on port ${port}`);
    console.log('Route verificada: /qa/financial-calendar');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await stopProcess(child);
  }
})();
