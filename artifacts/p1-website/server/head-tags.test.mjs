import test from 'node:test';
import assert from 'node:assert/strict';
import { createHeadTagStore, insertHeadTags } from './head-tags.mjs';
const payload = html => ({ schemaVersion: 1, stackId: 'p1-land-management', html });
test('head refreshes coalesce, cache briefly, and propagate explicit clearing', async () => {
  let time = 0, calls = 0, release, value = '<meta name="verification" content="$&">';
  const store = createHeadTagStore({ origin: 'https://core.example/', now: () => time, fetcher: async (url, options) => {
    calls++; assert.equal(url, 'https://core.example/api/p1/website-head-tags');
    assert.deepEqual(options.headers, { Accept: 'application/json' }); assert.equal(options.redirect, 'error');
    await new Promise(r => { release = r; }); return Response.json(payload(value));
  }});
  const first = store.snapshot(), second = store.snapshot(); assert.equal(calls, 1); release();
  assert.deepEqual(await Promise.all([first, second]), [value, value]);
  time = 29999; assert.equal(await store.snapshot(), value); assert.equal(calls, 1);
  time = 30000; value = ''; const clear = store.snapshot(); release(); assert.equal(await clear, ''); assert.equal(calls, 2);
});
test('failure drops expired markup and retries after the bounded empty-cache interval', async () => {
  let time = 0, failed = false, calls = 0;
  const store = createHeadTagStore({ origin: 'https://core.example', now: () => time, fetcher: async () => { calls++; if (failed) throw Error('Private upstream failure'); return Response.json(payload('<script src="/tag.js"></script>')); }});
  assert.match(await store.snapshot(), /script/); failed = true; time = 30000;
  assert.equal(await store.snapshot(), ''); assert.equal(await store.snapshot(), ''); assert.equal(calls, 2);
  failed = false; time = 60000; assert.match(await store.snapshot(), /script/); assert.equal(calls, 3);
});
test('foreign, oversized, malformed and private-shaped payloads fail closed', async () => {
  const responses = [
    () => Response.json({...payload('tag'), stackId: 'other'}),
    () => Response.json({...payload('tag'), schemaVersion: 2}),
    () => Response.json({...payload('tag'), private: 'not public'}),
    () => Response.json(payload('x'.repeat(100001))),
    () => Response.json(payload(null)),
    () => new Response('bad JSON', {headers:{'content-type':'application/json'}}),
    () => new Response('tag', {headers:{'content-type':'text/html'}}),
    () => Response.json(payload('tag'), {status:503}),
    () => Response.json(payload('tag'), {headers:{'content-length':String(1024*1024+1)}}),
    () => new Response(new Uint8Array([0xff]), {headers:{'content-type':'application/json'}}),
  ];
  for (const response of responses) assert.equal(await createHeadTagStore({origin:'https://core.example',fetcher:async()=>response()}).snapshot(), '');
  let cancelled = false;
  const stream = new ReadableStream({start(c){c.enqueue(new Uint8Array(1024*1024+1));},cancel(){cancelled=true;}});
  assert.equal(await createHeadTagStore({origin:'https://core.example',fetcher:async()=>new Response(stream,{headers:{'content-type':'application/json'}})}).snapshot(),'');
  assert(cancelled);
});
test('missing source and timed-out reads produce no markup', async () => {
  assert.equal(await createHeadTagStore({fetcher:async()=>{throw Error('Must not fetch');}}).snapshot(),'');
  const keepAlive = setTimeout(()=>{},1000);
  try {
    const store = createHeadTagStore({origin:'https://core.example',timeout:5,fetcher:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
    assert.equal(await store.snapshot(),'');
  } finally {clearTimeout(keepAlive);}
});
test('insertion preserves authored text literally and changes only the first template head boundary', () => {
  const document = '<html><head><title>Site</title></head><body>Content</body></html>';
  const markup = '<meta name="example" content="$& $` $\'">\n<script>literal()</script>';
  assert.equal(insertHeadTags(document,markup),document.replace('</head>',markup.replaceAll('$','$$$$')+'\n</head>'));
  assert(insertHeadTags(document,markup).includes(markup));assert.equal(insertHeadTags(document,''),document);
  assert.equal(insertHeadTags('not an HTML document',markup),'not an HTML document');
});
