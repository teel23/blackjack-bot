// Tiny static server for the exported site (used by `npm start` and Playwright).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'out');
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://x');
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) return res.writeHead(308, { Location: url.pathname + '/' + url.search }).end();
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': types['.html'] });
      return fs.createReadStream(path.join(root, '404.html')).pipe(res);
    }
    const headers = { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' };
    if (file.endsWith('sw.js')) headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
