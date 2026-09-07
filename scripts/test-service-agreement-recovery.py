"""Restore synthetic agreement history into a second disposable PostgreSQL database."""

import hashlib
import json
import os
import pathlib
import subprocess
import tempfile
import time
import uuid

root = pathlib.Path(__file__).resolve().parent.parent
source = root
artifact = pathlib.Path(tempfile.mkdtemp(prefix="p1-agreement-populated-recovery-"))
os.chmod(artifact, 0o700)
source_paths = (
    list((source / "artifacts/api-server/src/dashboard").glob("service-agreement*.ts"))
    + list((source / "artifacts/api-server/src/dashboard").glob("agreement-review*.ts"))
    + list((source / "artifacts/api-server/migrations/dashboard").glob("*.sql"))
    + [
        source / "lib/db/src/dashboard/schema.ts",
        source / "artifacts/api-server/src/dashboard/database.ts",
        source / "artifacts/api-server/src/dashboard/migrate.ts",
        pathlib.Path(__file__).resolve(),
    ]
)
source_hashes = {
    str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
    for p in source_paths
}
revision = subprocess.check_output(
    ["git", "rev-parse", "HEAD"], cwd=root, text=True
).strip()
containers = []
password = str(uuid.uuid4())
started = time.monotonic()


def run(args, **kwargs):
    return subprocess.run(args, check=True, capture_output=True, **kwargs).stdout


def start(database):
    name = "p1-recovery-" + str(uuid.uuid4())[:8]
    run(
        [
            "docker",
            "run",
            "--detach",
            "--rm",
            "--name",
            name,
            "-e",
            "POSTGRES_DB=" + database,
            "-e",
            "POSTGRES_PASSWORD=" + password,
            "-p",
            "127.0.0.1::5432",
            "postgres:16-alpine",
        ]
    )
    containers.append(name)
    for _ in range(60):
        if (
            subprocess.run(
                [
                    "docker",
                    "exec",
                    name,
                    "pg_isready",
                    "-h",
                    "127.0.0.1",
                    "-U",
                    "postgres",
                ],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            ).returncode
            == 0
        ):
            break
        time.sleep(0.25)
    else:
        raise RuntimeError("Disposable PostgreSQL not ready")
    port = json.loads(run(["docker", "inspect", name]))[0]["NetworkSettings"]["Ports"][
        "5432/tcp"
    ][0]["HostPort"]
    return (name, f"postgresql://postgres:{password}@127.0.0.1:{port}/{database}")


def sql(name, db, q):
    return (
        run(
            [
                "docker",
                "exec",
                "-i",
                name,
                "psql",
                "-U",
                "postgres",
                "-d",
                db,
                "-At",
                "-v",
                "ON_ERROR_STOP=1",
            ],
            input=q.encode(),
        )
        .decode()
        .strip()
    )


def snapshot(name, db):
    tables = sql(
        name,
        db,
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;",
    ).splitlines()
    rows = {}
    for t in tables:
        assert t.replace("_", "").isalnum()
        rows[t] = json.loads(
            sql(
                name,
                db,
                f'''SELECT json_build_object('count',count(*),'hash',md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''))) FROM "{t}" t;''',
            )
        )
    constraints = sql(
        name,
        db,
        "SELECT json_agg(x ORDER BY x.table_name,x.name) FROM (SELECT conrelid::regclass::text AS table_name,conname AS name,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace) x;",
    )
    indexes = sql(
        name,
        db,
        "SELECT json_agg(x ORDER BY x.indexname) FROM (SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public') x;",
    )
    return {
        "tables": rows,
        "constraints": json.loads(constraints),
        "indexes": json.loads(indexes),
    }


def node(url, args):
    env = {
        k: v
        for k, v in os.environ.items()
        if not k.startswith(("MAILGUN_", "TWILIO_", "QBO_", "S3_"))
    }
    env.update(
        DASHBOARD_DATABASE_URL=url, RECOVERY_FIXTURE=str(artifact / "fixture.json")
    )
    result = run(
        ["node", "--import", "tsx"] + args, cwd=source / "artifacts/api-server", env=env
    )
    print(result.decode().strip(), flush=True)


try:
    src, url = start("recovery_source")
    node(url, ["src/dashboard/migrate.ts"])
    node(url, ["src/dashboard/service-agreement.recovery-fixture.ts", "seed"])
    before = snapshot(src, "recovery_source")
    dump = run(
        [
            "docker",
            "exec",
            src,
            "pg_dump",
            "-U",
            "postgres",
            "-d",
            "recovery_source",
            "--format=custom",
            "--no-owner",
            "--no-acl",
        ]
    )
    (artifact / "populated.dump").write_bytes(dump)
    dst, durl = start("recovery_target")
    run(
        [
            "docker",
            "exec",
            "-i",
            dst,
            "pg_restore",
            "-U",
            "postgres",
            "-d",
            "recovery_target",
            "--exit-on-error",
            "--no-owner",
            "--no-acl",
        ],
        input=dump,
    )
    after = snapshot(dst, "recovery_target")
    assert before == after, "Restored rows or constraints differ"
    node(durl, ["src/dashboard/migrate.ts"])
    assert snapshot(dst, "recovery_target") == before, (
        "Migration replay changed restored data"
    )
    node(durl, ["src/dashboard/service-agreement.recovery-fixture.ts", "verify"])
    assert snapshot(dst, "recovery_target") == before, (
        "Read/charge retries changed restored history"
    )
    report = {
        "baseCommit": revision,
        "testedFileHashes": source_hashes,
        "dumpSha256": hashlib.sha256(dump).hexdigest(),
        "dumpBytes": len(dump),
        "tableCount": len(before["tables"]),
        "agreementCounts": {
            t: before["tables"][t]["count"]
            for t in [
                "service_agreement",
                "fixed_charge_period",
                "agreement_charge",
                "agreement_charge_review_event",
                "billing_draft",
                "audit_event",
            ]
        },
        "allRowsAndConstraintsMatched": True,
        "migrationReplayUnchanged": True,
        "restoredChargeRetriesUnchanged": True,
        "elapsedSeconds": round(time.monotonic() - started, 2),
        "scope": "Synthetic PostgreSQL16 custom dump to second disposable PostgreSQL16; no live services, provider calls, files or application cutover.",
    }
    (artifact / "source-snapshot.json").write_text(json.dumps(before, indent=2))
    (artifact / "restored-snapshot.json").write_text(json.dumps(after, indent=2))
    (artifact / "report.json").write_text(json.dumps(report, indent=2))
    pathlib.Path("/tmp/p1-agreement-populated-recovery-path.txt").write_text(
        str(artifact)
    )
    print(json.dumps(report), flush=True)
finally:
    for name in containers:
        subprocess.run(
            ["docker", "rm", "-f", name],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    print("Removed disposable recovery containers", flush=True)
