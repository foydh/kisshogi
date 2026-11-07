import http.client
import json
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path

from kisshogi.config import DEFAULT_CONFIG, validate_config
from kisshogi.server import Application, create_server

ROOT = Path(__file__).resolve().parent
FAKE = ROOT / "fake_usi_engine.py"


class ServerTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.config_path = Path(self.tmp.name) / "config.json"
        self.app = Application(
            validate_config(DEFAULT_CONFIG),
            self.config_path,
            browser_ui=True,
            heartbeat_enabled=False,
        )
        self.server = create_server(self.app, port=0)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self):
        self.app.request_quit()
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.tmp.cleanup()

    def request(self, method, path, body=None, token=True, headers=None):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        hdrs = dict(headers or {})
        if token:
            hdrs["X-Kisshogi-Token"] = self.app.token
        payload = None
        if body is not None:
            payload = json.dumps(body)
            hdrs["Content-Type"] = "application/json"
        conn.request(method, path, body=payload, headers=hdrs)
        response = conn.getresponse()
        data = response.read()
        status = response.status
        ctype = response.getheader("Content-Type")
        conn.close()
        return status, data, ctype

    def test_health_and_index(self):
        status, data, _ = self.request("GET", "/api/health", token=False)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)["ok"], True)
        status, data, _ = self.request("GET", "/", token=False)
        self.assertEqual(status, 200)
        self.assertIn(b"kisshogi-token", data)
        self.assertNotIn(b"__KISSHOGI_TOKEN__", data)

    def test_auth(self):
        status, _, _ = self.request("GET", "/api/config", token=False)
        self.assertEqual(status, 401)
        status, _, _ = self.request("GET", "/js/main.js", token=False)
        self.assertEqual(status, 200)

    def test_bad_host_and_origin(self):
        status, _, _ = self.request("GET", "/api/config", headers={"Host": "evil.example:80"})
        self.assertEqual(status, 403)
        status, _, _ = self.request(
            "GET", "/api/config", headers={"Origin": "https://evil.example"}
        )
        self.assertEqual(status, 403)

    def test_info(self):
        status, data, _ = self.request("GET", "/api/info")
        self.assertEqual(status, 200)
        payload = json.loads(data)
        self.assertTrue(payload["configPath"].endswith("config.json"))
        self.assertIn("version", payload)

    def test_config_put(self):
        cfg = validate_config(DEFAULT_CONFIG)
        cfg["maxMoves"] = 123
        status, data, _ = self.request("PUT", "/api/config", cfg)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)["maxMoves"], 123)
        status, data, _ = self.request("GET", "/api/config")
        self.assertEqual(json.loads(data)["maxMoves"], 123)

    def test_traversal(self):
        status, _, _ = self.request("GET", "/..%2fpyproject.toml")
        self.assertEqual(status, 404)

    def test_encode(self):
        status, data, ctype = self.request(
            "POST", "/api/encode", {"text": "▲７六歩", "encoding": "shift_jis"}
        )
        self.assertEqual(status, 200)
        self.assertEqual(ctype, "application/octet-stream")
        self.assertEqual(data, "▲７六歩".encode("shift_jis"))
        status, _, _ = self.request(
            "POST", "/api/encode", {"text": "😀", "encoding": "shift_jis"}
        )
        self.assertEqual(status, 400)

    def test_engine_probe_start_go(self):
        status, data, _ = self.request("POST", "/api/engine/probe", {
            "path": sys.executable, "args": [str(FAKE)]
        })
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(data)["name"], "Fake USI")
        status, data, _ = self.request("POST", "/api/engine/start", {
            "role": "black",
            "path": sys.executable,
            "args": [str(FAKE)],
            "options": {"Threads": "2"},
        })
        self.assertEqual(status, 200)
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            status, data, _ = self.request("GET", "/api/engine/status")
            if json.loads(data)["black"]["state"] == "ready":
                break
            time.sleep(0.05)
        self.assertEqual(json.loads(data)["black"]["state"], "ready")
        status, data, _ = self.request("POST", "/api/engine/go", {
            "role": "black", "position": "position startpos",
            "btime": 1000, "wtime": 1000, "byoyomi": 100,
        })
        self.assertEqual(status, 200)
        deadline = time.monotonic() + 10
        events = []
        while time.monotonic() < deadline:
            status, data, _ = self.request("GET", "/api/engine/events?role=black&since=0")
            payload = json.loads(data)
            events = payload["events"]
            if any(e["type"] == "bestmove" for e in events):
                break
            time.sleep(0.05)
        self.assertTrue(any(e["type"] == "bestmove" for e in events))
        status, _, _ = self.request("POST", "/api/engine/stop", {"role": "black"})
        self.assertEqual(status, 200)

    def test_heartbeat_cancels_pagehide(self):
        status, _, _ = self.request("POST", "/api/pagehide", {})
        self.assertEqual(status, 200)
        status, _, _ = self.request("POST", "/api/heartbeat", {})
        self.assertEqual(status, 200)
        time.sleep(0.2)
        status, _, _ = self.request("GET", "/api/health", token=False)
        self.assertEqual(status, 200)


if __name__ == "__main__":
    unittest.main()
