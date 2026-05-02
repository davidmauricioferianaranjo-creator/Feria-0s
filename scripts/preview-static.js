const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.PORT || process.argv[2] || 3003);
const root = path.resolve(__dirname, '..', 'build');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.lottie': 'application/octet-stream',
};

function safePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const resolved = path.resolve(root, clean);
  return resolved.startsWith(root) ? resolved : path.join(root, 'index.html');
}

const server = http.createServer((req, res) => {
  let file = safePath(req.url || '/');
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    file = path.join(root, 'index.html');
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No se pudo cargar Feria OS.');
      return;
    }

    res.writeHead(200, {
      'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Feria OS preview listo en http://localhost:${port}`);
});
