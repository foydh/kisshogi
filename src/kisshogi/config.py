"""Configuration for Kisshogi.

The configuration lives outside the repository (in the user's config
directory) and may contain local engine paths.  It is never packaged.
"""

from __future__ import annotations

import copy
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

DEFAULT_CONFIG: dict[str, Any] = {
    "version": 1,
    "language": "auto",
    "mode": "pvp",
    "engineSide": "white",
    "timeControl": {
        "black": {"mainMs": 300000, "byoyomiMs": 10000, "incrementMs": 0},
        "white": {"mainMs": 300000, "byoyomiMs": 10000, "incrementMs": 0},
    },
    "maxMoves": 512,
    "jishogiRule": "general27",
    "engines": {
        "black": {"path": "", "options": {}},
        "white": {"path": "", "options": {}},
        "analysis": {"path": "", "options": {}},
    },
    "analysis": {"multipv": 3, "scanMs": 500},
    "batch": {"games": 10, "swapColors": True, "startSfens": []},
    "ui": {"flip": False, "coordinates": True},
}

LANGUAGES = {"auto", "en", "zh-CN", "ja"}
MODES = {"pvp", "pve", "eve"}
SIDES = {"black", "white"}
JISHOGI_RULES = {"none", "general24", "general27"}
ROLES = ("black", "white", "analysis")


def config_dir() -> Path:
    if os.name == "nt":
        base = os.environ.get("APPDATA")
        if base:
            return Path(base) / "Kisshogi"
        return Path.home() / "AppData" / "Roaming" / "Kisshogi"
    base = os.environ.get("XDG_CONFIG_HOME")
    if base:
        return Path(base) / "kisshogi"
    return Path.home() / ".config" / "kisshogi"


def default_config_path() -> Path:
    return config_dir() / "config.json"


def deep_merge(default: dict[str, Any], value: Any) -> dict[str, Any]:
    """Merge only keys that exist in *default* to keep config small."""
    if not isinstance(value, dict):
        return copy.deepcopy(default)
    out = copy.deepcopy(default)
    for key, val in value.items():
        if key not in out:
            continue
        if isinstance(out[key], dict):
            if out[key]:
                out[key] = deep_merge(out[key], val)
            else:
                # Engine option maps are intentionally open-ended; an empty
                # default map must not erase user-saved option names.
                out[key] = copy.deepcopy(val)
        else:
            out[key] = copy.deepcopy(val)
    return out


def _int(value: Any, name: str, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{name} must be an integer")
    if value < minimum or value > maximum:
        raise ValueError(f"{name} must be between {minimum} and {maximum}")
    return value


def validate_time_control(side: str, tc: Any) -> dict[str, int]:
    if not isinstance(tc, dict):
        raise ValueError(f"timeControl.{side} must be an object")
    main = _int(tc.get("mainMs", 0), f"timeControl.{side}.mainMs", 0, 6 * 60 * 60 * 1000)
    byoyomi = _int(tc.get("byoyomiMs", 0), f"timeControl.{side}.byoyomiMs", 0, 60000)
    increment = _int(tc.get("incrementMs", 0), f"timeControl.{side}.incrementMs", 0, 60000)
    if byoyomi > 0 and increment > 0:
        raise ValueError(f"timeControl.{side}: byoyomi and increment are mutually exclusive")
    if main == 0 and byoyomi == 0 and increment == 0:
        raise ValueError(f"timeControl.{side}: at least one time source is required")
    if increment > 0 and main == 0:
        raise ValueError(f"timeControl.{side}: increment mode requires a main time")
    return {"mainMs": main, "byoyomiMs": byoyomi, "incrementMs": increment}


def validate_config(cfg: Any) -> dict[str, Any]:
    if not isinstance(cfg, dict):
        raise ValueError("config must be an object")
    cfg = deep_merge(DEFAULT_CONFIG, cfg)
    if cfg.get("version") != 1:
        cfg["version"] = 1
    if cfg.get("language") not in LANGUAGES:
        raise ValueError("language must be auto, en, zh-CN or ja")
    if cfg.get("mode") not in MODES:
        raise ValueError("mode must be pvp, pve or eve")
    if cfg.get("engineSide") not in SIDES:
        raise ValueError("engineSide must be black or white")
    tc = cfg.get("timeControl")
    if not isinstance(tc, dict):
        raise ValueError("timeControl must be an object")
    cfg["timeControl"] = {
        "black": validate_time_control("black", tc.get("black", {})),
        "white": validate_time_control("white", tc.get("white", {})),
    }
    cfg["maxMoves"] = _int(cfg.get("maxMoves"), "maxMoves", 0, 10000)
    if cfg.get("jishogiRule") not in JISHOGI_RULES:
        raise ValueError("jishogiRule must be none, general24 or general27")

    engines = cfg.get("engines")
    if not isinstance(engines, dict):
        raise ValueError("engines must be an object")
    for role in ROLES:
        slot = engines.get(role, {})
        if not isinstance(slot, dict):
            raise ValueError(f"engines.{role} must be an object")
        path = slot.get("path", "")
        if not isinstance(path, str):
            raise ValueError(f"engines.{role}.path must be a string")
        options = slot.get("options", {})
        if not isinstance(options, dict):
            raise ValueError(f"engines.{role}.options must be an object")
        clean_options: dict[str, str] = {}
        for name, value in options.items():
            if not isinstance(name, str) or not name or "\n" in name or "\r" in name:
                raise ValueError(f"engines.{role}.options has an invalid name")
            if isinstance(value, bool):
                value = "true" if value else "false"
            if not isinstance(value, str):
                value = str(value)
            if "\n" in value or "\r" in value:
                raise ValueError(f"engines.{role}.options.{name} must not contain newlines")
            if len(value) > 4096:
                raise ValueError(f"engines.{role}.options.{name} is too long")
            clean_options[name] = value
        engines[role] = {"path": path, "options": clean_options}

    analysis = cfg.get("analysis")
    if not isinstance(analysis, dict):
        raise ValueError("analysis must be an object")
    analysis["multipv"] = _int(analysis.get("multipv"), "analysis.multipv", 1, 8)
    analysis["scanMs"] = _int(analysis.get("scanMs"), "analysis.scanMs", 100, 5000)

    batch = cfg.get("batch")
    if not isinstance(batch, dict):
        raise ValueError("batch must be an object")
    batch["games"] = _int(batch.get("games"), "batch.games", 1, 1000)
    if not isinstance(batch.get("swapColors"), bool):
        raise ValueError("batch.swapColors must be a boolean")
    sfens = batch.get("startSfens", [])
    if not isinstance(sfens, list) or not all(isinstance(s, str) for s in sfens):
        raise ValueError("batch.startSfens must be an array of strings")
    batch["startSfens"] = [s.strip() for s in sfens if s.strip()]

    ui = cfg.get("ui")
    if not isinstance(ui, dict):
        raise ValueError("ui must be an object")
    if not isinstance(ui.get("flip"), bool) or not isinstance(ui.get("coordinates"), bool):
        raise ValueError("ui.flip and ui.coordinates must be booleans")
    return cfg


def load_config(path: Path | None = None) -> dict[str, Any]:
    path = path or default_config_path()
    try:
        raw = path.read_text(encoding="utf-8")
        cfg = json.loads(raw)
        return validate_config(cfg)
    except FileNotFoundError:
        return copy.deepcopy(DEFAULT_CONFIG)
    except Exception as exc:  # noqa: BLE001 - config must never prevent startup
        log.warning("could not load config %s: %s; using defaults", path, exc)
        return copy.deepcopy(DEFAULT_CONFIG)


def save_config(path: Path, cfg: dict[str, Any]) -> None:
    cfg = validate_config(cfg)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=".config-", suffix=".json", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(cfg, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
            fh.flush()
            os.fsync(fh.fileno())
        os.replace(tmp_name, path)
        try:
            os.chmod(path, 0o600)
        except OSError:
            pass
    finally:
        try:
            os.unlink(tmp_name)
        except FileNotFoundError:
            pass


def resolve_engine_path(path: str, config_path: Path | None = None) -> Path:
    """Resolve a user supplied engine path.

    Relative paths are resolved against the configuration directory, making
    portable configs possible without ever writing absolute paths into the
    repository.
    """
    value = Path(path).expanduser()
    if not value.is_absolute():
        value = (config_path or default_config_path()).parent / value
    return value.resolve()
