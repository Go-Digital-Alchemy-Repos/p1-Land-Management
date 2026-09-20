#!/usr/bin/env python3
"""Run restore ledger/HTTP tests against an owned, disposable local PostgreSQL18 container."""
import json
import os
from pathlib import Path
import secrets
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
IMAGE = "sha256:6c538e7206ea40ff740ef27883529390a690b6ead6ba96b44c67a9f7c638e8fd"
NAME = "p1-restore-test-" + secrets.token_hex(6)


def output(*args):
    return subprocess.check_output(args, text=True).strip()


def main():
    if not output("docker", "context", "inspect", "--format", "{{.Endpoints.docker.Host}}").startswith("unix://"):
        raise RuntimeError("A local Docker socket is required")
    created = False
    try:
        output("docker", "run", "--pull=never", "-d", "--name", NAME,
               "-e", "POSTGRES_PASSWORD=synthetic-only", "-e", "POSTGRES_DB=restore_operations_test",
               "-p", "127.0.0.1::5432", IMAGE)
        created = True
        info = json.loads(output("docker", "inspect", NAME))[0]
        port = info["NetworkSettings"]["Ports"]["5432/tcp"][0]["HostPort"]
        for _ in range(100):
            if subprocess.run(["docker", "exec", NAME, "pg_isready", "-U", "postgres"], capture_output=True).returncode == 0:
                break
            time.sleep(.2)
        else:
            raise RuntimeError("Disposable PostgreSQL did not become ready")
        url = f"postgres://postgres:synthetic-only@127.0.0.1:{port}/restore_operations_test"
        # Do not inherit production database URLs, provider credentials or delivery configuration.
        env = {"PATH": os.environ["PATH"], "NODE_ENV": "test", "TZ": "America/New_York",
               "DASHBOARD_DATABASE_URL": url, "RESTORE_TEST_DATABASE_URL": url,
               "DASHBOARD_MIGRATIONS_DIR": str(ROOT / "artifacts/api-server/migrations/dashboard"),
               "BETTER_AUTH_SECRET": secrets.token_hex(32), "DASHBOARD_ORIGIN": "http://localhost:4180"}
        runner = ["node", str(ROOT / "platform/p1-core/node_modules/tsx/dist/cli.mjs")]
        subprocess.run(runner + ["artifacts/api-server/src/dashboard/migrate.ts"], cwd=ROOT, env=env, check=True, timeout=120)
        # Fixtures install a temporary audit-rejection trigger; do not overlap test files.
        subprocess.run(runner + ["--test", "--test-concurrency=1",
                                "artifacts/api-server/src/dashboard/website-restore.test.ts",
                                "artifacts/api-server/src/dashboard/website-restore.http.test.ts"],
                       cwd=ROOT, env=env, check=True, timeout=120)
    finally:
        if created:
            subprocess.run(["docker", "rm", "-fv", NAME], check=True, capture_output=True)
            if NAME in output("docker", "ps", "-a", "--format", "{{.Names}}").splitlines():
                raise RuntimeError("Disposable restore container cleanup failed")
            print("Disposable restore container removed")


if __name__ == "__main__":
    main()
