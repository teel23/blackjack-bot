// Post-build: write out/sw.js with a versioned precache list of every exported file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const out = path.resolve('out');
const files = [];
const walk = (dir) => {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else files.push(full);
  }
};
walk(out);

const hash = crypto.createHash('sha256');
const urls = [];
for (const f of files.sort()) {
  const rel = '/' + path.relative(out, f).split(path.sep).join('/');
  if (rel === '/sw.js' || rel.endsWith('.map') || rel === '/_redirects' || rel === '/_headers') continue;
  hash.update(rel).update(fs.readFileSync(f));
  // Pages are requested as "/route/" — cache under that URL as well as index.html.
  urls.push(rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel);
}
const version = hash.digest('hex').slice(0, 12);
const template = fs.readFileSync(path.resolve('scripts/sw-template.js'), 'utf8');
const sw = template
  .replace('__VERSION__', version)
  .replace('__PRECACHE__', JSON.stringify(urls));
fs.writeFileSync(path.join(out, 'sw.js'), sw);
console.log(`sw.js: version ${version}, ${urls.length} files precached`);
