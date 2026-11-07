"""Command line entry point and native/browser launcher."""

from __future__ import annotations

import argparse
import importlib.util
import logging
import os
import subprocess
import sys
import threading
import time
import webbrowser
from pathlib import Path

from . import __version__
from .config import default_config_path, load_config
from .server import Application, create_server

log = logging.getLogger(__name__)
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="kisshogi",
        description="Kisshogi - a small KISS shogi GUI",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--native", action="store_true", help="require the native pywebview window")
    group.add_argument("--browser", action="store_true", help="open the UI in the system browser")
    parser.add_argument("--no-browser", action="store_true", help="serve only; do not open a window or browser")
    parser.add_argument("--port", type=int, default=0, help="local port (0 = random)")
    parser.add_argument("--config", type=Path, default=None, help="config file path")
    parser.add_argument("--debug", action="store_true", help="verbose logging")
    parser.add_argument("--native-host", metavar="URL", default=None, help=argparse.SUPPRESS)
    return parser


def _run_native_host(url: str, debug: bool) -> int:
    """Child process entry point: run only the pywebview window."""
    import webview  # type: ignore[import-not-found]

    webview.create_window(
        "Kisshogi",
        url,
        width=1180,
        height=820,
        min_size=(860, 640),
        text_select=False,
    )
    webview.start(debug=debug)
    return 0


def _native_command(url: str) -> list[str]:
    if getattr(sys, "frozen", False):
        return [sys.executable, "--native-host", url]
    return [sys.executable, "-m", "kisshogi", "--native-host", url]


def _open_browser(url: str) -> None:
    try:
        webbrowser.open(url)
    except Exception:  # noqa: BLE001
        log.warning("could not open the system browser; open %s manually", url)


def _terminate(proc: subprocess.Popen | None) -> None:
    if proc is None:
        return
    try:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=2)
    except (OSError, subprocess.TimeoutExpired):
        pass


def _launch_native(url: str, debug: bool) -> subprocess.Popen:
    env = dict(os.environ)
    env["KISSHOGI_NATIVE_HOST"] = "1"
    kwargs = {}
    if os.name == "nt":
        kwargs["creationflags"] = CREATE_NO_WINDOW
    return subprocess.Popen(
        _native_command(url),
        env=env,
        **kwargs,
    )


def _native_failure_help() -> str:
    return (
        "Kisshogi could not start the native window.\n"
        "On Linux install PyGObject and WebKitGTK 4.1, then use a venv with "
        "--system-site-packages. On Windows install the WebView2 runtime.\n"
        "Use --browser to run in the system browser instead."
    )


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(levelname)s %(name)s: %(message)s",
    )
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:  # noqa: BLE001
        pass

    if args.native_host:
        try:
            return _run_native_host(args.native_host, args.debug)
        except Exception as exc:  # noqa: BLE001
            print(f"native window error: {exc}", file=sys.stderr, flush=True)
            return 3

    config_path = (args.config.expanduser() if args.config else default_config_path())
    config = load_config(config_path)
    native_available = importlib.util.find_spec("webview") is not None
    if args.native and not native_available:
        print(_native_failure_help(), file=sys.stderr, flush=True)
        return 2
    want_native = not args.browser and not args.no_browser and native_available
    app = Application(
        config,
        config_path,
        browser_ui=True,
        heartbeat_enabled=not args.no_browser,
    )
    server = create_server(app, port=args.port)
    app.start_watchdog()
    print(f"Kisshogi {__version__} - {app.url}", flush=True)

    serve_thread = threading.Thread(
        target=server.serve_forever,
        kwargs={"poll_interval": 0.2},
        daemon=True,
        name="kisshogi-http",
    )
    serve_thread.start()
    native_proc: subprocess.Popen | None = None
    native_used = False
    try:
        if args.no_browser:
            try:
                app.stop_event.wait()
            except KeyboardInterrupt:
                pass
        elif want_native:
            # Launch the GUI in a child process.  A broken WebKit backend can
            # hang inside webview.start(), so the parent enforces a readiness
            # timeout and can still fall back to the browser.
            try:
                native_proc = _launch_native(app.url, args.debug)
            except OSError as exc:
                log.error("could not launch native host: %s", exc)
                native_proc = None
            ready = app.native_ready.wait(15.0) if native_proc else False
            if ready and native_proc and native_proc.poll() is None:
                native_used = True
                while native_proc.poll() is None and not app.stop_event.is_set():
                    time.sleep(0.1)
                if app.stop_event.is_set():
                    _terminate(native_proc)
                else:
                    app.request_quit()
            else:
                _terminate(native_proc)
                native_proc = None
                if args.native:
                    print(_native_failure_help(), file=sys.stderr, flush=True)
                    return 2
                print("Native window unavailable; falling back to the system browser.", file=sys.stderr, flush=True)
        if not native_used and not args.no_browser:
            _open_browser(app.url)
            try:
                app.stop_event.wait()
            except KeyboardInterrupt:
                pass
    finally:
        _terminate(native_proc)
        app.request_quit()
        try:
            server.shutdown()
        except Exception:  # noqa: BLE001
            pass
        app.engines.shutdown()
        server.server_close()
        try:
            serve_thread.join(timeout=2)
        except Exception:  # noqa: BLE001
            pass
    return 0
