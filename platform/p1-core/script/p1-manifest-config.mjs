import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const P1_PRODUCTION_ORIGIN = 'https://www.p1landmanagement.com';
function originValue(value, name) {
  if (typeof value !== 'string' || !value || value !== value.trim() || !/^https:\/\/[^/?#]+\/?$/i.test(value) || /[\\%\s]/.test(value)) {
    throw new Error(`${name} must be a bare HTTPS origin`);
  }
  let parsed;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be a bare HTTPS origin`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash || value.includes('?') || value.includes('#')) {
    throw new Error(`${name} must be a bare HTTPS origin without credentials, path, query, or fragment`);
  }
  return parsed.origin;
}

/** Public and CMS surfaces share one gateway origin; /admin is a route, not an origin. */
export function resolveP1DeploymentConfig(env = {}, localRevision) {
  const publicOrigin = originValue(env.P1_PUBLIC_ORIGIN || P1_PRODUCTION_ORIGIN, 'P1_PUBLIC_ORIGIN');
  const adminOrigin = originValue(env.P1_ADMIN_ORIGIN || publicOrigin, 'P1_ADMIN_ORIGIN');
  if (publicOrigin !== adminOrigin) throw new Error('P1_ADMIN_ORIGIN must equal P1_PUBLIC_ORIGIN for the same-origin /admin gateway');
  const revision = env.P1_SOURCE_REVISION || env.RAILWAY_GIT_COMMIT_SHA || localRevision;
  if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/i.test(revision)) {
    throw new Error('Set P1_SOURCE_REVISION to the full 40-character source Git commit (or provide RAILWAY_GIT_COMMIT_SHA)');
  }
  return { publicOrigin, adminOrigin, revision: revision.toLowerCase() };
}

function localGitRevision() {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return undefined; }
}

export function configureP1Manifest(manifest, env = process.env) {
  const config = resolveP1DeploymentConfig(env, localGitRevision());
  return {
    ...manifest,
    client: { ...manifest.client, source: { ...manifest.client.source, revision: config.revision } },
    origins: {
      ...manifest.origins,
      publicSite: config.publicOrigin,
      admin: config.adminOrigin,
      publicApiPath: '/api', adminApiPath: '/api', routingMode: 'same-origin-proxy',
    },
  };
}

// Used inside the Core image build; this never changes unrelated manifest content.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3) throw new Error('Usage: node p1-manifest-config.mjs <manifest.json>');
  const file = process.argv[2];
  const result = configureP1Manifest(JSON.parse(readFileSync(file, 'utf8')));
  writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
  console.log(`P1 manifest configured for ${result.origins.publicSite} at source ${result.client.source.revision}`);
}
