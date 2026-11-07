#!/usr/bin/env python3
"""Tiny USI test double used by the unit tests.

It is not a shogi engine and never returns a legal move in all positions; the
GUI tests use a separate JS fake.  The Python tests only exercise protocol
plumbing.
"""

from __future__ import annotations

import os
import sys
import time

BESTMOVE = os.environ.get("FAKE_BESTMOVE", "7g7f")
READY_DELAY = float(os.environ.get("FAKE_READY_DELAY", "0"))
PONDER = os.environ.get("FAKE_PONDER", "8c8d")
CRASH_ON_GO = os.environ.get("FAKE_CRASH", "") == "1"

OPTIONS = [
    "option name Threads type spin default 2 min 1 max 8",
    "option name USI_Hash type spin default 128 min 16 max 4096",
    "option name USI_Ponder type check default false",
    "option name MultiPV type spin default 1 min 1 max 8",
    "option name BookFile type combo default standard_book.db var no_book var standard_book.db",
    "option name Clear Hash type button",
    "option name EvalDir type string default <empty>",
]


def send(line: str) -> None:
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def info(depth: int = 10) -> None:
    send(
        f"info depth {depth} seldepth {depth + 2} multipv 1 "
        f"score cp 35 nodes 1234 nps 5678 time 100 pv {BESTMOVE} {PONDER}"
    )


def main() -> int:
    position = ""
    pondering = False
    thinking = False
    for raw in sys.stdin:
        line = raw.rstrip("\r\n")
        if not line:
            continue
        if line == "usi":
            send("id name Fake USI")
            send("id author Kisshogi tests")
            for option in OPTIONS:
                send(option)
            send("usiok")
        elif line == "isready":
            if READY_DELAY:
                time.sleep(READY_DELAY)
            send("readyok")
        elif line == "usinewgame":
            pass
        elif line.startswith("setoption "):
            pass
        elif line.startswith("position "):
            position = line
        elif line.startswith("go "):
            if CRASH_ON_GO:
                return 1
            pondering = " ponder" in f" {line} "
            thinking = True
            if not pondering:
                info(10)
                send(f"bestmove {BESTMOVE} ponder {PONDER}" if os.environ.get("FAKE_PONDER") else f"bestmove {BESTMOVE}")
                thinking = False
        elif line == "ponderhit":
            if pondering:
                pondering = False
                info(12)
                send(f"bestmove {BESTMOVE} ponder {PONDER}")
                thinking = False
        elif line == "stop":
            if thinking or pondering:
                info(8)
                send(f"bestmove {BESTMOVE}")
                thinking = False
                pondering = False
        elif line == "quit":
            return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
