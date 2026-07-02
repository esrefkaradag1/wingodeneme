#!/usr/bin/env python3
import ftplib
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / ".vscode" / "sftp.json"

FILES_TO_UPLOAD = [
    "docker-compose.supabase.yml",
    ".env.production",
    "backend/package.json",
    "backend/package-lock.json",
    "backend/Dockerfile",
    "backend/dist",
    "backend/prisma",
    "frontend/package.json",
    "frontend/package-lock.json",
    "frontend/next.config.js",
    "frontend/public",
    "frontend/.next",
    "ai-service/package.json",
    "ai-service/package-lock.json",
    "ai-service/Dockerfile",
    "ai-service/dist",
]

SKIP_FILES = {".DS_Store"}


def load_cfg() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def ensure_remote_dir(ftp: ftplib.FTP, path: str) -> None:
    path = path.strip("/")
    if not path:
        return
    current = ""
    for part in path.split("/"):
        current = f"{current}/{part}" if current else part
        try:
            ftp.mkd(current)
        except ftplib.error_perm:
            pass


def upload_file(ftp: ftplib.FTP, local: Path, remote: str) -> None:
    ensure_remote_dir(ftp, str(Path(remote).parent).replace("\\", "/"))
    with local.open("rb") as f:
        ftp.storbinary(f"STOR {remote}", f)


def iter_files(path: Path):
    if path.is_file():
        yield path
        return
    for root, _, files in os.walk(path):
        for name in files:
            if name in SKIP_FILES:
                continue
            yield Path(root) / name


def main():
    cfg = load_cfg()
    remote_root = cfg.get("remotePath", "/").rstrip("/") or "/"

    ftp = ftplib.FTP()
    ftp.connect(cfg["host"], int(cfg.get("port", 21)), timeout=60)
    ftp.login(cfg["username"], cfg["password"])

    count = 0
    try:
        for item in FILES_TO_UPLOAD:
            src = ROOT / item
            if not src.exists():
                continue
            for f in iter_files(src):
                rel = f.relative_to(ROOT).as_posix()
                remote = f"{remote_root}/{rel}" if remote_root != "/" else f"/{rel}"
                upload_file(ftp, f, remote)
                count += 1
                print(f"Uploaded: {rel}")
    finally:
        ftp.quit()

    print(f"Done. Uploaded {count} files.")


if __name__ == "__main__":
    main()
