import sys
import time
import unittest
from pathlib import Path

from kisshogi.engine import EngineSession, probe_engine

ROOT = Path(__file__).resolve().parent
FAKE = ROOT / "fake_usi_engine.py"


def wait_for(predicate, timeout=10.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(0.05)
    raise AssertionError("timed out")


class EngineTest(unittest.TestCase):
    def make_session(self, options=None):
        session = EngineSession("black", Path(sys.executable), [str(FAKE)], options or {})
        session.start()
        wait_for(lambda: session.status()["state"] == "ready")
        self.addCleanup(session.stop)
        return session

    def test_probe_all_option_types(self):
        result = probe_engine(Path(sys.executable), [str(FAKE)])
        self.assertEqual(result["name"], "Fake USI")
        names = {o["name"]: o["type"] for o in result["options"]}
        self.assertEqual(names["Threads"], "spin")
        self.assertEqual(names["USI_Ponder"], "check")
        self.assertEqual(names["BookFile"], "combo")
        self.assertEqual(names["Clear Hash"], "button")

    def test_ready_go_and_info(self):
        session = self.make_session()
        session.go("position startpos", {"btime": 1000, "wtime": 1000, "byoyomi": 100})
        wait_for(lambda: any(e["type"] == "bestmove" for e in session.poll(0)["events"]))
        events = session.poll(0)["events"]
        infos = [e for e in events if e["type"] == "info"]
        self.assertTrue(infos)
        self.assertEqual(infos[0]["score"]["value"], 35)
        self.assertEqual([e for e in events if e["type"] == "bestmove"][-1]["move"], "7g7f")

    def test_options_are_applied_and_validated(self):
        session = self.make_session({"Threads": "4", "USI_Ponder": "true", "BookFile": "no_book", "Nope": "x"})
        status = session.status()
        self.assertEqual(status["appliedOptions"]["Threads"], "4")
        self.assertEqual(status["appliedOptions"]["USI_Ponder"], "true")
        self.assertIn("Nope", status["ignoredOptions"])
        with self.assertRaises(Exception):
            session.setoption("Threads", "999")
        self.assertEqual(session.setoption("Threads", "3")["value"], "3")

    def test_ponderhit(self):
        session = self.make_session({"USI_Ponder": "true"})
        session.go("position startpos", {"ponder": True, "btime": 1000, "wtime": 1000, "byoyomi": 100})
        wait_for(lambda: session.status()["state"] == "pondering")
        session.ponderhit()
        wait_for(lambda: session.status()["state"] == "ready")
        final = [e for e in session.poll(0)["events"] if e["type"] == "bestmove"][-1]
        self.assertEqual(final["move"], "7g7f")

    def test_stop_thinking(self):
        session = self.make_session()
        session.go("position startpos", {"infinite": True})
        wait_for(lambda: session.status()["state"] == "thinking")
        session.stop_thinking()
        wait_for(lambda: session.status()["state"] == "ready")
        self.assertTrue(any(e["type"] == "bestmove" for e in session.poll(0)["events"]))

    def test_missing_engine(self):
        session = EngineSession("black", Path("definitely-not-an-engine"), [], {})
        with self.assertRaises(Exception):
            session.start()
        self.assertEqual(session.status()["state"], "error")


if __name__ == "__main__":
    unittest.main()
