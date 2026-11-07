"""Local HTTP server, API and static assets."""

from __future__ import annotations

import json
import logging
import mimetypes
import secrets
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from . import __version__
from .config import save_config, validate_config
from .engine import EngineError, EngineManager, probe_engine
from .config import resolve_engine_path

log = logging.getLogger(__name__)
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("font/woff2", ".woff2")

MAX_BODY = 5 * 1024 * 1024


class Application:
    def __init__(
        self,
        config: dict[str, Any],
        config_path: Path,
        *,
        browser_ui: bool = True,
        heartbeat_enabled: bool = True,
    ) -> None:
        self.config = config
        self.config_path = config_path
        self.token = secrets.token_urlsafe(32)
        self.engines = EngineManager()
        self.browser_ui = browser_ui
        self.heartbeat_enabled = heartbeat_enabled
        self.server: ThreadingHTTPServer | None = None
        self._lock = threading.RLock()
        self._shutdown_timer: threading.Timer | None = None
        self._last_heartbeat = time.monotonic()
        self._shutting_down = False
        self.stop_event = threading.Event()
        self.native_ready = threading.Event()
        self.web_root = Path(str(__import__("importlib.resources", fromlist=["files"]).files("kisshogi").joinpath("web")))

    @property
    def port(self) -> int:
        if self.server is None:
            return 0
        return int(self.server.server_address[1])

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}/"

    def set_server(self, server: ThreadingHTTPServer) -> None:
        self.server = server

    # -- lifecycle -----------------------------------------------------
    def heartbeat(self) -> None:
        with self._lock:
            self._last_heartbeat = time.monotonic()
            timer = self._shutdown_timer
            self._shutdown_timer = None
        if timer:
            timer.cancel()

    def schedule_shutdown(self, delay: float = 5.0) -> None:
        with self._lock:
            if self._shutting_down:
                return
            if self._shutdown_timer:
                self._shutdown_timer.cancel()
            timer = threading.Timer(delay, self.request_quit)
            timer.daemon = True
            self._shutdown_timer = timer
        timer.start()

    def request_quit(self) -> None:
        with self._lock:
            if self._shutting_down:
                return
            self._shutting_down = True
            timer = self._shutdown_timer
            self._shutdown_timer = None
        self.stop_event.set()
        if timer:
            timer.cancel()
        self.engines.shutdown()
        server = self.server
        if server:
            threading.Thread(target=server.shutdown, daemon=True).start()

    def start_watchdog(self) -> None:
        if not self.heartbeat_enabled:
            return

        def watch() -> None:
            while True:
                time.sleep(5)
                with self._lock:
                    if self._shutting_down:
                        return
                    idle = time.monotonic() - self._last_heartbeat
                if idle > 120:
                    log.info("no page heartbeat for %.0fs; shutting down", idle)
                    self.request_quit()
                    return

        threading.Thread(target=watch, daemon=True, name="heartbeat-watchdog").start()

    # -- config --------------------------------------------------------
    def update_config(self, payload: Any) -> dict[str, Any]:
        cfg = validate_config(payload)
        save_config(self.config_path, cfg)
        with self._lock:
            self.config = cfg
        return cfg


class Handler(BaseHTTPRequestHandler):
    app: Application
    server_version = f"Kisshogi/{__version__}"
    protocol_version = "HTTP/1.1"

    # -- helpers -------------------------------------------------------
    def log_message(self, fmt: str, *args: Any) -> None:
        log.debug("%s - %s", self.address_string(), fmt % args)

    def _send(self, status: int, body: bytes, content_type: str, extra: dict[str, str] | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self' data:; "
            "style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; "
            "base-uri 'none'; frame-ancestors 'none'",
        )
        if extra:
            for key, value in extra.items():
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, payload: Any) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self._send(status, body, "application/json; charset=utf-8")

    def _error(self, status: int, code: str, message: str) -> None:
        self._json(status, {"error": {"code": code, "message": message}})

    def _read_body(self) -> bytes:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("invalid content length") from None
        if length < 0 or length > MAX_BODY:
            raise ValueError("request body too large")
        return self.rfile.read(length)

    def _json_body(self) -> Any:
        raw = self._read_body()
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def _host_ok(self) -> bool:
        host = self.headers.get("Host", "")
        port = self.app.port
        return host in {f"127.0.0.1:{port}", f"localhost:{port}"}

    def _origin_ok(self) -> bool:
        origin = self.headers.get("Origin")
        if not origin:
            return True
        host = self.headers.get("Host", "")
        return origin in {f"http://{host}", f"https://{host}"}

    def _security_ok(self) -> bool:
        if not self._host_ok() or not self._origin_ok():
            self._error(HTTPStatus.FORBIDDEN, "forbidden_origin", "invalid host or origin")
            return False
        return True

    def _token_ok(self, body: Any | None = None) -> bool:
        token = self.headers.get("X-Kisshogi-Token", "")
        if not token and isinstance(body, dict):
            token = str(body.get("token", ""))
        if not secrets.compare_digest(token, self.app.token):
            self._error(HTTPStatus.UNAUTHORIZED, "unauthorized", "missing or invalid token")
            return False
        return True

    # -- HTTP methods --------------------------------------------------
    def do_GET(self) -> None:  # noqa: N802
        if not self._security_ok():
            return
        parsed = urlparse(self.path)
        path = unquote(parsed.path)
        if path == "/api/health":
            self._json(HTTPStatus.OK, {"ok": True, "version": __version__})
            return
        if path.startswith("/api/"):
            if not self._token_ok():
                return
            if path == "/api/config":
                self._json(HTTPStatus.OK, self.app.config)
                return
            if path == "/api/engine/status":
                self._json(HTTPStatus.OK, self.app.engines.status_all())
                return
            if path == "/api/engine/events":
                query = parse_qs(parsed.query)
                role = (query.get("role") or [""])[0]
                try:
                    since = int((query.get("since") or ["0"])[0])
                except ValueError:
                    self._error(HTTPStatus.BAD_REQUEST, "bad_request", "invalid since")
                    return
                session = self.app.engines.get(role)
                if session is None:
                    self._error(HTTPStatus.NOT_FOUND, "engine_not_running", "engine is not running")
                    return
                self._json(HTTPStatus.OK, session.poll(since))
                return
            self._error(HTTPStatus.NOT_FOUND, "not_found", "unknown API endpoint")
            return

        # static files; "/" gets the token-injected shell
        if path in {"/", "/index.html"}:
            self.app.heartbeat()
            index = self.app.web_root / "index.html"
            try:
                text = index.read_text(encoding="utf-8")
            except OSError:
                self._error(HTTPStatus.INTERNAL_SERVER_ERROR, "no_index", "web assets are missing")
                return
            text = text.replace("__KISSHOGI_TOKEN__", self.app.token)
            self._send(HTTPStatus.OK, text.encode("utf-8"), "text/html; charset=utf-8")
            return
        target = (self.app.web_root / path.lstrip("/")).resolve()
        try:
            target.relative_to(self.app.web_root.resolve())
        except ValueError:
            self._error(HTTPStatus.NOT_FOUND, "not_found", "not found")
            return
        if not target.is_file():
            self._error(HTTPStatus.NOT_FOUND, "not_found", "not found")
            return
        try:
            body = target.read_bytes()
        except OSError:
            self._error(HTTPStatus.INTERNAL_SERVER_ERROR, "read_failed", "could not read asset")
            return
        content_type = mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json"}:
            content_type += "; charset=utf-8"
        self._send(HTTPStatus.OK, body, content_type)

    def do_PUT(self) -> None:  # noqa: N802
        if not self._security_ok():
            return
        parsed = urlparse(self.path)
        if parsed.path != "/api/config":
            self._error(HTTPStatus.NOT_FOUND, "not_found", "unknown API endpoint")
            return
        if not self._token_ok():
            return
        try:
            payload = self._json_body()
            cfg = self.app.update_config(payload)
        except (ValueError, json.JSONDecodeError) as exc:
            self._error(HTTPStatus.BAD_REQUEST, "invalid_config", str(exc))
            return
        except OSError as exc:
            self._error(HTTPStatus.INTERNAL_SERVER_ERROR, "config_write_failed", str(exc))
            return
        self._json(HTTPStatus.OK, cfg)

    def do_POST(self) -> None:  # noqa: N802
        if not self._security_ok():
            return
        parsed = urlparse(self.path)
        path = parsed.path
        try:
            body = self._json_body()
        except (ValueError, json.JSONDecodeError) as exc:
            self._error(HTTPStatus.BAD_REQUEST, "bad_request", str(exc))
            return
        if path in {"/api/heartbeat", "/api/pagehide", "/api/quit", "/api/native-ready"}:
            if not self._token_ok(body):
                return
            if path == "/api/native-ready":
                self.app.native_ready.set()
                self._json(HTTPStatus.OK, {"ok": True})
            elif path == "/api/heartbeat":
                self.app.heartbeat()
                self._json(HTTPStatus.OK, {"ok": True})
            elif path == "/api/pagehide":
                self.app.schedule_shutdown(5.0)
                self._json(HTTPStatus.OK, {"ok": True})
            else:
                self.app.request_quit()
                self._json(HTTPStatus.OK, {"ok": True})
            return
        if not path.startswith("/api/"):
            self._error(HTTPStatus.NOT_FOUND, "not_found", "unknown API endpoint")
            return
        if not self._token_ok(body):
            return
        try:
            result = self._handle_api(path, body)
        except (EngineError, ValueError) as exc:
            self._error(HTTPStatus.BAD_REQUEST, "engine_error", str(exc))
            return
        except Exception:  # noqa: BLE001
            log.exception("API failure: %s", path)
            self._error(HTTPStatus.INTERNAL_SERVER_ERROR, "internal_error", "internal server error")
            return
        if result is not None:
            self._json(HTTPStatus.OK, result)

    def _handle_api(self, path: str, body: dict[str, Any]) -> Any:
        from .config import resolve_engine_path

        if path == "/api/encode":
            text = body.get("text")
            encoding = body.get("encoding", "utf-8")
            if not isinstance(text, str):
                raise ValueError("text must be a string")
            if encoding not in {"utf-8", "shift_jis"}:
                raise ValueError("unsupported encoding")
            try:
                data = text.encode(encoding, errors="strict")
            except UnicodeEncodeError as exc:
                raise ValueError(f"text cannot be encoded as {encoding}: {exc}") from exc
            self._send(HTTPStatus.OK, data, "application/octet-stream")
            return None
        if path == "/api/engine/probe":
            engine_path = body.get("path")
            args = body.get("args") or []
            if not isinstance(engine_path, str) or not engine_path.strip():
                raise ValueError("engine path is required")
            if not isinstance(args, list) or not all(isinstance(a, str) for a in args):
                raise ValueError("args must be a string array")
            resolved = resolve_engine_path(engine_path, self.app.config_path)
            return probe_engine(resolved, args)
        if path == "/api/engine/start":
            role = body.get("role")
            engine_path = body.get("path")
            args = body.get("args") or []
            options = body.get("options") or {}
            if role not in {"black", "white", "analysis"}:
                raise ValueError("invalid role")
            if not isinstance(engine_path, str) or not engine_path.strip():
                raise ValueError("engine path is required")
            if not isinstance(options, dict):
                raise ValueError("options must be an object")
            clean_options = {}
            for key, value in options.items():
                if not isinstance(key, str) or not key:
                    raise ValueError("invalid option name")
                if isinstance(value, bool):
                    value = "true" if value else "false"
                if not isinstance(value, (str, int, float)):
                    raise ValueError("invalid option value")
                value = str(value)
                if "\n" in value or "\r" in value or len(value) > 4096:
                    raise ValueError("invalid option value")
                clean_options[key] = value
            resolved = resolve_engine_path(engine_path, self.app.config_path)
            return self.app.engines.start(role, resolved, args, clean_options)
        if path == "/api/engine/stop":
            role = body.get("role")
            if role not in {"black", "white", "analysis"}:
                raise ValueError("invalid role")
            session = self.app.engines.get(role)
            if session:
                session.stop()
            return {"ok": True}
        if path == "/api/engine/newgame":
            role = body.get("role")
            session = self.app.engines.get(role)
            if session:
                session.newgame()
            return {"ok": True}
        if path == "/api/engine/setoption":
            role = body.get("role")
            name = body.get("name")
            if not isinstance(name, str) or not name:
                raise ValueError("option name is required")
            value = body.get("value")
            if value is not None and not isinstance(value, str):
                value = str(value)
            return self.app.engines.require(role).setoption(name, value)
        if path == "/api/engine/go":
            role = body.get("role")
            position = body.get("position")
            if not isinstance(position, str) or not position.startswith("position "):
                raise ValueError("invalid position command")
            if "\n" in position or "\r" in position or len(position) > 10000:
                raise ValueError("invalid position command")
            options = {key: body.get(key) for key in
                       ("infinite", "ponder", "btime", "wtime", "byoyomi", "binc", "winc", "movetime", "depth")}
            options = {k: v for k, v in options.items() if v is not None}
            session = self.app.engines.require(role)
            if body.get("multipv") is not None:
                try:
                    session.setoption("MultiPV", str(int(body["multipv"])))
                except (EngineError, ValueError, TypeError):
                    pass
            if body.get("newGame"):
                session.newgame()
            session.go(position, options)
            return {"ok": True}
        if path == "/api/engine/ponderhit":
            session = self.app.engines.get(body.get("role"))
            if session:
                session.ponderhit()
            return {"ok": True}
        if path == "/api/engine/stop-thinking":
            session = self.app.engines.get(body.get("role"))
            if session:
                session.stop_thinking()
            return {"ok": True}
        raise ValueError("unknown API endpoint")

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._error(HTTPStatus.METHOD_NOT_ALLOWED, "method_not_allowed", "method not allowed")


def create_server(app: Application, host: str = "127.0.0.1", port: int = 0) -> ThreadingHTTPServer:
    handler = type("BoundHandler", (Handler,), {"app": app})
    server = ThreadingHTTPServer((host, port), handler)
    server.daemon_threads = True
    app.set_server(server)
    return server
