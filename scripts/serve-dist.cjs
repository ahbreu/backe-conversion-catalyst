const fs = require('fs');
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT || 8080);
const host = process.env.HOST || '127.0.0.1';
const root = path.join(process.cwd(), 'dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  let filePath = path.join(root, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      filePath = path.join(root, 'index.html');
    }

    fs.readFile(filePath, (readError, data) => {
      if (readError) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream'
      });
      res.end(data);
    });
  });
});

server.listen(port, host, () => {
  console.log(`Static dist server running at http://${host}:${port}/`);
});
