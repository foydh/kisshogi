#!/usr/bin/env python3
"""Playwright UI checks for Kisshogi.

This is a development tool, not a runtime dependency.  It starts the real
server with a temporary config and a deterministic fake USI engine, then drives
Chromium through the flows that unit tests cannot cover:

* position editor apply / inline validation errors
* entering-king declaration and jishogi adjudication dialogs
* engine option edit + restart with applied options
* batch games with ponder

Run from the repository root:

    PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" python scripts/ui_check.py

The fake engine needs an executable bit and a POSIX shebang, so these checks
target Linux/macOS.  Windows users can still run the Python and Node suites.
"""

from __future__ import annotations

import argparse
import http.client
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FAKE_ENGINE = ROOT / "tests" / "ui" / "fake_engine.py"
STANDARD_BOARD = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL"
DECLARE_SFEN = "4K4/L1SS1GGBR/1N5PP/9/9/9/9/9/4k4 b RB 1"
IMPASSE_SFEN = "4K4/L1SS1GGBR/1N5PP/9/9/9/9/4k4/9 b RB 1"
INVALID_SFEN = "4K4/9/9/9/9/9/9/9/4k4 b 3R 1"
CHECKS = []


def check(fn):
    CHECKS.append(fn)
    return fn


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


class AppServer:
    def __init__(self, config: dict) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="kisshogi-ui-")
        self.dir = Path(self.temp.name)
        self.config_path = self.dir / "config.json"
        self.engine_log = self.dir / "engine.log"
        self.server_log_path = self.dir / "server.log"
        self.config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        self.engine_log.write_text("", encoding="utf-8")
        self.port = free_port()
        env = os.environ.copy()
        env["PYTHONPATH"] = str(ROOT / "src")
        env["KISSHOGI_FAKE_LOG"] = str(self.engine_log)
        self._server_log = open(self.server_log_path, "w", encoding="utf-8")
        self.proc = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "kisshogi",
                "--no-browser",
                "--port",
                str(self.port),
                "--config",
                str(self.config_path),
            ],
            cwd=str(ROOT),
            env=env,
            stdout=self._server_log,
            stderr=subprocess.STDOUT,
            text=True,
        )
        self._wait_health()

    @property
    def url(self) -> str:
        return f"http://127.0.0.1:{self.port}/"

    def _wait_health(self) -> None:
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            if self.proc.poll() is not None:
                raise RuntimeError(f"server exited early:\n{self.server_log()}")
            try:
                conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=1)
                conn.request("GET", "/api/health")
                response = conn.getresponse()
                response.read()
                conn.close()
                if response.status == 200:
                    return
            except OSError:
                pass
            time.sleep(0.1)
        raise RuntimeError(f"server did not become healthy:\n{self.server_log()}")

    def server_log(self) -> str:
        try:
            return self.server_log_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return ""

    def engine_traffic(self) -> str:
        try:
            return self.engine_log.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return ""

    def config(self) -> dict:
        return json.loads(self.config_path.read_text(encoding="utf-8"))

    def stop(self) -> None:
        self.proc.terminate()
        try:
            self.proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self.proc.kill()
            self.proc.wait(timeout=5)
        self._server_log.close()
        self.temp.cleanup()

    def __enter__(self):
        return self

    def __exit__(self, *exc) -> None:
        self.stop()


class PageSession:
    def __init__(self, browser, server: AppServer) -> None:
        self.context = browser.new_context()
        self.page = self.context.new_page()
        self.errors: list[str] = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.goto(server.url + "?debug", wait_until="domcontentloaded")
        self.page.wait_for_selector("#board button[data-square]", timeout=15000)

    def close(self) -> None:
        self.context.close()


def wait_config(server: AppServer, predicate, timeout: float = 10.0) -> dict:
    deadline = time.monotonic() + timeout
    last: dict = {}
    while time.monotonic() < deadline:
        try:
            last = server.config()
        except (OSError, json.JSONDecodeError):
            last = {}
        if last and predicate(last):
            return last
        time.sleep(0.1)
    raise AssertionError(f"config did not reach the expected state; last={last}")


def apply_position(page, sfen: str) -> None:
    board = sfen.split()[0]
    page.click("#editPositionBtn")
    page.fill("#editorSfen", sfen)
    page.click("#editorLoadSfen")
    page.click("#editorApply")
    page.wait_for_function(
        "(expected) => window.__kisshogiDebug?.game.position.sfen.split(' ')[0] === expected",
        arg=board,
        timeout=10000,
    )


def base_config(**overrides) -> dict:
    config = {
        "language": "en",
        "mode": "pvp",
        "timeControl": {
            "black": {"mainMs": 300000, "byoyomiMs": 10000, "incrementMs": 0},
            "white": {"mainMs": 300000, "byoyomiMs": 10000, "incrementMs": 0},
        },
        "engines": {
            "black": {"path": "", "options": {}},
            "white": {"path": "", "options": {}},
            "analysis": {"path": "", "options": {}},
        },
    }
    config.update(overrides)
    return config


def assert_clean(session: PageSession) -> None:
    if session.errors:
        raise AssertionError(f"page errors: {session.errors}")


def no_page_scroll(page) -> None:
    metrics = page.evaluate(
        "({scroll: document.documentElement.scrollHeight, inner: window.innerHeight})"
    )
    assert metrics["scroll"] <= metrics["inner"] + 1, metrics


def layout_metrics(page) -> dict:
    return page.evaluate(
        """() => {
            const board = document.querySelector('#board').getBoundingClientRect();
            const hands = document.querySelector('#handStack').getBoundingClientRect();
            return {
                board: {x: board.x, y: board.y, width: board.width, height: board.height},
                hands: {x: hands.x, y: hands.y, width: hands.width, height: hands.height},
                inner: window.innerHeight,
            };
        }"""
    )


@check
def check_initial_board(browser) -> None:
    with AppServer(base_config()) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            assert page.locator("#board button[data-square]").count() == 81
            page.click("#newGameBtn")
            assert page.evaluate("window.__kisshogiDebug.game.length") == 0

            for width, height in ((1280, 800), (1366, 768), (1600, 900)):
                page.set_viewport_size({"width": width, "height": height})
                page.wait_for_timeout(120)
                no_page_scroll(page)
                metrics = layout_metrics(page)
                assert metrics["board"]["y"] + metrics["board"]["height"] <= metrics["inner"] + 1, metrics
                assert metrics["hands"]["x"] >= metrics["board"]["x"] + metrics["board"]["width"] - 1, metrics

            clip = page.evaluate("getComputedStyle(document.querySelector('.piece')).clipPath")
            assert clip.count(",") == 4, clip  # five vertices, not a hexagon
            assert_clean(session)
        finally:
            session.close()


@check
def check_editor_apply_and_validation(browser) -> None:
    with AppServer(base_config()) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            apply_position(page, DECLARE_SFEN)
            assert page.locator("#editorToolbar.hidden").count() == 1
            assert page.locator("#moveList li").count() == 0
            assert page.evaluate("window.__kisshogiDebug.game.length") == 0

            # An invalid position must not replace the game and must explain
            # itself inline inside the editor.
            page.click("#editPositionBtn")
            page.fill("#editorSfen", INVALID_SFEN)
            page.click("#editorLoadSfen")
            page.click("#editorApply")
            page.wait_for_selector("#editorError:not(.hidden)", timeout=5000)
            message = page.text_content("#editorError") or ""
            assert "Too many pieces" in message, message
            board = page.evaluate("window.__kisshogiDebug.game.position.sfen.split(' ')[0]")
            assert board == DECLARE_SFEN.split()[0], board

            # Loading a valid position clears the message again.
            page.fill("#editorSfen", STANDARD_BOARD + " b - 1")
            page.click("#editorLoadSfen")
            assert page.locator("#editorError.hidden").count() == 1
            page.click("#editorCancel")
            assert_clean(session)
        finally:
            session.close()


@check
def check_jishogi_declaration(browser) -> None:
    with AppServer(base_config()) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            page.select_option("#jishogiSelect", "general27")
            apply_position(page, DECLARE_SFEN)
            page.click("#declareBtn")
            page.wait_for_selector(".modal .modal-actions button.primary", timeout=5000)
            page.click(".modal .modal-actions button.primary")
            page.wait_for_function(
                "() => window.__kisshogiDebug?.game.result?.type === 'declaration'",
                timeout=5000,
            )
            result = page.evaluate("window.__kisshogiDebug.game.result")
            assert result["winner"] == "black", result
            text = page.text_content("#resultText") or ""
            assert "wins by declaration" in text, text
            assert page.evaluate("window.__kisshogiDebug.game.isLatest") is True
            assert_clean(session)
        finally:
            session.close()


@check
def check_jishogi_impasse(browser) -> None:
    with AppServer(base_config()) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            page.select_option("#jishogiSelect", "general24")
            apply_position(page, IMPASSE_SFEN)
            page.click("#impasseBtn")
            page.wait_for_selector(".modal .modal-actions button.primary", timeout=5000)
            page.click(".modal .modal-actions button.primary")
            page.wait_for_function(
                "() => window.__kisshogiDebug?.game.result?.type === 'impasse-draw'",
                timeout=5000,
            )
            text = page.text_content("#resultText") or ""
            assert "Jishogi draw" in text, text
            assert_clean(session)
        finally:
            session.close()


@check
def check_pause_theme_and_config_path(browser) -> None:
    from playwright.sync_api import expect

    with AppServer(base_config()) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            page.set_viewport_size({"width": 1280, "height": 800})
            page.click("#newGameBtn")
            page.wait_for_function("() => window.__kisshogiDebug.game.clock.running === true", timeout=5000)
            page.click("#pauseBtn")
            page.wait_for_function("() => window.__kisshogiDebug.game.paused === true", timeout=5000)
            assert "Game paused" in (page.text_content("#statusText") or "")
            assert page.evaluate("window.__kisshogiDebug.game.clock.running") is False
            page.wait_for_timeout(700)
            assert page.evaluate("window.__kisshogiDebug.game.clock.running") is False
            assert page.text_content("#pauseBtn") == "Resume game"

            page.click("#pauseBtn")
            page.wait_for_function("() => window.__kisshogiDebug.game.paused === false", timeout=5000)
            assert page.evaluate("window.__kisshogiDebug.game.clock.running") is True
            assert page.text_content("#pauseBtn") == "Pause game"

            page.click('.tab[data-tab="settings"]')
            config_path = page.text_content("#configPath") or ""
            assert config_path.endswith("config.json"), config_path
            expect(page.locator("#themeSelect")).to_have_value("classic")
            page.select_option("#themeSelect", "dark")
            page.wait_for_function("() => document.body.dataset.theme === 'dark'", timeout=5000)
            wait_config(server, lambda cfg: cfg.get("ui", {}).get("theme") == "dark")
            page.select_option("#themeSelect", "green")
            page.wait_for_function("() => document.body.dataset.theme === 'green'", timeout=5000)

            page.select_option("#languageSelect", "zh-CN")
            page.wait_for_function("() => document.documentElement.lang === 'zh-CN'", timeout=10000)
            assert "读秒" in (page.text_content("#clock-black-sub") or "")
            assert_clean(session)
        finally:
            session.close()


@check
def check_analysis_panel(browser) -> None:
    from playwright.sync_api import expect

    config = base_config()
    config["engines"]["analysis"] = {"path": str(FAKE_ENGINE), "options": {}}
    with AppServer(config) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            page.set_viewport_size({"width": 1280, "height": 800})
            page.click('.tab[data-tab="analysis"]')
            page.click("#analysisToggle")
            expect(page.locator(".analysis-line")).to_have_count(3, timeout=20000)
            assert page.text_content("#analysisToggle") == "Stop"
            assert page.locator(".mini-board .best-from").count() == 1
            assert page.locator(".mini-board .best-to").count() == 1
            assert "d12" in (page.text_content("#analysisBest") or "")

            page.click("#analysisToggle")
            expect(page.locator("#analysisStatus")).to_have_text("Stopped", timeout=5000)
            expect(page.locator(".analysis-line")).to_have_count(3)
            assert page.text_content("#analysisToggle") == "Analyze"
            assert page.locator("#analysisPlayBtn").is_enabled()

            page.click("#analysisPlayBtn")
            page.wait_for_function("() => window.__kisshogiDebug.game.length === 1", timeout=5000)
            assert page.evaluate("window.__kisshogiDebug.game.lastMove.usi") == "7g7f"
            assert_clean(session)
        finally:
            session.close()


@check
def check_engine_options_restart(browser) -> None:
    from playwright.sync_api import expect

    with AppServer(base_config()) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            page.click('.tab[data-tab="settings"]')
            card = page.locator('.engine-card[data-role="black"]')
            card.locator(".engine-path").fill(str(FAKE_ENGINE))
            card.locator(".engine-path").dispatch_event("change")
            card.locator(".engine-probe").click()
            expect(card.locator(".engine-status")).to_contain_text("Fake UI USI", timeout=15000)
            expect(card.locator(".option-row")).to_have_count(5)

            threads = card.locator(".option-row", has_text="Threads").locator('input[type="number"]')
            threads.fill("4")
            threads.dispatch_event("change")

            wait_config(
                server,
                lambda cfg: cfg["engines"]["black"]["options"].get("Threads") == "4",
            )

            card.locator(".engine-restart").click()
            expect(card.locator(".engine-state")).to_have_text("Ready", timeout=30000)
            expect(card.locator(".option-row", has_text="Threads").locator('input[type="number"]')).to_have_value("4")

            status = page.evaluate(
                """async () => {
                    const token = document.querySelector('meta[name="kisshogi-token"]').content;
                    const response = await fetch('/api/engine/status', {
                        headers: {'X-Kisshogi-Token': token},
                    });
                    return response.json();
                }"""
            )
            assert status["black"]["state"] == "ready", status
            assert status["black"]["appliedOptions"].get("Threads") == "4", status
            traffic = server.engine_traffic()
            assert "setoption name Threads value 4" in traffic, traffic
            assert_clean(session)
        finally:
            session.close()


@check
def check_batch_ponder(browser) -> None:
    from playwright.sync_api import expect

    config = base_config(mode="eve", maxMoves=6)
    for role in ("black", "white"):
        config["engines"][role] = {"path": str(FAKE_ENGINE), "options": {"USI_Ponder": "true"}}
    config["batch"] = {"games": 1, "swapColors": False, "startSfens": []}
    with AppServer(config) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            page.locator("details.group", has_text="Batch games").evaluate("el => el.open = true")
            page.click("#batchStart")
            expect(page.locator("#batchResults tbody tr")).to_have_count(1, timeout=60000)
            row = page.text_content("#batchResults tbody tr") or ""
            assert "maximum moves" in row, row
            traffic = server.engine_traffic()
            assert "go ponder" in traffic, traffic
            assert "ponderhit" in traffic, traffic
            assert traffic.count("go ponder") >= 2, traffic
            assert_clean(session)
        finally:
            session.close()


@check
def check_quit_keeps_page_calm(browser) -> None:
    with AppServer(base_config()) as server:
        session = PageSession(browser, server)
        page = session.page
        try:
            page.click("#quitButton")
            page.wait_for_selector("#stoppedOverlay", timeout=5000)
            # The heartbeat keeps firing after shutdown; it must not turn into
            # a "server is not responding" error toast.
            page.wait_for_timeout(6500)
            toast = page.text_content("#toast") or ""
            assert "not responding" not in toast, toast
            assert page.locator("#stoppedOverlay").count() == 1
            server.proc.wait(timeout=5)
            assert_clean(session)
        finally:
            session.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--headed", action="store_true", help="show the browser window")
    parser.add_argument("--only", action="append", default=[], help="run only checks containing this text")
    args = parser.parse_args()

    if not FAKE_ENGINE.exists():
        print(f"missing fake engine: {FAKE_ENGINE}", file=sys.stderr)
        return 2
    if "PLAYWRIGHT_BROWSERS_PATH" not in os.environ:
        candidate = ROOT / ".playwright-browsers"
        if candidate.is_dir():
            os.environ["PLAYWRIGHT_BROWSERS_PATH"] = str(candidate)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright is not installed; skip the browser checks.", file=sys.stderr)
        return 2

    selected = [fn for fn in CHECKS if not args.only or any(n in fn.__name__ for n in args.only)]
    failures = 0
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headed)
        try:
            for fn in selected:
                started = time.monotonic()
                try:
                    fn(browser)
                except Exception:
                    failures += 1
                    print(f"FAIL {fn.__name__} ({time.monotonic() - started:.1f}s)")
                    traceback.print_exc()
                else:
                    print(f"ok   {fn.__name__} ({time.monotonic() - started:.1f}s)")
        finally:
            browser.close()

    if failures:
        print(f"\n{failures} UI check(s) failed")
        return 1
    print(f"\n{len(selected)} UI checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
