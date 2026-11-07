"""Collect the WebKit2 typelib for pywebview without bundling libwebkit2gtk.

The release binary relies on the system WebKitGTK 4.1 shared library (the same
dependency a source install needs).  Bundling it produced a 400+ MB onefile and
would not be portable across distributions.
"""

from PyInstaller.utils.hooks.gi import GiModuleInfo


def hook(hook_api):
    info = GiModuleInfo("WebKit2", "4.1", hook_api=hook_api)
    if not info.available:
        info = GiModuleInfo("WebKit2", "4.0", hook_api=hook_api)
    if not info.available:
        return
    _binaries, datas, hiddenimports = info.collect_typelib_data()
    hook_api.add_datas(datas)
    hook_api.add_imports(*hiddenimports)
