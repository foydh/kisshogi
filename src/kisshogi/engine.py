"""USI engine subprocess management.

The backend deliberately knows nothing about shogi.  It owns engine
processes, buffers their output, and exposes a small event API.
"""

from __future__ import annotations

import logging
import os
import queue
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any

from .usi import parse_bestmove, parse_id_name, parse_info, parse_option

log = logging.getLogger(__name__)
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

READY_STATES = {"ready"}
BUSY_STATES = {"starting", "thinking", "pondering", "stopping"}


class EngineError(RuntimeError):
    pass


def _validate_option_value(definition: dict[str, Any], value: str) -> str:
    kind = definition["type"]
    if kind == "check":
        normalized = value.strip().lower()
        if normalized not in {"true", "false"}:
            raise EngineError(f"option {definition['name']} expects true/false")
        return normalized
    if kind == "spin":
        try:
            number = int(value)
        except ValueError as exc:
            raise EngineError(f"option {definition['name']} expects an integer") from exc
        minimum = definition.get("min")
        maximum = definition.get("max")
        if minimum is not None and number < minimum:
            raise EngineError(f"option {definition['name']} is below minimum")
        if maximum is not None and number > maximum:
            raise EngineError(f"option {definition['name']} is above maximum")
        return str(number)
    if kind == "combo":
        variants = definition.get("vars") or []
        if variants and value not in variants:
            raise EngineError(f"option {definition['name']} has an invalid value")
        return value
    if kind in {"string", "filename"}:
        if "\n" in value or "\r" in value or len(value) > 4096:
            raise EngineError(f"option {definition['name']} has an invalid value")
        return value
    if kind == "button":
        return ""
    raise EngineError(f"unsupported option type: {kind}")


def _spawn(path: Path, args: list[str]) -> subprocess.Popen[str]:
    if not path.exists() or not path.is_file():
        raise EngineError(f"engine not found: {path}")
    if os.name != "nt" and not os.access(path, os.X_OK):
        raise EngineError(f"engine is not executable: {path}")
    command = [str(path), *args]
    kwargs: dict[str, Any] = {}
    if os.name == "nt":
        kwargs["creationflags"] = CREATE_NO_WINDOW
    try:
        return subprocess.Popen(
            command,
            cwd=str(path.parent),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            **kwargs,
        )
    except OSError as exc:
        raise EngineError(f"failed to launch engine: {exc}") from exc


def probe_engine(path: Path, args: list[str], timeout: float = 120.0) -> dict[str, Any]:
    """Launch an engine, read its options, verify isready, then quit."""
    proc = _spawn(path, args)
    lines: queue.Queue[str | None] = queue.Queue()

    def reader() -> None:
        assert proc.stdout is not None
        try:
            for line in proc.stdout:
                lines.put(line.rstrip("\r\n"))
        finally:
            lines.put(None)

    thread = threading.Thread(target=reader, daemon=True)
    thread.start()
    name = ""
    options: list[dict[str, Any]] = []
    try:
        assert proc.stdin is not None
        proc.stdin.write("usi\n")
        proc.stdin.flush()
        deadline = time.monotonic() + min(timeout, 30.0)
        got_usiok = False
        while time.monotonic() < deadline:
            try:
                line = lines.get(timeout=0.5)
            except queue.Empty:
                if proc.poll() is not None:
                    break
                continue
            if line is None:
                break
            if line.startswith("id name "):
                name = line[len("id name ") :]
            elif line.startswith("option "):
                parsed = parse_option(line)
                if parsed:
                    options.append(parsed)
            elif line == "usiok":
                got_usiok = True
                break
        if not got_usiok:
            raise EngineError("engine did not return usiok")
        proc.stdin.write("isready\n")
        proc.stdin.flush()
        deadline = time.monotonic() + timeout
        ready = False
        while time.monotonic() < deadline:
            try:
                line = lines.get(timeout=0.5)
            except queue.Empty:
                if proc.poll() is not None:
                    break
                continue
            if line is None:
                break
            if line == "readyok":
                ready = True
                break
        if not ready:
            raise EngineError("engine did not return readyok")
        return {"name": name or path.stem, "options": options}
    finally:
        try:
            if proc.poll() is None:
                assert proc.stdin is not None
                proc.stdin.write("quit\n")
                proc.stdin.flush()
                try:
                    proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    proc.terminate()
                    try:
                        proc.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        proc.kill()
        except (OSError, ValueError):
            pass
        finally:
            for stream in (proc.stdin, proc.stdout):
                try:
                    if stream:
                        stream.close()
                except (OSError, ValueError):
                    pass


class EngineSession:
    def __init__(
        self,
        role: str,
        path: Path,
        args: list[str] | None = None,
        options: dict[str, str] | None = None,
    ) -> None:
        self.role = role
        self.path = path
        self.args = list(args or [])
        self.saved_options = dict(options or {})
        self._lock = threading.RLock()
        self._proc: subprocess.Popen[str] | None = None
        self._reader: threading.Thread | None = None
        self._state = "stopped"
        self._name = ""
        self._options: list[dict[str, Any]] = []
        self._applied: dict[str, str] = {}
        self._ignored: list[str] = []
        self._error: str | None = None
        self._stderr_tail: list[str] = []
        self._events: list[dict[str, Any]] = []
        self._seq = 0
        self._stop_requested = False
        self._watchdog: threading.Timer | None = None

    # -- lifecycle -----------------------------------------------------
    def start(self) -> None:
        with self._lock:
            if self._state in BUSY_STATES or self._state == "ready":
                return
            self._state = "starting"
            self._error = None
            self._stderr_tail = []
            self._events = []
            self._seq = 0
            self._stop_requested = False
            self._name = ""
            self._options = []
            self._applied = {}
            self._ignored = []
        try:
            proc = _spawn(self.path, self.args)
        except EngineError as exc:
            with self._lock:
                self._state = "error"
                self._error = str(exc)
                self._append_event({"type": "error", "message": str(exc), "stderrTail": []})
            raise
        with self._lock:
            self._proc = proc
        self._reader = threading.Thread(target=self._reader_loop, daemon=True, name=f"usi-{self.role}")
        self._reader.start()
        self._send("usi")

    def stop(self) -> None:
        with self._lock:
            self._stop_requested = True
            proc = self._proc
            timer = self._watchdog
            self._watchdog = None
        if timer:
            timer.cancel()
        if proc is None:
            with self._lock:
                self._state = "stopped"
            return
        try:
            if proc.poll() is None:
                self._send("quit")
                try:
                    proc.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    proc.terminate()
                    try:
                        proc.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        proc.kill()
        except (OSError, ValueError):
            pass
        finally:
            if self._reader:
                self._reader.join(timeout=1)
            self._close_pipes()
            with self._lock:
                self._proc = None
                self._state = "stopped"

    def _close_pipes(self) -> None:
        proc = self._proc
        if proc is None:
            return
        for stream in (proc.stdin, proc.stdout):
            try:
                if stream:
                    stream.close()
            except (OSError, ValueError):
                pass

    # -- commands ------------------------------------------------------
    def newgame(self) -> None:
        self._require_ready()
        self._send("usinewgame")

    def setoption(self, name: str, value: str | None) -> dict[str, Any]:
        with self._lock:
            if self._state != "ready":
                raise EngineError("engine is not ready")
            definition = next((o for o in self._options if o["name"] == name), None)
            if definition is None:
                raise EngineError(f"unknown option: {name}")
            if definition["type"] == "button":
                self._send(f"setoption name {name}")
                return {"name": name, "value": None}
            normalized = _validate_option_value(definition, value or "")
            self._send(f"setoption name {name} value {normalized}")
            self._applied[name] = normalized
            return {"name": name, "value": normalized}

    def go(self, position: str, options: dict[str, Any]) -> None:
        with self._lock:
            if self._state != "ready":
                raise EngineError(f"engine is not ready ({self._state})")
            cmd = self._build_go(options)
            ponder = bool(options.get("ponder"))
            self._state = "pondering" if ponder else "thinking"
        self._send(position)
        self._send(cmd)
        if not options.get("infinite") and not options.get("ponder"):
            self._arm_watchdog(options)

    def ponderhit(self) -> None:
        with self._lock:
            if self._state != "pondering":
                raise EngineError("engine is not pondering")
            self._state = "thinking"
        self._send("ponderhit")

    def stop_thinking(self) -> None:
        with self._lock:
            if self._state not in {"thinking", "pondering", "stopping"}:
                return
            self._state = "stopping"
            timer = self._watchdog
            self._watchdog = None
        if timer:
            timer.cancel()
        self._send("stop")

    # -- state / events ------------------------------------------------
    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "role": self.role,
                "state": self._state,
                "name": self._name,
                "path": str(self.path),
                "busy": self._state in BUSY_STATES,
                "error": self._error,
                "options": list(self._options),
                "appliedOptions": dict(self._applied),
                "ignoredOptions": list(self._ignored),
            }

    def poll(self, since: int) -> dict[str, Any]:
        with self._lock:
            if since < 0:
                since = 0
            events = [e for e in self._events if e["seq"] > since]
            return {"cursor": self._seq, "events": events, "status": self.status()}

    def _append_event(self, event: dict[str, Any]) -> None:
        with self._lock:
            self._seq += 1
            event = dict(event)
            event["seq"] = self._seq
            self._events.append(event)
            if len(self._events) > 2000:
                del self._events[: len(self._events) - 2000]

    # -- internals -----------------------------------------------------
    def _send(self, command: str) -> None:
        with self._lock:
            proc = self._proc
        if proc is None or proc.stdin is None:
            raise EngineError("engine is not running")
        try:
            proc.stdin.write(command + "\n")
            proc.stdin.flush()
        except (OSError, ValueError) as exc:
            raise EngineError(f"failed to write to engine: {exc}") from exc

    def _reader_loop(self) -> None:
        proc = self._proc
        if proc is None or proc.stdout is None:
            return
        try:
            for raw in proc.stdout:
                line = raw.rstrip("\r\n")
                if line:
                    self._handle_line(line)
        finally:
            code = proc.poll()
            with self._lock:
                stopping = self._stop_requested or self._state == "stopped"
                if not stopping:
                    self._state = "error"
                    message = f"engine exited unexpectedly (code {code})"
                    self._error = message
                    self._append_event(
                        {"type": "error", "message": message, "stderrTail": list(self._stderr_tail[-50:])}
                    )
                else:
                    self._state = "stopped"

    def _handle_line(self, line: str) -> None:
        name = parse_id_name(line)
        if name:
            with self._lock:
                self._name = name
            return
        if line.startswith("option "):
            option = parse_option(line)
            if option:
                with self._lock:
                    self._options.append(option)
            return
        if line == "usiok":
            self._apply_options()
            self._send("isready")
            return
        if line == "readyok":
            with self._lock:
                if self._state == "starting":
                    self._state = "ready"
                self._append_event(
                    {
                        "type": "ready",
                        "name": self._name,
                        "options": list(self._options),
                        "appliedOptions": dict(self._applied),
                        "ignoredOptions": list(self._ignored),
                    }
                )
            return
        if line.startswith("bestmove"):
            best = parse_bestmove(line)
            if best:
                with self._lock:
                    if self._state in {"thinking", "pondering", "stopping"}:
                        self._state = "ready"
                    timer = self._watchdog
                    self._watchdog = None
                if timer:
                    timer.cancel()
                self._append_event(best)
            return
        if line.startswith("info"):
            info = parse_info(line)
            if info:
                if info.get("type") == "info":
                    self._append_event(info)
                return
            return
        # Non-protocol output is kept only as a small debug tail.
        with self._lock:
            self._stderr_tail.append(line)
            if len(self._stderr_tail) > 100:
                del self._stderr_tail[: len(self._stderr_tail) - 100]

    def _apply_options(self) -> None:
        with self._lock:
            definitions = {o["name"]: o for o in self._options}
            saved = dict(self.saved_options)
        applied: dict[str, str] = {}
        ignored: list[str] = []
        for name, value in saved.items():
            definition = definitions.get(name)
            if definition is None or definition["type"] == "button":
                ignored.append(name)
                continue
            try:
                normalized = _validate_option_value(definition, str(value))
            except EngineError:
                ignored.append(name)
                continue
            self._send(f"setoption name {name} value {normalized}")
            applied[name] = normalized
        with self._lock:
            self._applied = applied
            self._ignored = ignored

    def _require_ready(self) -> None:
        with self._lock:
            if self._state != "ready":
                raise EngineError(f"engine is not ready ({self._state})")

    def _build_go(self, options: dict[str, Any]) -> str:
        parts = ["go"]
        if options.get("ponder"):
            parts.append("ponder")
        if options.get("infinite"):
            parts.append("infinite")
        else:
            for key in ("btime", "wtime", "byoyomi", "binc", "winc", "movetime", "depth"):
                value = options.get(key)
                if value is None:
                    continue
                try:
                    number = int(value)
                except (TypeError, ValueError):
                    continue
                if number < 0:
                    continue
                parts.extend([key, str(number)])
        return " ".join(parts)

    def _arm_watchdog(self, options: dict[str, Any]) -> None:
        total = 0
        for key in ("btime", "wtime", "byoyomi", "movetime"):
            try:
                total = max(total, int(options.get(key) or 0))
            except (TypeError, ValueError):
                pass
        timeout = max(30.0, total / 1000.0 + 30.0)
        timer = threading.Timer(timeout, self._on_watchdog)
        timer.daemon = True
        with self._lock:
            self._watchdog = timer
        timer.start()

    def _on_watchdog(self) -> None:
        with self._lock:
            if self._state not in {"thinking", "stopping"}:
                return
            self._state = "error"
            self._error = "engine search timed out"
            self._append_event({"type": "error", "message": self._error, "stderrTail": list(self._stderr_tail[-50:])})
            proc = self._proc
        try:
            if proc and proc.poll() is None:
                proc.terminate()
        except OSError:
            pass


class EngineManager:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._sessions: dict[str, EngineSession] = {}

    def start(
        self,
        role: str,
        path: Path,
        args: list[str] | None = None,
        options: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        if role not in {"black", "white", "analysis"}:
            raise EngineError(f"invalid role: {role}")
        with self._lock:
            old = self._sessions.get(role)
        if old:
            old.stop()
        session = EngineSession(role, path, args, options)
        with self._lock:
            self._sessions[role] = session
        session.start()
        return session.status()

    def stop(self, role: str) -> None:
        with self._lock:
            session = self._sessions.pop(role, None)
        if session:
            session.stop()

    def get(self, role: str) -> EngineSession | None:
        with self._lock:
            return self._sessions.get(role)

    def require(self, role: str) -> EngineSession:
        session = self.get(role)
        if not session:
            raise EngineError(f"engine {role} is not running")
        return session

    def status_all(self) -> dict[str, Any]:
        with self._lock:
            sessions = dict(self._sessions)
        result: dict[str, Any] = {}
        for role in ("black", "white", "analysis"):
            session = sessions.get(role)
            if session:
                result[role] = session.status()
            else:
                result[role] = {
                    "role": role,
                    "state": "stopped",
                    "name": "",
                    "path": "",
                    "busy": False,
                    "error": None,
                    "options": [],
                    "appliedOptions": {},
                    "ignoredOptions": [],
                }
        return result

    def shutdown(self) -> None:
        with self._lock:
            sessions = list(self._sessions.values())
            self._sessions.clear()
        for session in sessions:
            try:
                session.stop()
            except Exception:  # noqa: BLE001 - shutdown must not fail
                log.exception("failed to stop engine")
