#!/usr/bin/env python3
"""Check Superava deployment state on the server using Paramiko."""
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

if not password and not key_path:
    print(
        "Set DEPLOY_PASSWORD or DEPLOY_KEY_PATH (and optionally DEPLOY_HOST, DEPLOY_USER).",
        file=sys.stderr,
    )
    sys.exit(1)


def quote_single(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"


def app_shell(command: str) -> str:
    inner = f"cd {repo_dir} && {command}"
    return f"runuser -u {quote_single(app_user)} -- bash -lc {quote_single(inner)}"


def run(client: paramiko.SSHClient, command: str, label: str, *, timeout: int = 60) -> None:
    print(f"--- {label} ---")
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace").strip()
    err = stderr.read().decode("utf-8", errors="replace").strip()
    status = stdout.channel.recv_exit_status()
    print(out if out else "<no stdout>")
    if err:
        print("stderr:", err)
    print(f"exit: {status}")


client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connect_kwargs = {
    "hostname": host,
    "username": user,
    "timeout": 20,
}
if key_path:
    connect_kwargs["key_filename"] = key_path
else:
    connect_kwargs["password"] = password

try:
    client.connect(**connect_kwargs)

    commands = [
        ("git head", app_shell("git log -1 --oneline")),
        ("git status", app_shell("git status --short")),
        (
            "services",
            "systemctl is-active superava-api.service superava-worker.service superava-web.service",
        ),
        (
            "ready",
            "curl -fsS http://127.0.0.1:4000/ready",
        ),
    ]

    for label, command in commands:
        run(client, command, label)
finally:
    client.close()
