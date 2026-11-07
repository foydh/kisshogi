#!/usr/bin/env python3
"""Smoke-test a built Kisshogi binary without opening a window."""

from __future__ import annotations

import argparse
import http.client
import json
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("binary", type=Path)
    parser.add_argument("--port", type=int, default=0)
    parser.add_argument("--startup-timeout", type=float, default=60.0)
    args = parser.parse_args()
    port = args.port or free_port()
    with tempfile.TemporaryDirectory() as tmp:
        config = Path(tmp) / "config.json"
        log_path = Path(tmp) / "process.log"
        with open(log_path, "w", encoding="utf-8") as log:
            proc = subprocess.Popen(
                [str(args.binary), "--no-browser", "--port", str(port), "--config", str(config)],
                stdout=log,
                stderr=subprocess.STDOUT,
                text=True,
            )
            try:
                deadline = time.monotonic() + args.startup_timeout
                last_error: Exception | None = None
                while time.monotonic() < deadline:
                    if proc.poll() is not None:
                        break
                    try:
                        conn = http.client.HTTPConnection("127.0.0.1", port, timeout=2)
                        conn.request("GET", "/api/health")
                        response = conn.getresponse()
                        payload = json.loads(response.read())
                        conn.close()
                        if response.status == 200 and payload.get("ok"):
                            break
                    except Exception as exc:  # noqa: BLE001
                        last_error = exc
                        time.sleep(0.2)
                else:
                    raise RuntimeError(f"health check timed out: {last_error}")
                if proc.poll() is not None:
                    raise RuntimeError(f"binary exited with code {proc.returncode}")
                conn = http.client.HTTPConnection("127.0.0.1", port, timeout=5)
                conn.request("GET", "/")
                response = conn.getresponse()
                body = response.read()
                conn.close()
                if response.status != 200 or b"kisshogi-token" not in body:
                    raise RuntimeError("index page smoke check failed")
                print(f"smoke ok: {args.binary} on port {port}")
                return 0
            except Exception:
                try:
                    proc.terminate()
                    proc.wait(timeout=5)
                except Exception:  # noqa: BLE001
                    proc.kill()
                try:
                    output = log_path.read_text(encoding="utf-8", errors="replace")
                except OSError:
                    output = ""
                print(f"smoke failed; binary output:\n{output}", file=sys.stderr)
                raise
            finally:
                try:
                    proc.terminate()
                    proc.wait(timeout=5)
                except Exception:  # noqa: BLE001
                    proc.kill()


if __name__ == "__main__":
    raise SystemExit(main())
