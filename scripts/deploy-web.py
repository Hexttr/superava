#!/usr/bin/env python3
"""Deploy Superava services to production over SSH using Paramiko.

Expected env:
- DEPLOY_HOST
- DEPLOY_USER
- DEPLOY_PASSWORD or DEPLOY_KEY_PATH
- DEPLOY_REPO_DIR (default: /opt/superava)
- DEPLOY_APP_USER (default: superava)
- DEPLOY_HEALTH_URL (default: http://127.0.0.1:4000/health)
- DEPLOY_READY_URL (default: http://127.0.0.1:4000/ready)
"""
import os
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

host = os.environ.get("DEPLOY_HOST", "212.108.83.176")
user = os.environ.get("DEPLOY_USER", "root")
password = os.environ.get("DEPLOY_PASSWORD")
key_path = os.environ.get("DEPLOY_KEY_PATH")
repo_dir = os.environ.get("DEPLOY_REPO_DIR", "/opt/superava")
app_user = os.environ.get("DEPLOY_APP_USER", "superava")
health_url = os.environ.get("DEPLOY_HEALTH_URL", "http://127.0.0.1:4000/health")
ready_url = os.environ.get("DEPLOY_READY_URL", "http://127.0.0.1:4000/ready")

if not password and not key_path:
    print(
        "Set DEPLOY_PASSWORD or DEPLOY_KEY_PATH (and optionally DEPLOY_HOST, DEPLOY_USER).",
        file=sys.stderr,
    )
    sys.exit(1)


def quote_single(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"


def app_shell(command: str) -> str:
    inner = f"cd {repo_dir} && set -a && source .env.production && set +a && {command}"
    return f"runuser -u {quote_single(app_user)} -- bash -lc {quote_single(inner)}"


def run(client: paramiko.SSHClient, command: str, label: str, *, timeout: int = 600) -> str:
    print(f"--- {label} ---")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    status = stdout.channel.recv_exit_status()
    print(out if out else "<no stdout>")
    if err:
        print("stderr:", err)
    print(f"exit: {status}")
    if status != 0:
        raise RuntimeError(f"{label} failed with exit code {status}")
    return out


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connect_kwargs = {
    "hostname": host,
    "username": user,
    "timeout": 20,
    "banner_timeout": 20,
    "auth_timeout": 20,
}
if key_path:
    connect_kwargs["key_filename"] = key_path
else:
    connect_kwargs["password"] = password

try:
    client.connect(**connect_kwargs)

    run(client, f"test -d {quote_single(repo_dir)}", "repo dir exists", timeout=20)
    dirty = run(
        client,
        app_shell("git status --porcelain"),
        "ensure remote worktree clean",
        timeout=30,
    )
    if dirty.strip():
        raise RuntimeError("Remote repository has uncommitted changes. Aborting deploy.")

    run(client, app_shell("git fetch origin main"), "fetch origin", timeout=120)
    run(
        client,
        app_shell("branch=$(git rev-parse --abbrev-ref HEAD) && test \"$branch\" = main"),
        "ensure main branch",
        timeout=30,
    )
    run(
        client,
        app_shell("git pull --ff-only origin main && git log -1 --oneline"),
        "fast-forward main",
        timeout=120,
    )
    run(client, app_shell("pnpm install --frozen-lockfile"), "install deps", timeout=1200)
    run(client, app_shell("pnpm --filter @superava/api db:deploy"), "run migrations", timeout=600)
    run(client, app_shell("pnpm build"), "build workspace", timeout=1800)

    for service in [
        "superava-api.service",
        "superava-worker.service",
        "superava-web.service",
    ]:
        run(client, f"systemctl restart {service}", f"restart {service}", timeout=120)
        run(client, f"systemctl is-active {service}", f"check {service}", timeout=30)

    run(client, f"curl -fsS {quote_single(health_url)}", "health check", timeout=30)
    run(client, f"curl -fsS {quote_single(ready_url)}", "ready check", timeout=30)
    print("--- deploy complete ---")
except Exception as exc:
    print(f"deploy failed: {exc}", file=sys.stderr)
    client.close()
    sys.exit(1)
finally:
    client.close()
