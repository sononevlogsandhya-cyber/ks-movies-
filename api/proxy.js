const http  = require('http');
const https = require('https');
const { URL } = require('url');

const ALLOWED_DOMAINS = ['ptu.ridsys.in','stvlive.net'];
function isAllowed(h){ return ALLOWED_DOMAINS.some(d=>h===d||h.endsWith('.'+d)); }

module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','*');
  if(req.method==='OPTIONS'){res.status(200).end();return;}

  const rawUrl=req.query.url;
  if(!rawUrl){res.status(400).json({error:'url missing'});return;}

  let t;
  try{t=new URL(decodeURIComponent(rawUrl));}
  catch(e){res.status(400).json({error:'bad url'});return;}

  if(!isAllowed(t.hostname)){res.status(403).json({error:'blocked'});return;}

  // .ts segments = DIRECT REDIRECT (browser fetches straight from stream server)
  // Sirf m3u8 manifest proxy se - segments bilkul direct!
  const isSegment=t.pathname.endsWith('.ts')||t.pathname.endsWith('.aac')||t.pathname.endsWith('.mp4');
  if(isSegment){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.writeHead(302,{'Location':decodeURIComponent(rawUrl)});
    res.end();
    return;
  }

  const lib=t.protocol==='https:'?https:http;
  const opts={
    hostname:t.hostname,
    port:t.port||(t.protocol==='https:'?443:80),
    path:t.pathname+t.search,
    method:'GET',
    headers:{'User-Agent':'Mozilla/5.0','Accept':'*/*','Accept-Encoding':'identity','Connection':'keep-alive'},
    timeout:10000,
  };

  return new Promise(resolve=>{
    const pr=lib.request(opts,sr=>{
      if(sr.headers['content-type']) res.setHeader('Content-Type',sr.headers['content-type']);
      res.setHeader('Cache-Control','no-cache,no-store');
      res.status(sr.statusCode);

      let body='';
      sr.setEncoding('utf8');
      sr.on('data',c=>body+=c);
      sr.on('end',()=>{
        const base=t.protocol+'//'+t.hostname+(t.port?':'+t.port:'')+t.pathname.replace(/\/[^\/]*$/,'/');

        const out=body.split('\n').map(line=>{
          line=line.trimEnd();
          if(!line||line.startsWith('#')) return line;

          // Resolve to full URL
          let full;
          if(line.startsWith('http://')||line.startsWith('https://')) full=line;
          else if(line.startsWith('/')) full=t.protocol+'//'+t.hostname+(t.port?':'+t.port:'')+line;
          else full=base+line;

          // Sub-playlist → proxy se
          if(full.includes('.m3u8')) return '/api/proxy?url='+encodeURIComponent(full);

          // Segments → DIRECT (no Vercel bandwidth, no buffering!)
          return full;
        }).join('\n');

        res.end(out);
        resolve();
      });
      sr.on('error',()=>{res.end();resolve();});
    });
    pr.on('timeout',()=>{pr.destroy();if(!res.headersSent)res.status(504).end();resolve();});
    pr.on('error',e=>{if(!res.headersSent)res.status(502).json({error:e.message});resolve();});
    pr.end();
  });
};
