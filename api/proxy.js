const http = require('http');
const https = require('https');
const { URL } = require('url');

// ── ALLOWED DOMAIN KEYWORDS ──
// Hostname mein koi bhi keyword ho toh allow — wildcard matching
const ALLOWED_KEYWORDS = [
  // existing live streams
  'ptu.ridsys.in',
  'stvlive.net',
  // movie sites — keyword match (covers all TLDs: .date .football .in .com etc)
  'mp4moviez',
  'moviesda',
  'filmyzilla',
  'bollyflix',
  'vegamovies',
  '9xmovies',
  'katmovie',
  'khatrimaza',
  'rdxhd',
  'jalshamoviez',
  'worldfree4u',
  'cinevood',
  'hdmovies',
  'movieverse',
  'filmywap',
  // safe hosting
  'archive.org',
  'googleusercontent.com',
  'drive.google.com',
  'googleapis.com',
];

function isAllowed(hostname) {
  const h = hostname.toLowerCase();
  return ALLOWED_KEYWORDS.some(kw => h.includes(kw));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const rawUrl = req.query.url;
  if (!rawUrl) { res.status(400).json({ error: 'url missing' }); return; }

  let t;
  try { t = new URL(decodeURIComponent(rawUrl)); }
  catch (e) { res.status(400).json({ error: 'bad url' }); return; }

  if (!isAllowed(t.hostname)) {
    res.status(403).json({ error: 'Domain not allowed: ' + t.hostname });
    return;
  }

  const lib = t.protocol === 'https:' ? https : http;

  const opts = {
    hostname: t.hostname,
    port: t.port || (t.protocol === 'https:' ? 443 : 80),
    path: t.pathname + t.search,
    method: 'GET',
    headers: {
      // ✅ KEY FIX — NO Referer header → mp4moviez hotlink bypass
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      'Accept': 'video/mp4,video/*,*/*;q=0.9',
      'Accept-Encoding': 'identity',
      'Accept-Language': 'en-US,en;q=0.9',
      'Connection': 'keep-alive',
      // Forward Range header for video seeking
      ...(req.headers['range'] ? { 'Range': req.headers['range'] } : {}),
    },
    timeout: 20000,
  };

  const isM3U8 = t.pathname.endsWith('.m3u8');

  return new Promise(resolve => {
    const pr = lib.request(opts, sr => {
      // Forward important headers
      if (sr.headers['content-type'])    res.setHeader('Content-Type', sr.headers['content-type']);
      if (sr.headers['content-length'])  res.setHeader('Content-Length', sr.headers['content-length']);
      if (sr.headers['content-range'])   res.setHeader('Content-Range', sr.headers['content-range']);
      if (sr.headers['accept-ranges'])   res.setHeader('Accept-Ranges', sr.headers['accept-ranges']);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(sr.statusCode);

      if (isM3U8) {
        // M3U8 — rewrite segment URLs through proxy
        let body = '';
        sr.setEncoding('utf8');
        sr.on('data', c => body += c);
        sr.on('end', () => {
          const base = t.protocol + '//' + t.hostname + (t.port ? ':' + t.port : '') + t.pathname.replace(/\/[^\/]*$/, '/');
          const out = body.split('\n').map(line => {
            line = line.trimEnd();
            if (!line || line.startsWith('#')) return line;
            let full;
            if (line.startsWith('http://') || line.startsWith('https://')) full = line;
            else if (line.startsWith('/')) full = t.protocol + '//' + t.hostname + (t.port ? ':' + t.port : '') + line;
            else full = base + line;
            return '/api/proxy?url=' + encodeURIComponent(full);
          }).join('\n');
          res.end(out);
          resolve();
        });
        sr.on('error', () => { res.end(); resolve(); });
      } else {
        // MP4 / TS — pipe directly
        sr.pipe(res, { end: true });
        sr.on('end', resolve);
        sr.on('error', () => { try { res.end(); } catch (e) {} resolve(); });
      }
    });

    pr.on('timeout', () => {
      pr.destroy();
      if (!res.headersSent) res.status(504).end();
      resolve();
    });
    pr.on('error', e => {
      if (!res.headersSent) res.status(502).json({ error: e.message });
      resolve();
    });
    pr.end();
  });
};
