# -*- mode: python ; coding: utf-8 -*-
import sys
from pathlib import Path

ROOT = Path(SPECPATH).parent
SRC = ROOT / "src"

hiddenimports = []
hookspath = []
hooksconfig = {}
if sys.platform.startswith("linux"):
    # The GTK backend of pywebview is used on Linux.  Collect the WebKit2
    # typelib but leave WebKitGTK's shared libraries to the system package;
    # bundling them makes the onefile hundreds of megabytes and ties it to one
    # distribution's library set.
    hiddenimports += [
        "gi.repository.WebKit2",
        "gi.repository.Gtk",
        "gi.repository.Gdk",
        "gi.repository.GLib",
        "gi.repository.Gio",
        "gi.repository.GObject",
    ]
    hookspath.append(str(ROOT / "packaging" / "hooks"))
    hooksconfig = {"gi": {"icons": [], "themes": [], "languages": []}}

a = Analysis(
    [str(ROOT / "packaging" / "entry.py")],
    pathex=[str(SRC)],
    binaries=[],
    datas=[(str(SRC / "kisshogi" / "web"), "kisshogi/web")],
    hiddenimports=hiddenimports,
    hookspath=hookspath,
    hooksconfig=hooksconfig,
    runtime_hooks=[],
    excludes=["PIL"],
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
