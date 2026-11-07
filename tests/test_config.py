import json
import os
import tempfile
import unittest
from pathlib import Path

from kisshogi.config import DEFAULT_CONFIG, load_config, save_config, validate_config


class ConfigTest(unittest.TestCase):
    def test_defaults(self):
        cfg = validate_config({})
        self.assertEqual(cfg["timeControl"]["black"]["mainMs"], 300000)
        self.assertEqual(cfg["maxMoves"], 512)
        self.assertEqual(cfg["jishogiRule"], "general27")

    def test_rejects_byoyomi_plus_increment(self):
        with self.assertRaises(ValueError):
            validate_config({"timeControl": {"black": {"mainMs": 1, "byoyomiMs": 1, "incrementMs": 1}}})

    def test_accepts_per_side_modes(self):
        cfg = validate_config({
            "timeControl": {
                "black": {"mainMs": 60000, "byoyomiMs": 0, "incrementMs": 3000},
                "white": {"mainMs": 0, "byoyomiMs": 10000, "incrementMs": 0},
            }
        })
        self.assertEqual(cfg["timeControl"]["black"]["incrementMs"], 3000)
        self.assertEqual(cfg["timeControl"]["white"]["byoyomiMs"], 10000)

    def test_roundtrip_and_permissions(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "nested" / "config.json"
            save_config(path, validate_config({}))
            loaded = load_config(path)
            self.assertEqual(loaded["version"], 1)
            if os.name != "nt":
                # Windows only models the read-only bit, so POSIX modes are
                # not meaningful there.
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_corrupt_uses_defaults(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "config.json"
            path.write_text("{bad", encoding="utf-8")
            self.assertEqual(load_config(path)["maxMoves"], 512)

    def test_engine_options_preserved(self):
        cfg = validate_config({
            "engines": {
                "white": {"path": "engine", "options": {"USI_Ponder": "true", "Threads": "4"}}
            }
        })
        self.assertEqual(cfg["engines"]["white"]["options"]["USI_Ponder"], "true")
        self.assertEqual(cfg["engines"]["white"]["options"]["Threads"], "4")

    def test_unknown_keys_ignored(self):
        cfg = validate_config({"junk": 1})
        self.assertNotIn("junk", cfg)
        self.assertEqual(json.loads(json.dumps(cfg))["mode"], "analysis")

    def test_theme(self):
        self.assertEqual(validate_config({})["ui"]["theme"], "classic")
        self.assertEqual(validate_config({"ui": {"theme": "dark"}})["ui"]["theme"], "dark")
        self.assertEqual(validate_config({"ui": {"theme": "neon"}})["ui"]["theme"], "neon")
        self.assertEqual(
            validate_config({"ui": {"theme": "constructivist"}})["ui"]["theme"],
            "constructivist",
        )
        with self.assertRaises(ValueError):
            validate_config({"ui": {"theme": "vaporwave"}})


if __name__ == "__main__":
    unittest.main()
