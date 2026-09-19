import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createWebsiteIdentityStore, parseWebsiteIdentity, identityIconHead } from './website-identity.mjs';
const sample = () => ({schemaVersion:1,stackId:'p1-land-management',version:'a'.repeat(64),companyName:'P1 Test',companyAddress:null,phoneDisplay:'(704) 221-8928',phoneHref:'tel:+17042218928',logoUrl:'/r2/cms/branding/test.webp',faviconUrl:'/uploads/cms/branding/icon.webp',googleBusinessUrl:'https://www.google.com/maps/place/P1'});
test('validates projection provenance, coherent phones, paths and secret exclusion',()=>{
 assert.deepEqual(parseWebsiteIdentity(sample()),sample());
 for(const patch of [{stackId:'other'}, {secret:'value'}, {phoneHref:'tel:+15555555555'}, {logoUrl:'https://evil.test/x'}, {logoUrl:'/r2/private/../x'}, {faviconUrl:'/api/admin'}, {googleBusinessUrl:'https://google.com.evil.test'}, {companyName:'x\nheader'}, {companyAddress:''}, {companyAddress:'a'.repeat(2001)}, {phoneDisplay:'Call 7042218928'}, {phoneDisplay:' '.repeat(81)+'7042218928'}, {googleBusinessUrl:'https://www.google.com/with space'}]) assert.throws(()=>parseWebsiteIdentity({...sample(),...patch}));
});
test('retains valid identity across expired failing refresh and process-store restart',async()=>{
 const cacheDir=await mkdtemp(path.join(tmpdir(),'p1-identity-test-'));let time=0,calls=0;
 try {
  const store=createWebsiteIdentityStore({origin:'https://core.example.test',cacheDir,now:()=>time,ttl:10,fetcher:async()=>{calls++;if(calls>1)throw Error('offline');return Response.json(sample());}});
  assert.deepEqual(await store.snapshot(),sample());time=11;
  assert.deepEqual(await store.snapshot(),sample());assert.equal(calls,2);
  const restarted=createWebsiteIdentityStore({origin:'https://core.example.test',cacheDir,fetcher:async()=>{throw Error('offline')}});
  assert.deepEqual(await restarted.snapshot(),sample());
 } finally {await rm(cacheDir,{recursive:true,force:true});}
});
test('never publishes malformed cache or oversized/invalid remote projection',async()=>{
 const cacheDir=await mkdtemp(path.join(tmpdir(),'p1-identity-invalid-'));
 try {
  await writeFile(path.join(cacheDir,'website-identity.json'),JSON.stringify({...sample(),stackId:'other'}));
  const store=createWebsiteIdentityStore({origin:'https://core.example.test',cacheDir,fetcher:async()=>Response.json({...sample(),secret:'private'})});
  assert.equal(await store.snapshot(),null);
 } finally {await rm(cacheDir,{recursive:true,force:true});}
});
test('deduplicates concurrent reads and generation-fences in-flight invalidation',async()=>{
 let release,calls=0;const store=createWebsiteIdentityStore({origin:'https://core.example.test',fetcher:async()=>{calls++;await new Promise(r=>release=r);return Response.json(sample());}});
 const a=store.snapshot(),b=store.snapshot();assert.equal(calls,1);store.invalidate();release();await Promise.all([a,b]);
 const c=store.snapshot();assert.equal(calls,2);release();await c;
});
test('updates icon and touch-icon together using revision while retaining bundled defaults when unconfigured',()=>{
 const html='<html><head><link rel="icon" href="/favicon.ico"><link rel="apple-touch-icon" href="/apple-touch-icon.png"></head></html>';
 assert.equal(identityIconHead(html,null),html);
 const result=identityIconHead(html,sample());assert.equal((result.match(/\?v=/g)||[]).length,2);assert.ok(!result.includes('/favicon.ico'));assert.ok(result.includes('rel="apple-touch-icon"'));
});

test('oversized persisted projection is not loaded',async()=>{
 const cacheDir=await mkdtemp(path.join(tmpdir(),'p1-identity-large-'));
 try {
  await writeFile(path.join(cacheDir,'website-identity.json'),' '.repeat(20000)+JSON.stringify(sample()));
  const store=createWebsiteIdentityStore({cacheDir,origin:'https://core.example.test',fetcher:async()=>{throw Error('offline')}});
  assert.equal(await store.snapshot(),null);
 }finally{await rm(cacheDir,{recursive:true,force:true});}
});
test('phone projection exactly matches Core international and domestic normalization', () => {
  for (const [phoneDisplay, phoneHref] of [
    ['+1234567', 'tel:+1234567'], ['+123456789', 'tel:+123456789'],
    ['+4412345678', 'tel:+4412345678'], ['+123456789012345', 'tel:+123456789012345'],
    ['(704) 221-8928', 'tel:+17042218928'], ['1 (704) 221-8928', 'tel:+17042218928'],
  ]) assert.equal(parseWebsiteIdentity({...sample(), phoneDisplay, phoneHref}).phoneHref, phoneHref);
  for (const [phoneDisplay, phoneHref] of [
    ['1234567', 'tel:+1234567'], ['7042218928', 'tel:+7042218928'],
    ['27042218928', 'tel:+27042218928'], ['+1234567', 'tel:+11234567'],
    ['+4412345678', 'tel:+14412345678'], ['+123456', 'tel:+123456'],
    ['+1234567890123456', 'tel:+1234567890123456'], ['Call 7042218928', 'tel:+17042218928'],
  ]) assert.throws(() => parseWebsiteIdentity({...sample(), phoneDisplay, phoneHref}));
});
