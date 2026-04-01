const http  = require('http');
const https = require('https');
const { URL } = require('url');

const ALLOWED_DOMAINS = [
  'ptu.ridsys.in',
  'stvlive.net',
];

function isAllowed(hostname) {
  return ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const rawUrl = req.query.url;
  if (!rawUrl) { res.status(400).json({ error: 'url param missing' }); return; }

  let targetUrl;
  try { targetUrl = new URL(decodeURIComponent(rawUrl)); }
  catch(e) { res.status(400).json({ error: 'Invalid URL' }); return; }

  if (!isAllowed(targetUrl.hostname)) {
    res.status(403).json({ error: 'Domain not allowed: ' + targetUrl.hostname });
    return;
  }

  const lib = targetUrl.protocol === 'https:' ? https : http;
  const options = {
    hostname: targetUrl.hostname,
    port:     targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
    path:     targetUrl.pathname + targetUrl.search,
    method:   'GET',
    headers: {
      'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept':          '*/*',
      'Accept-Encoding': 'identity',
      'Connection':      'keep-alive',
    },
    timeout: 15000,
  };

  return new Promise((resolve) => {
    const proxyReq = lib.request(options, (proxyRes) => {
      const contentType = proxyRes.headers['content-type'] || '';
      const isM3U8 = rawUrl.includes('.m3u8') || contentType.includes('mpegurl');

      if (proxyRes.headers['content-type'])   res.setHeader('Content-Type', proxyRes.headers['content-type']);
      if (proxyRes.headers['content-length']) res.setHeader('Content-Length', proxyRes.headers['content-length']);
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.status(proxyRes.statusCode);

      if (isM3U8) {
        let body = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
          const base = targetUrl.protocol + '//' + targetUrl.hostname +
                       (targetUrl.port ? ':' + targetUrl.port : '') +
                       targetUrl.pathname.replace(/\/[^\/]*$/, '/');

          const rewritten = body.split('\n').map(line => {
            line = line.trimEnd();
            if (!line || line.startsWith('#')) return line;
            if (line.startsWith('http://') || line.startsWith('https://'))
              return '/api/proxy?url=' + encodeURIComponent(line);
            if (!line.startsWith('/'))
              return '/api/proxy?url=' + encodeURIComponent(base + line);
            const abs = targetUrl.protocol + '//' + targetUrl.hostname +
                        (targetUrl.port ? ':' + targetUrl.port : '') + line;
            return '/api/proxy?url=' + encodeURIComponent(abs);
          }).join('\n');

          res.end(rewritten);
          resolve();
        });
      } else {
        proxyRes.pipe(res);
        proxyRes.on('end', resolve);
        proxyRes.on('error', () => { res.end(); resolve(); });
      }
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) res.status(504).json({ error: 'Upstream timeout' });
      resolve();
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) res.status(502).json({ error: 'Upstream error: ' + err.message });
      resolve();
    });

    proxyReq.end();
  });
};
```

**Steps:**
1. `ks-movies-` repo → **Add file → Create new file**
2. Name: `api/proxy.js`
3. Upar wala poora code paste karo
4. **Commit new file** ✅

Commit hone ke baad Vercel auto deploy karega — phir yeh URL test karo:
```
https://ks-movies.vercel.app/api/proxy?url=http%3A%2F%2Fptu.ridsys.in%2Friptv%2Flive%2FSTAR_SPORTS_1_HD%2Findex.m3u8
