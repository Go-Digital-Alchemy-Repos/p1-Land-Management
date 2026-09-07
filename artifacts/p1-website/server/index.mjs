import http from 'node:http';
import https from 'node:https';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createGzip, createBrotliCompress } from 'node:zlib';
import { createContentStore } from './content.mjs';
import { clientIp } from './client-ip.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root,'dist/public');
const manifest = JSON.parse(await readFile(path.join(root,'config/client-site-manifest.json'),'utf8'));
const template = await readFile(path.join(publicDir,'index.html'),'utf8');
const { render } = await import(pathToFileURL(path.join(root,'dist/server/entry-server.js')).href);
const origin = process.env.P1_CORE_ORIGIN?.replace(/\/$/,'');
const content = createContentStore({ manifest, origin, cacheDir: process.env.P1_CONTENT_CACHE_DIR });
const canonical = 'https://www.p1landmanagement.com';
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.svg':'image/svg+xml', '.webp':'image/webp', '.avif':'image/avif', '.jpg':'image/jpeg', '.png':'image/png', '.woff2':'font/woff2' };
const escape = x => String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function send(req,res,status,body,type='text/html; charset=utf-8',cache='no-cache') {
  res.statusCode=status; res.setHeader('Content-Type',type); res.setHeader('Cache-Control',cache);
  if (req.method === 'HEAD') return res.end();
  const compressible = /text|json|xml|javascript/.test(type) && Buffer.byteLength(body)>1024;
  const accepted=req.headers['accept-encoding'] || '';
  if(compressible && /\b(br|gzip)\b/.test(accepted)) { const br=/\bbr\b/.test(accepted); res.setHeader('Content-Encoding',br?'br':'gzip'); res.setHeader('Vary','Accept-Encoding'); const stream=br?createBrotliCompress():createGzip(); stream.pipe(res); stream.end(body); } else res.end(body);
}
function proxy(req,res) {
  if (!origin) return send(req,res,503,JSON.stringify({message:'Service is temporarily unavailable.'}),'application/json');
  const incoming=new URL(req.url,'http://localhost');
  const target=new URL(origin);
  target.pathname=incoming.pathname;
  target.search=incoming.search;
  const headers={...req.headers,host:target.host,'x-forwarded-host':req.headers.host,'x-forwarded-proto':process.env.NODE_ENV==='production'?'https':'http'};
  delete headers['x-client-form-proxy-token']; delete headers['x-forwarded-for'];
  headers['x-forwarded-for']=clientIp(req);
  headers['x-real-ip']=headers['x-forwarded-for'];
  const upstream=(target.protocol==='https:'?https:http).request(target,{method:req.method,headers},response=>{
    res.writeHead(response.statusCode || 502,response.headers);
    if (req.method==='POST' && req.url.includes('/publish') && response.statusCode>=200 && response.statusCode<300) content.invalidate();
    response.pipe(res);
  });
  upstream.setTimeout(25000,()=>upstream.destroy());
  upstream.on('error',()=>{ if(!res.headersSent) send(req,res,502,JSON.stringify({message:'Service is temporarily unavailable. Please retry.'}),'application/json'); else res.destroy(); });
  req.on('aborted',()=>upstream.destroy()); req.pipe(upstream);
}
function headHtml(head,route) {
  const url=canonical+route; const img=head?.image?.startsWith('http')?head.image:canonical+(head?.image || '/opengraph.jpg');
  let text=`<title>${escape(head?.title || 'P1 Land & Property Management')}</title><meta name="description" content="${escape(head?.description || '')}"><meta name="robots" content="${head?.noindex?'noindex, follow':'index, follow'}"><link rel="canonical" href="${url}">`;
  for(const [k,v]of Object.entries({'og:title':head?.title,'og:description':head?.description,'og:url':url,'og:image':img,'og:type':route.startsWith('/blog/')?'article':'website','og:site_name':'P1 Land & Property Management','og:locale':'en_US'}))text+=`<meta property="${k}" content="${escape(v || '')}">`;
  for(const [k,v]of Object.entries({'twitter:card':'summary_large_image','twitter:title':head?.title,'twitter:description':head?.description,'twitter:image':img}))text+=`<meta name="${k}" content="${escape(v || '')}">`;
  for(const item of (Array.isArray(head?.jsonLd)?head.jsonLd:head?.jsonLd?[head.jsonLd]:[]))text+=`<script type="application/ld+json" data-seo-jsonld>${JSON.stringify(item).replaceAll('<','\\u003c')}</script>`;
  return text;
}
const server=http.createServer(async(req,res)=>{
  try {
    if (!req.url?.startsWith('/') || req.url.startsWith('//')) return send(req,res,400,'Bad request');
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname);
    if(pathname.includes('\\')||pathname.includes('\0'))return send(req,res,400,'Bad request');
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','SAMEORIGIN');
    res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if(process.env.NODE_ENV==='production')res.setHeader('Strict-Transport-Security','max-age=31536000');
    const host=(req.headers.host || '').split(':')[0];
    let normalized=pathname;
    if(normalized.endsWith('.html'))normalized=normalized.slice(0,-5);
    if(normalized.endsWith('/index'))normalized=normalized.slice(0,-6)||'/';
    if(normalized!=='/')normalized=normalized.replace(/\/+$/,'');
    if(host==='p1landmanagement.com' || (normalized!==pathname && !pathname.startsWith('/api/'))) {res.writeHead(308,{Location:`${host==='p1landmanagement.com'?canonical:''}${normalized}${url.search}`});return res.end();}
    if(pathname==='/api/p1/page-content' && ['GET','HEAD'].includes(req.method)) {const snapshot=await content.snapshot(url.searchParams.get('path')||'/');return send(req,res,snapshot?200:404,JSON.stringify(snapshot||{error:'Not found'}),'application/json','no-store');}
    if(pathname==='/healthz')return send(req,res,200,'{"status":"ok"}','application/json','no-store');
    if(pathname==='/admin'||pathname.startsWith('/admin/')||pathname==='/api'||pathname.startsWith('/api/')||pathname.startsWith('/uploads/')||pathname.startsWith('/r2/'))return proxy(req,res);
    if(!['GET','HEAD'].includes(req.method))return send(req,res,405,'Method not allowed');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'");
    if(url.searchParams.has('cmsPreview'))res.setHeader('X-Robots-Tag','noindex, nofollow');
    if(pathname==='/sitemap.xml') {
      const snapshots=await Promise.all([...content.routes.keys()].map(p=>content.snapshot(p)));
      const body=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${snapshots.map(s=>`<url><loc>${canonical}${escape(s.route)}</loc>${s.publishedAt?`<lastmod>${escape(new Date(s.publishedAt).toISOString())}</lastmod>`:''}</url>`).join('')}</urlset>`;
      return send(req,res,200,body,'application/xml');
    }
    if(content.routes.has(pathname)) {
      const snapshot=await content.snapshot(pathname); const result=render(pathname,snapshot);
      const state=JSON.stringify(snapshot).replaceAll('<','\\u003c');
      const html=template.replace(/<!--seo-head-start-->[\s\S]*?<!--seo-head-end-->/,`<!--seo-head-start-->${headHtml(result.head,pathname)}<!--seo-head-end-->`).replace(/<div id="root">[\s\S]*<\/div>/,`<div id="root">${result.html}</div><script type="application/json" id="p1-published-content">${state}</script>`);
      return send(req,res,200,html,'text/html; charset=utf-8',url.searchParams.has('cmsPreview')?'private, no-store':'no-cache');
    }
    const file=path.resolve(publicDir,'.'+pathname);
    if(!file.startsWith(publicDir+path.sep)||pathname.split('/').some(p=>p.startsWith('.')) )return send(req,res,404,'Not found');
    try { const info=await stat(file);if(!info.isFile())throw new Error();const type=mime[path.extname(file)]||'application/octet-stream';const immutable=pathname.startsWith('/assets/');if(/text|javascript|json|xml/.test(type))return send(req,res,200,await readFile(file),type,immutable?'public, max-age=31536000, immutable':'no-cache');res.writeHead(200,{'Content-Type':type,'Content-Length':info.size,'Cache-Control':immutable?'public, max-age=31536000, immutable':'no-cache'});if(req.method==='HEAD')return res.end();createReadStream(file).pipe(res);return;}catch{}
    res.setHeader('X-Robots-Tag','noindex');
    return send(req,res,404,'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page not found | P1 Land Management</title></head><body><main><h1>Page not found</h1><p>We could not find this page.</p><a href="/">Return home</a> · <a href="/contact">Request an estimate</a></main></body></html>');
  } catch { if(!res.headersSent)send(req,res,500,'Service temporarily unavailable');else res.destroy(); }
});
server.listen(Number(process.env.PORT)||4173,'0.0.0.0',()=>console.log(`P1 website listening on ${Number(process.env.PORT)||4173}`));
