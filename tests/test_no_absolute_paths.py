import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEXT_SUFFIXES = {".py", ".js", ".mjs", ".html", ".css", ".json", ".md", ".toml", ".yml", ".yaml", ".sh", ".txt", ".spec", ".in"}
SKIP_PARTS = {".venv", ".git", "node_modules", ".playwright-browsers", "dist", "build", "__pycache__", ".mypy_cache"}
PATTERNS = [
    re.compile(r"/home/[A-Za-z0-9_.-]+/"),
    re.compile(r"/Users/[A-Za-z0-9_.-]+/"),
    re.compile(r"[A-Za-z]:[\\/]Users[\\/]"),
]


class NoAbsolutePathsTest(unittest.TestCase):
    def test_no_user_absolute_paths_in_sources(self):
        bad = []
        for path in ROOT.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
                continue
            if any(part in SKIP_PARTS for part in path.parts):
                continue
            if path.name == "test_no_absolute_paths.py":
                continue
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            for pattern in PATTERNS:
                for match in pattern.finditer(text):
                    line = text.count("\n", 0, match.start()) + 1
                    bad.append(f"{path.relative_to(ROOT)}:{line}: {match.group(0)}")
        self.assertEqual(bad, [], "absolute paths found:\n" + "\n".join(bad))


if __name__ == "__main__":
    unittest.main()
