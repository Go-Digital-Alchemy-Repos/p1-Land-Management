#!/usr/bin/env python3
"""Smoke the compiled Linux runtime with disposable, verified-TLS PostgreSQL."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import signal
import shutil
import subprocess
import sys
import tempfile
import time
import uuid


def verify(output: Path, bundle: Path | None = None) -> int:
    root = Path(__file__).resolve().parent.parent
    bundle = bundle or root / "dist/index.cjs"
    prefix = "core-runtime-smoke-" + uuid.uuid4().hex[:12]
    db_name = "core_runtime_shutdown_test"
    db_container = prefix + "-db"
    app_container = prefix + "-app"
    created = []
    private_values = [secrets.token_hex(24) for _ in range(3)]
    password, session_secret, setup_token = private_values
    report = {"status": "failed", "command": "env NODE_ENV=production node dist/index.cjs"}
    phase = "preflight"

    def command(args, timeout=30, check=True):
        result = subprocess.run(args, cwd=root, text=True, capture_output=True, timeout=timeout)
        if check and result.returncode:
            # Never emit argv, which may contain disposable credentials.
            message = result.stderr.strip() or result.stdout.strip()
            for value in private_values:
                message = message.replace(value, "[redacted]")
            raise RuntimeError(f"{args[0]} command failed: {message[-1500:]}")
        return result

    try:
        for binary in ("docker", "openssl"):
            if not shutil.which(binary):
                raise RuntimeError(f"{binary} is required")
        context = os.environ.get("DOCKER_CONTEXT")
        endpoint = (os.environ.get("DOCKER_HOST") if not context else None) or command(
            ["docker", "context", "inspect", *([context] if context else []), "--format", "{{.Endpoints.docker.Host}}"]
        ).stdout.strip()
        if not endpoint.startswith("unix://"):
            raise RuntimeError("Production smoke only supports a local Docker Unix socket")
        for relative in ("dist/index.cjs", "dist/public/index.html", "package-lock.json", "package.json", "docs"):
            if not (root / relative).exists():
                raise RuntimeError(f"Required build input missing: {relative}; run npm run build first")
        lock = json.loads((root / "package-lock.json").read_text())
        sharp_version = lock["packages"]["node_modules/sharp"]["version"]
        report["artifact_sha256"] = hashlib.sha256(bundle.read_bytes()).hexdigest()
        report["locked_sharp_version"] = sharp_version
        for image in ("postgres:16-alpine", "node:22-alpine"):
            if command(["docker", "image", "inspect", image], check=False).returncode:
                command(["docker", "pull", image], timeout=180)
        phase = "trusted TLS fixture"
        with tempfile.TemporaryDirectory(prefix=prefix + "-") as directory:
            temp = Path(directory)
            command(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1", "-subj", "/CN=Core Disposable Runtime CA", "-keyout", str(temp / "ca.key"), "-out", str(temp / "ca.crt")])
            command(["openssl", "req", "-newkey", "rsa:2048", "-nodes", "-subj", "/CN=localhost", "-keyout", str(temp / "server.key"), "-out", str(temp / "server.csr")])
            (temp / "extensions.cnf").write_text("subjectAltName=IP:127.0.0.1,DNS:localhost\nextendedKeyUsage=serverAuth\nkeyUsage=digitalSignature,keyEncipherment\n")
            command(["openssl", "x509", "-req", "-in", str(temp / "server.csr"), "-CA", str(temp / "ca.crt"), "-CAkey", str(temp / "ca.key"), "-CAcreateserial", "-days", "1", "-extfile", str(temp / "extensions.cnf"), "-out", str(temp / "server.crt")])
            command(["docker", "create", "--name", db_container, "-e", "POSTGRES_USER=runtime_smoke", "-e", f"POSTGRES_PASSWORD={password}", "-e", f"POSTGRES_DB={db_name}", "--entrypoint", "/bin/sh", "postgres:16-alpine", "-c", "chown postgres:postgres /tmp/server.key /tmp/server.crt && chmod 600 /tmp/server.key && exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/tmp/server.crt -c ssl_key_file=/tmp/server.key"])
            created.append(db_container)
            for name in ("server.key", "server.crt"):
                command(["docker", "cp", str(temp / name), f"{db_container}:/tmp/{name}"])
            command(["docker", "start", db_container])
            deadline = time.monotonic() + 30
            while command(["docker", "exec", db_container, "pg_isready", "-U", "runtime_smoke", "-d", db_name], check=False).returncode:
                if time.monotonic() >= deadline:
                    raise RuntimeError("Disposable PostgreSQL readiness deadline exceeded")
                time.sleep(0.25)

            # Explicit allowlist: no inherited provider, production, Railway, or .env values.
            env = {
                "DATABASE_URL": f"postgresql://runtime_smoke:{password}@127.0.0.1:5432/{db_name}?application_name=core-production-smoke",
                "DATABASE_TLS_MODE": "verify-full",
                "DATABASE_TLS_CA": (temp / "ca.crt").read_text(),
                "SESSION_SECRET": session_secret,
                "SETUP_TOKEN": setup_token,
                "SYSTEM_BACKUPS_ENABLED": "false",
                "SHUTDOWN_TIMEOUT_MS": "30000",
                "PORT": "5000",
                "APP_URL": "http://127.0.0.1:5000",
                "CLIENT_STACK_ID": "runtime-shutdown-smoke",
            }
            args = ["docker", "create", "--name", app_container, "--network", f"container:{db_container}", "--workdir", "/app", "--entrypoint", "/bin/sh"]
            for key, value in env.items():
                args += ["-e", f"{key}={value}"]
            args += ["node:22-alpine", "-c", "npm ci --omit=dev --no-audit --no-fund && exec env NODE_ENV=production node dist/index.cjs"]
            command(args)
            created.append(app_container)
            for name in ("package.json", "package-lock.json", "dist", "docs"):
                command(["docker", "cp", str(root / name), f"{app_container}:/app/{name}"], timeout=60)
            if bundle != root / "dist/index.cjs":
                command(["docker", "cp", str(bundle), f"{app_container}:/app/dist/index.cjs"], timeout=60)
            phase = "compiled production startup"
            command(["docker", "start", app_container])
            print("Starting compiled Linux runtime with isolated TLS PostgreSQL", flush=True)
            deadline = time.monotonic() + 180
            probe = """fetch('http://127.0.0.1:5000/api/health/ready', {signal: AbortSignal.timeout(2000)}).then(async r => {
              const body = await r.json();
              if (r.status !== 200 || body.status !== 'ready' || body.database !== 'connected') process.exit(1);
              console.log(JSON.stringify({status:r.status,body,node:process.version,
                pid1:require('fs').readFileSync('/proc/1/cmdline','utf8').split('\\0').filter(Boolean),
                sharp:require('sharp').versions.sharp,
                artifact_sha256:require('crypto').createHash('sha256').update(require('fs').readFileSync('dist/index.cjs')).digest('hex')}));
            }).catch(() => process.exit(1));"""
            while True:
                state = command(["docker", "inspect", "--format", "{{.State.Status}}", app_container]).stdout.strip()
                if state != "running":
                    raise RuntimeError(f"Compiled production runtime exited before readiness ({state})")
                try:
                    result = command(["docker", "exec", app_container, "node", "-e", probe], timeout=5, check=False)
                except subprocess.TimeoutExpired:
                    # A slow observation during dependency installation is not proof
                    # the app failed. Keep the same container and overall deadline.
                    result = None
                    report["readiness_probe_timeouts"] = report.get("readiness_probe_timeouts", 0) + 1
                if result is not None and result.returncode == 0:
                    report["ready"] = json.loads(result.stdout)
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError("Compiled production readiness deadline exceeded")
                time.sleep(0.5)
            if report["ready"]["pid1"] != ["node", "dist/index.cjs"]:
                raise RuntimeError("Production Node process is not PID1")
            if report["ready"]["artifact_sha256"] != report["artifact_sha256"]:
                raise RuntimeError("Build changed during fixture creation")
            if report["ready"]["sharp"] != sharp_version:
                raise RuntimeError("Runtime sharp differs from the lockfile")
            query = "SELECT json_build_object('all_tls',coalesce(bool_and(s.ssl),false),'connections',count(*),'versions',array_agg(DISTINCT s.version)) FROM pg_stat_ssl s JOIN pg_stat_activity a USING(pid) WHERE a.application_name='core-production-smoke';"
            report["database_tls"] = json.loads(command(["docker", "exec", db_container, "psql", "-U", "runtime_smoke", "-d", db_name, "-Atc", query]).stdout)
            if not report["database_tls"]["all_tls"] or report["database_tls"]["connections"] < 1:
                raise RuntimeError("Production database connection was not verified as TLS")
            phase = "SIGTERM drainage"
            started = time.monotonic()
            command(["docker", "kill", "--signal", "SIGTERM", app_container])
            report["exit_code"] = int(command(["docker", "wait", app_container], timeout=35).stdout.strip())
            report["shutdown_seconds"] = round(time.monotonic() - started, 3)
            log = command(["docker", "logs", app_container]).stdout
            events = [json.loads(line) for line in log.splitlines() if line.startswith("{") and '"Runtime shutdown"' in line]
            report["shutdown_events"] = [{"event": e.get("event"), "reason": e.get("reason")} for e in events]
            if report["exit_code"] != 0 or report["shutdown_events"] != [{"event": "draining", "reason": "SIGTERM"}, {"event": "drained", "reason": "SIGTERM"}]:
                raise RuntimeError("Production runtime did not gracefully drain after SIGTERM")
            report["status"] = "passed"
    except Exception as error:
        report["phase"] = phase
        message = str(error)
        for value in private_values:
            message = message.replace(value, "[redacted]")
        report["error"] = message
        if app_container in created:
            try:
                result = subprocess.run(["docker", "logs", "--tail", "15", app_container], text=True, capture_output=True, timeout=10)
                log = result.stdout + result.stderr
                for value in private_values:
                    log = log.replace(value, "[redacted]")
                report["runtime_log_tail"] = log[-5000:]
            except Exception:
                report["runtime_log_tail"] = "Unable to collect bounded runtime logs"
    finally:
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        signal.signal(signal.SIGINT, signal.SIG_IGN)
        cleanup = []
        for name in reversed(created):
            try:
                result = subprocess.run(["docker", "rm", "--force", "--volumes", name], text=True, capture_output=True, timeout=30)
                cleanup.append({"container": name, "removed": result.returncode == 0})
            except Exception:
                cleanup.append({"container": name, "removed": False})
        report["cleanup"] = cleanup
        if any(not item["removed"] for item in cleanup):
            report["status"] = "failed"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(report, indent=2), flush=True)
    return 0 if report["status"] == "passed" else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, help="Optional alternative compiled bundle for a negative-control run")
    parser.add_argument("--output", type=Path, required=True, help="JSON evidence output path")
    def interrupted(signum, _frame):
        raise RuntimeError(f"Production runtime smoke interrupted by signal {signum}")
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    args = parser.parse_args()
    sys.exit(verify(args.output.resolve(), args.bundle.resolve() if args.bundle else None))
