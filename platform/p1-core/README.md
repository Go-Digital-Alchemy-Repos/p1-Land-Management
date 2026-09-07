# P1 CMS and CRM

P1-owned adaptation of Core Platform `aad2057`, isolated from the original project. Provides `/admin` and `/api` behind the public P1 React website. Retains CMS, media, forms, CRM, revisions and permissions. Events and Careers are installed but disabled; ecommerce, directory, membership and portfolio entry points, jobs and exclusive provider dependencies are removed.

See [P1 operations](docs/P1-OPERATIONS.md) for configuration, migrations, setup, lead recovery, validation and rollback. The reviewed website content manifest is `config/p1-client-site-manifest.json`. Build with Node 22, `npm ci`, `npm run check`, `npm run build`.

Historical upstream documents retained under `docs` are reference material, not P1 deployment instructions. Only `p1-migrations` is executed for the P1 database.
