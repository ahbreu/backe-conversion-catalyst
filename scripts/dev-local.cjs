const { spawn } = require('child_process');
const http = require('http');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const backendPort = Number(process.env.PORT || 3001);
const frontendPort = Number(process.env.VITE_DEV_PORT || 8080);
const backendUrl = `http://localhost:${backendPort}/health`;
const processes = [];

const spawnProcess = (name, command, args) => {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  processes.push(child);

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped with signal ${signal}`);
      return;
    }

    console.log(`[${name}] exited with code ${code}`);

    if (code && !shuttingDown) {
      shutdown(code);
    }
  });

  return child;
};

const waitForBackend = (attempts = 40) =>
  new Promise((resolve, reject) => {
    let attempt = 0;

    const check = () => {
      attempt += 1;
      const request = http.get(backendUrl, (response) => {
        response.resume();

        if (response.statusCode && response.statusCode < 500) {
          resolve();
          return;
        }

        retry();
      });

      request.on('error', retry);
      request.setTimeout(1000, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (attempt >= attempts) {
        reject(new Error(`Backend did not become ready at ${backendUrl}`));
        return;
      }

      setTimeout(check, 500);
    };

    check();
  });

let shuttingDown = false;

const shutdown = (exitCode = 0) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }

  setTimeout(() => process.exit(exitCode), 250);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

(async () => {
  console.log(`Starting backend on http://localhost:${backendPort}`);
  spawnProcess('backend', 'node', ['backend/server.js']);

  await waitForBackend();

  console.log(`Starting frontend on http://localhost:${frontendPort}`);
  spawnProcess('frontend', npmCommand, ['run', 'dev:frontend', '--', '--host', 'localhost', '--port', String(frontendPort)]);
})().catch((error) => {
  console.error(error.message);
  shutdown(1);
});
