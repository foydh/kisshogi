# -*- mode: python ; coding: utf-8 -*-
"""Portable browser-only onefile.

This variant deliberately excludes pywebview and PyGObject, so it runs on
machines where the native WebKit/WebView2 stack is unavailable.  It is shipped
next to the native-first binaries as the "portable" release asset.
"""

from pathlib import Path

ROOT = Path(SPECPATH).parent
SRC = ROOT / "src"

a = Analysis(
    [str(ROOT / "packaging" / "entry.py")],
    pathex=[str(SRC)],
    binaries=[],
    datas=[(str(SRC / "kisshogi" / "web"), "kisshogi/web")],
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["webview", "gi", "PIL"],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="kisshogi",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
)
