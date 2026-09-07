import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { configureP1Manifest, resolveP1DeploymentConfig, P1_PRODUCTION_ORIGIN } from './p1-manifest-config.mjs';
const revision = 'a'.repeat(40);
const manifest = { client: { source: { repository: 'https://example.test/p1.git', revision: 'old' } }, origins: {}, routes: [{ id: 'home', path: '/' }], puck: { sample: 'preserved' } };

test('production defaults and local revision; no old fixed revision', () => {
  assert.deepEqual(resolveP1DeploymentConfig({}, revision), { publicOrigin: P1_PRODUCTION_ORIGIN, adminOrigin: P1_PRODUCTION_ORIGIN, revision });
  assert.throws(() => resolveP1DeploymentConfig({}), /P1_SOURCE_REVISION/);
});
test('staging admin defaults to public and explicit matching origins normalize', () => {
  assert.deepEqual(resolveP1DeploymentConfig({ P1_PUBLIC_ORIGIN: 'https://p1-staging.up.railway.app/', P1_SOURCE_REVISION: revision }), { publicOrigin: 'https://p1-staging.up.railway.app', adminOrigin: 'https://p1-staging.up.railway.app', revision });
  assert.equal(resolveP1DeploymentConfig({ P1_PUBLIC_ORIGIN: 'https://p1-staging.up.railway.app', P1_ADMIN_ORIGIN: 'https://p1-staging.up.railway.app:443/', RAILWAY_GIT_COMMIT_SHA: revision }).adminOrigin, 'https://p1-staging.up.railway.app');
});
test('reject origin mismatch and unsafe URL forms without echoing credentials', () => {
  assert.throws(() => resolveP1DeploymentConfig({ P1_PUBLIC_ORIGIN: 'https://stage.example.test', P1_ADMIN_ORIGIN: 'https://admin.example.test', P1_SOURCE_REVISION: revision }), /must equal/);
  for (const bad of ['http://stage.example.test', 'javascript:alert(1)', 'https://user:secret@stage.example.test', 'https://stage.example.test/admin', 'https://stage.example.test/?token=secret', 'https://stage.example.test/#secret', 'https://stage.example.test?', 'https://stage.example.test#', 'https://stage.example.test\\admin', ' https://stage.example.test', 'https:///stage.example.test', 'https:stage.example.test', 'https://%73tage.example.test']) {
    assert.throws(() => resolveP1DeploymentConfig({ P1_PUBLIC_ORIGIN: bad, P1_SOURCE_REVISION: revision }), error => !error.message.includes('secret') && /HTTPS origin/.test(error.message));
  }
});
test('full revision validation, precedence and immutable manifest transformation', () => {
  for (const bad of ['aad2057', 'main', 'x'.repeat(40), ' '+revision]) assert.throws(() => resolveP1DeploymentConfig({ P1_SOURCE_REVISION: bad }), /40-character/);
  assert.equal(resolveP1DeploymentConfig({ P1_SOURCE_REVISION: revision.toUpperCase(), RAILWAY_GIT_COMMIT_SHA: 'b'.repeat(40) }).revision, revision);
  const result = configureP1Manifest(manifest, { P1_SOURCE_REVISION: revision });
  assert.equal(manifest.client.source.revision, 'old');
  assert.deepEqual(result.routes, manifest.routes);
  assert.deepEqual(result.puck, manifest.puck);
  assert.equal(result.origins.routingMode, 'same-origin-proxy');
  assert.equal(result.origins.adminApiPath, '/api');
});
test('Core build CLI applies the same staging configuration as public generator helper', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'p1-manifest-config-'));
  try {
    const file = join(dir, 'manifest.json');
    const env = { ...process.env, P1_PUBLIC_ORIGIN: 'https://p1-stage.example.test', P1_ADMIN_ORIGIN: 'https://p1-stage.example.test', P1_SOURCE_REVISION: revision };
    await writeFile(file, JSON.stringify(manifest));
    execFileSync(process.execPath, [fileURLToPath(new URL('./p1-manifest-config.mjs', import.meta.url)), file], { env, stdio: 'pipe' });
    assert.deepEqual(JSON.parse(await readFile(file, 'utf8')), configureP1Manifest(manifest, env));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
