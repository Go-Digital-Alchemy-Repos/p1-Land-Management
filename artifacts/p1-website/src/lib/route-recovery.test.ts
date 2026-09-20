import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverStaleRoute } from './route-recovery.ts';

test('a stale route recovers once across documents and does not loop on a broken release', () => {
  const values = new Map<string,string>(); let reloads = 0, now = 100_000;
  const browser = {storage: {getItem: (key:string) => values.get(key) ?? null, setItem:(key:string,value:string) => {values.set(key,value);}}, reload:()=>{reloads++;}, now:()=>now};
  const error = new TypeError('Failed to fetch dynamically imported module: https://www.p1landmanagement.com/assets/about-old.js');
  assert.equal(recoverStaleRoute(error,browser),true);
  assert.equal(recoverStaleRoute(error,{...browser}),false);
  assert.equal(recoverStaleRoute(new TypeError('Importing a module script failed.'),browser),false);
  assert.equal(reloads,1);
  now += 60_001;
  assert.equal(recoverStaleRoute(error,browser),true);
});

test('ordinary render errors and unavailable storage retain manual recovery', () => {
  let reloads=0;
  const browser = {storage:{getItem:()=>{throw Error('blocked');},setItem:()=>{}},reload:()=>{reloads++;},now:()=>100_000};
  assert.equal(recoverStaleRoute(new Error('Cannot render customer content'),browser),false);
  assert.equal(recoverStaleRoute(new Error('Failed to fetch dynamically imported module'),browser),false);
  assert.equal(reloads,0);
});
