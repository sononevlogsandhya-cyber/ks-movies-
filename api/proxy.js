const http  = require('http');
const https = require('https');
const { URL } = require('url');

const ALLOWED_DOMAINS = ['ptu.ridsys.in','stvlive.net'];

function isAllowed(h){return ALLOWED_DOMAINS.some(d=>h===d||h.endsWith('.'+d));}

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

  const lib=t.protocol==='https:'?https:http;
  const opts={
    hostname:t.hostname,
    port:t.port||(t.protocol==='https:'?443:80),
    path:t.pathname+t.search,
    method:'GET',
    headers:{'User-Agent':'Mozilla/5.0','Accept':'*/*','Accept-Encoding':'identity'},
    timeout:15000
  };

  return new Promise(resolve=>{
    const pr=lib.request(opts,sr=>{
      const ct=sr.headers['content-type']||'';
      const isM3U8=rawUrl.includes('.m3u8')||ct.includes('mpegurl');
      if(sr.headers['content-type']) res.setHeader('Content-Type',sr.headers['content-type']);
      res.setHeader('Cache-Control','no-cache');
      res.status(sr.statusCode);

      if(isM3U8){
        let body='';
        sr.setEncoding('utf8');
        sr.on('data',c=>body+=c);
        sr.on('end',()=>{
          const base=t.protocol+'//'+t.hostname+(t.port?':'+t.port:'')+t.pathname.replace(/\/[^\/]*$/,'/');
          const out=body.split('\n').map(line=>{
            line=line.trimEnd();
            if(!line||line.startsWith('#'))return line;
            if(line.startsWith('http://')||line.startsWith('https://'))
              return '/api/proxy?url='+encodeURIComponent(line);
            if(!line.startsWith('/'))
              return '/api/proxy?url='+encodeURIComponent(base+line);
            return '/api/proxy?url='+encodeURIComponent(t.protocol+'//'+t.hostname+(t.port?':'+t.port:'')+line);
          }).join('\n');
          res.end(out);resolve();
        });
      } else {
        sr.pipe(res);
        sr.on('end',resolve);
        sr.on('error',()=>{res.end();resolve();});
      }
    });
    pr.on('timeout',()=>{pr.destroy();if(!res.headersSent)res.status(504).end();resolve();});
    pr.on('error',e=>{if(!res.headersSent)res.status(502).json({error:e.message});resolve();});
    pr.end();
  });
};
