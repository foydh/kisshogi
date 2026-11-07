#!/usr/bin/env python3
"""Deterministic USI engine double used by the Playwright UI checks.

It follows a fixed, legal opening line so a batch game can be driven without a
real engine.  Protocol traffic can be written to KISSHOGI_FAKE_LOG so a test can
assert that ponder was really used.  It is a test fixture, not a shogi engine.
"""

from __future__ import annotations

import os
import sys
import time

BLACK_MOVES = ["7g7f", "2g2f", "2f2e", "3i3h", "4i4h", "5i5h"]
WHITE_MOVES = ["3c3d", "8c8d", "8d8e", "4a3b", "5a4b", "6a5b"]

LOG_PATH = os.environ.get("KISSHOGI_FAKE_LOG", "")

OPTIONS = [
    "option name Threads type spin default 2 min 1 max 8",
    "option name USI_Hash type spin default 128 min 16 max 4096",
    "option name USI_Ponder type check default false",
    "option name BookFile type combo default no_book var no_book var standard_book.db",
    "option name Clear Hash type button",
]


def log(line: str) -> None:
    if not LOG_PATH:
        return
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def send(line: str) -> None:
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def scripted(side: str, moves_played: int) -> str:
    if side == "b":
        index = moves_played // 2
        sequence = BLACK_MOVES
    else:
        index = max(0, (moves_played - 1) // 2)
        sequence = WHITE_MOVES
    return sequence[min(index, len(sequence) - 1)]


def parse_position(line: str) -> tuple[str, int]:
    """Return (side to move, number of moves already in the position)."""
    tokens = line.split()
    if len(tokens) < 2:
        return "b", 0
    if tokens[1] == "startpos":
        side = "b"
        moves = 0
        if "moves" in tokens:
            moves = len(tokens) - tokens.index("moves") - 1
        return ("b" if moves % 2 == 0 else "w"), moves
    if tokens[1] == "sfen" and len(tokens) >= 6:
        side = tokens[3]
        moves = 0
        if "moves" in tokens:
            moves = len(tokens) - tokens.index("moves") - 1
        # The sfen itself defines the side to move; the extra moves flip it
        # only when the sfen already describes a later position.
        if moves % 2 == 1:
            side = "w" if side == "b" else "b"
        return side, moves
    return "b", 0


def bestmove_for(side: str, moves_played: int) -> tuple[str, str]:
    move = scripted(side, moves_played)
    opponent = "w" if side == "b" else "b"
    predicted = scripted(opponent, moves_played + 1)
    return move, predicted


def main() -> int:
    ponder_enabled = False
    ponder_miss = False
    thinking_side = "b"
    thinking_moves = 0
    searching = False
    pondering = False
    ponder_state: tuple[str, int] | None = None
    for raw in sys.stdin:
        line = raw.rstrip("\r\n")
        if not line:
            continue
        log(line)
        if line == "usi":
            send("id name Fake UI USI")
            send("id author Kisshogi tests")
            for option in OPTIONS:
                send(option)
            send("usiok")
        elif line == "isready":
            send("readyok")
        elif line == "usinewgame":
            pass
        elif line.startswith("setoption "):
            parts = line.split()
            if "name" in parts:
                name_index = parts.index("name") + 1
                name = parts[name_index] if name_index < len(parts) else ""
                value = ""
                if "value" in parts:
                    value = " ".join(parts[parts.index("value") + 1:])
                if name == "USI_Ponder":
                    ponder_enabled = value.lower() == "true"
                elif name == "PonderMiss":
                    ponder_miss = value.lower() == "true"
        elif line.startswith("position "):
            thinking_side, thinking_moves = parse_position(line)
        elif line.startswith("go "):
            if " ponder" in f" {line} ":
                pondering = True
                searching = False
                ponder_state = (thinking_side, thinking_moves)
                continue
            if " infinite" in line:
                searching = True
                continue
            searching = True
            move, predicted = bestmove_for(thinking_side, thinking_moves)
            if ponder_miss:
                opponent = "w" if thinking_side == "b" else "b"
                predicted = scripted(opponent, thinking_moves + 3)
            send(
                f"info depth 12 seldepth 14 multipv 1 score cp 32 nodes 900 "
                f"nps 4500 time 80 pv {move} {predicted}"
            )
            send(f"bestmove {move} ponder {predicted}")
            searching = False
        elif line == "ponderhit":
            if pondering and ponder_state is not None:
                side, moves_played = ponder_state
                move, predicted = bestmove_for(side, moves_played)
                send(
                    f"info depth 14 seldepth 16 multipv 1 score cp 40 nodes 1200 "
                    f"nps 5000 time 60 pv {move} {predicted}"
                )
                send(f"bestmove {move} ponder {predicted}")
            pondering = False
            ponder_state = None
        elif line == "stop":
            if searching or pondering:
                if pondering and ponder_state is not None:
                    side, moves_played = ponder_state
                    move = scripted(side, moves_played)
                else:
                    move = scripted(thinking_side, thinking_moves)
                send(f"bestmove {move}")
            searching = False
            pondering = False
            ponder_state = None
        elif line == "quit":
            return 0
        time.sleep(0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
