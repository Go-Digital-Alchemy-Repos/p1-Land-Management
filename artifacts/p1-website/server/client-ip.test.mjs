import test from 'node:test';
import assert from 'node:assert/strict';
import { clientIp } from './client-ip.mjs';

test('direct servers ignore forged forwarding headers', () => {
  const req = {headers: {'x-real-ip':'192.0.2.5','x-forwarded-for':'192.0.2.6'},socket:{remoteAddress:'127.0.0.1'}};
  assert.equal(clientIp(req, {NODE_ENV:'production'}), '127.0.0.1');
});
test('Railway uses validated edge IP rather than a shared proxy address', () => {
  const req = {headers: {'x-real-ip':'192.0.2.5','x-forwarded-for':'192.0.2.6'},socket:{remoteAddress:'10.0.0.1'}};
  const env = {NODE_ENV:'production',RAILWAY_ENVIRONMENT_ID:'test'};
  assert.equal(clientIp(req, env), '192.0.2.5');
  req.headers['x-real-ip'] = '192.0.2.5, 192.0.2.6';
  assert.equal(clientIp(req, env), '10.0.0.1');
});
