// Local preview server for dist/ with no dependencies. Run: node serve.js  ->  http://localhost:8788
// It mimics Cloudflare: folder URLs serve index.html, and unknown paths serve the nearest 404.html with status 404.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve('dist'), PORT = process.env.PORT || 8788;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const file = p => { try { return fs.statSync(p).isFile() ? p : null; } catch (e) { return null; } };
http.createServer((req, res) => {
  let url; try { url = decodeURIComponent(req.url.split('?')[0]); } catch (e) { url = '/'; }
  const rel = path.normalize(url).replace(/^([/\\]\.\.?)+/, '');
  let f = file(path.join(ROOT, rel)) || file(path.join(ROOT, rel, 'index.html')), status = 200;
  if (!f) {
    status = 404;
    for (let d = path.join(ROOT, rel); d.startsWith(ROOT) && !f; d = path.dirname(d)) { f = file(path.join(d, '404.html')); if (d === ROOT) break; }
  }
  if (!f || !path.resolve(f).startsWith(ROOT)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('Preview: http://localhost:' + PORT));
