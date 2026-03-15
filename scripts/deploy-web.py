#!/usr/bin/env python3
"""Deploy web app to production: git sync, build, restart.
Usage: DEPLOY_PASSWORD=xxx python scripts/deploy-web.py
"""
import os
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

host = os.environ.get("DEPLOY_HOST", "212.108.83.176")
user = os.environ.get("DEPLOY_USER", "root")
password = os.environ.get("DEPLOY_PASSWORD", "Aqf3v%1Rk8")
if not password:
    print("Set DEPLOY_PASSWORD (and optionally DEPLOY_HOST, DEPLOY_USER)", file=sys.stderr)
    sys.exit(1)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(
    hostname=host,
    username=user,
    password=password,
    timeout=20,
    banner_timeout=20,
    auth_timeout=20,
)

cmds = [
    # Git sync as root; chown so superava can build
    ("git -C /opt/superava config --global --add safe.directory /opt/superava 2>/dev/null; cd /opt/superava && git fetch origin && git reset --hard origin/main && chown -R superava:superava /opt/superava && git log -1 --oneline", "git sync"),
    (
        "runuser -u superava -- bash -lc 'cd /opt/superava && set -a && source .env.production && set +a && pnpm --filter @superava/web build'",
        "web build",
    ),
    ("systemctl restart superava-web.service", "restart"),
]

for cmd, label in cmds:
    print(f"--- {label} ---")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    status = stdout.channel.recv_exit_status()
    print(out if out else "<no stdout>")
    if err:
        print("stderr:", err)
    print(f"exit: {status}")
    if status != 0:
        client.close()
        sys.exit(status)

print("--- status ---")
stdin, stdout, stderr = client.exec_command("systemctl status superava-web.service --no-pager", timeout=10)
print(stdout.read().decode("utf-8", errors="replace"))
client.close()
