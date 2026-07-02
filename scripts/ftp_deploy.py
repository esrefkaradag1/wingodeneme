#!/usr/bin/env python3
import ftplib
import json
import os
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent.parent
SFTP_CONFIG = ROOT / ".vscode" / "sftp.json"

INCLUDE_PATHS = [
    "docker-compose.supabase.yml",
    ".env.production",
    "backend",
    "frontend",
    "ai-service",
]

EXCLUDE_DIRS = {
    ".git",
    ".next",
    "node_modules",
    "dist",
    "release",
    ".vscode",
    ".cursor",
}

EXCLUDE_FILES = {
    ".DS_Store",
    ".env",
    ".env.local",
    ".env.development",
    ".env.test",
}


def load_config() -> dict:
    with SFTP_CONFIG.open("r", encoding="utf-8") as f:
        return json.load(f)


def iter_files(base: Path) -> Iterable[Path]:
    if base.is_file():
        yield base
        return

    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for filename in files:
            if filename in EXCLUDE_FILES:
                continue
            path = Path(root) / filename
            yield path


def ensure_remote_dir(ftp: ftplib.FTP, remote_dir: str) -> None:
    remote_dir = remote_dir.strip("/")
    if not remote_dir:
        return

    current = ""
    for part in remote_dir.split("/"):
        current = f"{current}/{part}" if current else part
        try:
            ftp.mkd(current)
        except ftplib.error_perm as e:
            if not str(e).startswith("550"):
                raise


def upload_file(ftp: ftplib.FTP, local_file: Path, remote_file: str) -> None:
    parent = str(Path(remote_file).parent).replace("\\", "/")
    ensure_remote_dir(ftp, parent)
    with local_file.open("rb") as f:
        ftp.storbinary(f"STOR {remote_file}", f)


def main() -> None:
    cfg = load_config()
    host = cfg["host"]
    port = int(cfg.get("port", 21))
    username = cfg["username"]
    password = cfg["password"]
    remote_root = cfg.get("remotePath", "/").rstrip("/") or "/"

    ftp = ftplib.FTP()
    ftp.connect(host=host, port=port, timeout=60)
    ftp.login(user=username, passwd=password)

    uploaded = 0
    try:
        for include in INCLUDE_PATHS:
            src = ROOT / include
            if not src.exists():
                continue

            for local_file in iter_files(src):
                rel_path = local_file.relative_to(ROOT).as_posix()
                remote_path = f"{remote_root}/{rel_path}" if remote_root != "/" else f"/{rel_path}"
                upload_file(ftp, local_file, remote_path)
                uploaded += 1
                print(f"Uploaded: {rel_path}")
    finally:
        ftp.quit()

    print(f"\nDone. Uploaded {uploaded} files.")


if __name__ == "__main__":
    main()
