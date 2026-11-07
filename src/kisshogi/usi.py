"""Small, dependency-free USI protocol parsers."""

from __future__ import annotations

import re
from typing import Any

_OPTION_RE = re.compile(
    r"^option name (.+?) type (check|spin|combo|button|string|filename)(.*)$"
)
_DEFAULT_RE = re.compile(r"(?:^|\s)default (.+?)(?= (?:min|max|var) |$)")
_MIN_RE = re.compile(r"(?:^|\s)min (-?\d+)")
_MAX_RE = re.compile(r"(?:^|\s)max (-?\d+)")
_VAR_RE = re.compile(r"(?:^|\s)var (.+?)(?= var |$)")


def parse_option(line: str) -> dict[str, Any] | None:
    """Parse a USI ``option ...`` line.

    Option names can contain spaces, so the name is parsed up to `` type ``.
    String defaults may also contain spaces; the parser keeps everything until
    the next known keyword.
    """
    match = _OPTION_RE.match(line.strip())
    if not match:
        return None
    name, kind, rest = match.groups()
    default_match = _DEFAULT_RE.search(rest)
    default = default_match.group(1) if default_match else None
    if default == "<empty>":
        default = ""
    min_match = _MIN_RE.search(rest)
    max_match = _MAX_RE.search(rest)
    option: dict[str, Any] = {
        "name": name,
        "type": kind,
        "default": default,
        "min": int(min_match.group(1)) if min_match else None,
        "max": int(max_match.group(1)) if max_match else None,
        "vars": [v for v in _VAR_RE.findall(rest)],
    }
    return option


def _tokenize_info(line: str) -> list[str]:
    return line.split()


def parse_info(line: str) -> dict[str, Any] | None:
    """Parse a USI ``info`` line into a JSON-friendly dictionary.

    Returns ``None`` for ``info string`` (free-form engine logging) and for
    lines that do not contain anything useful.
    """
    tokens = _tokenize_info(line.strip())
    if not tokens or tokens[0] != "info":
        return None
    if len(tokens) >= 2 and tokens[1] == "string":
        return {"type": "info_string", "text": line.strip()[len("info string ") :]}

    result: dict[str, Any] = {"type": "info"}
    idx = 1
    while idx < len(tokens):
        key = tokens[idx]
        idx += 1
        if key in {"depth", "seldepth", "time", "nodes", "nps", "hashfull", "multipv"}:
            try:
                result[key] = int(tokens[idx])
            except (ValueError, IndexError):
                return None
            idx += 1
        elif key == "currmove":
            if idx < len(tokens):
                result["currmove"] = tokens[idx]
                idx += 1
        elif key == "currmovenumber":
            try:
                result["currmovenumber"] = int(tokens[idx])
            except (ValueError, IndexError):
                return None
            idx += 1
        elif key == "score":
            if idx + 1 >= len(tokens):
                return None
            score_type = tokens[idx]
            try:
                score_value = int(tokens[idx + 1])
            except ValueError:
                return None
            idx += 2
            score: dict[str, Any] = {"type": score_type, "value": score_value}
            while idx < len(tokens) and tokens[idx] in {"lowerbound", "upperbound"}:
                score["bound"] = tokens[idx]
                idx += 1
            result["score"] = score
        elif key == "pv":
            result["pv"] = tokens[idx:]
            break
        else:
            # Unknown token: keep the raw line for debugging and stop.
            result["raw"] = line
            break
    if len(result) == 1:
        return None
    return result


def parse_bestmove(line: str) -> dict[str, Any] | None:
    tokens = line.strip().split()
    if not tokens or tokens[0] != "bestmove":
        return None
    move = tokens[1] if len(tokens) > 1 else ""
    ponder = None
    if len(tokens) >= 4 and tokens[2] == "ponder":
        ponder = tokens[3]
    return {"type": "bestmove", "move": move, "ponder": ponder}


def parse_id_name(line: str) -> str | None:
    stripped = line.strip()
    if stripped.startswith("id name "):
        return stripped[len("id name ") :]
    return None
