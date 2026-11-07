// Live engine analysis and full-game scan.

import { api } from "./api.js";

export class AnalysisController {
  constructor({ game, getConfig, onLines, onStatus, onEval, onScanProgress }) {
    this.game = game;
    this.getConfig = getConfig;
    this.onLines = onLines || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onEval = onEval || (() => {});
    this.onScanProgress = onScanProgress || (() => {});
    this.running = false;
    this.scanning = false;
    this.token = 0;
    this.scanToken = 0;
    this.cursor = 0;
    this.lines = new Map();
    this.debounce = 0;
    this.follow = true;
    this.lastStatus = null;
  }

  resolveEngine() {
    const config = this.getConfig();
    const engines = config.engines || {};
    let role = "analysis";
    let slot = engines.analysis;
    if (!slot?.path) {
      if (engines.white?.path) { role = "white"; slot = engines.white; }
      else if (engines.black?.path) { role = "black"; slot = engines.black; }
    }
    if (!slot?.path) throw new Error("no analysis engine configured");
    const options = { ...(slot.options || {}) };
    const multipv = Math.max(1, Math.min(8, Number(config.analysis?.multipv) || 3));
    options.MultiPV = String(multipv);
    return { path: slot.path, options, sourceRole: role };
  }

  setFollow(value) {
    this.follow = Boolean(value);
  }

  async ensureReady(token = this.token) {
    const engine = this.resolveEngine();
    let statuses = await api.engineStatus();
    let status = statuses.analysis;
    if (status?.state === "error") {
      await api.stopEngine("analysis").catch(() => {});
      status = { state: "stopped" };
    }
    if (status?.state !== "ready") {
      if (!status || status.state === "stopped") {
        await api.startEngine("analysis", engine.path, engine.options);
      }
      const deadline = Date.now() + 120000;
      while (Date.now() < deadline) {
        if (token !== this.token) throw new Error("cancelled");
        await new Promise((resolve) => setTimeout(resolve, 200));
        const current = await api.engineStatus();
        status = current.analysis;
        this.lastStatus = status;
        this.onStatus(status);
        if (status?.state === "ready") return status;
        if (status?.state === "error") throw new Error(status.error || "analysis engine error");
      }
      throw new Error("analysis engine start timed out");
    }
    this.lastStatus = status;
    this.onStatus(status);
    return status;
  }

  async start() {
    this.running = true;
    this.token += 1;
    const token = this.token;
    try {
      await this.ensureReady(token);
      if (token !== this.token) return;
      await this._startLive(token);
    } catch (err) {
      this.running = false;
      this.onStatus({ state: "error", error: err.message || String(err) });
    }
  }

  async _startLive(token) {
    await this._waitReady(token);
    if (token !== this.token) return;
    this.lines.clear();
    this.onLines(this.lines);
    this.cursor = (await api.events("analysis", 0)).cursor;
    const sfen = this.game.position.sfen;
    await api.go("analysis", {
      position: `position sfen ${sfen}`,
      infinite: true,
      multipv: this.getConfig().analysis?.multipv || 3,
    });
    this.onStatus({ state: "thinking" });
    this._pollLive(token, sfen);
  }

  restart() {
    if (!this.running || this.scanning) return;
    this.token += 1;
    const token = this.token;
    clearTimeout(this.debounce);
    this.debounce = setTimeout(async () => {
      try {
        await api.stopThinking("analysis");
        await this._waitReady(token);
        if (token !== this.token) return;
        await this._startLive(token);
      } catch (err) {
        if (token === this.token) this.onStatus({ state: "error", error: err.message || String(err) });
      }
    }, 220);
  }

  stop() {
    this.running = false;
    this.token += 1;
    clearTimeout(this.debounce);
    api.stopThinking("analysis").catch(() => {});
    this.onStatus({ state: "ready" });
    this.onLines(new Map());
  }

  _pollLive(token, sfen) {
    const run = async () => {
      if (token !== this.token || !this.running) return;
      let payload;
      try {
        payload = await api.events("analysis", this.cursor);
      } catch (err) {
        if (token === this.token) this.onStatus({ state: "error", error: err.message || String(err) });
        return;
      }
      this.cursor = payload.cursor;
      this.lastStatus = payload.status;
      this.onStatus(payload.status);
      for (const event of payload.events || []) {
        if (event.type === "info") {
          const key = event.multipv || 1;
          this.lines.set(key, event);
          this.onLines(this.lines);
          this.onEval(event, this.game.currentPly, sfen, "analysis");
        } else if (event.type === "error") {
          this.onStatus({ state: "error", error: event.message });
          return;
        }
      }
      if (token === this.token && this.running) setTimeout(run, 150);
    };
    setTimeout(run, 150);
  }

  async _waitReady(token) {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (token !== this.token) throw new Error("cancelled");
      const statuses = await api.engineStatus();
      if (statuses.analysis?.state === "ready") return;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    throw new Error("analysis engine did not become ready");
  }

  onPositionChange() {
    if (!this.running || !this.follow || this.scanning) return;
    this.restart();
  }

  async scanGame() {
    if (this.scanning) return;
    const record = this.game.record;
    const gameId = this.game.gameId;
    this.scanning = true;
    this.scanToken += 1;
    const scanToken = this.scanToken;
    this.token += 1;
    const token = this.token;
    try {
      await api.stopThinking("analysis");
      await this.ensureReady(token);
      await this._waitReady(token);
      const nodes = [];
      nodes.push({ ply: 0, sfen: record.initialPosition.sfen });
      let ply = 0;
      for (const node of record.moves || []) {
        if (node.ply <= 0) continue;
        ply += 1;
        nodes.push({ ply, sfen: node.sfen });
      }
      const scanMs = Math.max(100, Math.min(5000, Number(this.getConfig().analysis?.scanMs) || 500));
      for (let i = 0; i < nodes.length; i += 1) {
        if (scanToken !== this.scanToken || gameId !== this.game.gameId) break;
        this.onScanProgress(i, nodes.length);
        const node = nodes[i];
        const info = await this._searchOnce(node.sfen, scanMs, scanToken);
        if (info) this.onEval(info, node.ply, node.sfen, "scan");
      }
      if (scanToken === this.scanToken) this.onScanProgress(nodes.length, nodes.length);
    } catch (err) {
      this.onStatus({ state: "error", error: err.message || String(err) });
    } finally {
      this.scanning = false;
      if (scanToken === this.scanToken && this.running) this.restart();
    }
  }

  stopScan() {
    this.scanToken += 1;
    this.scanning = false;
    api.stopThinking("analysis").catch(() => {});
  }

  async _searchOnce(sfen, movetime, scanToken) {
    let cursor = (await api.events("analysis", 0)).cursor;
    await api.go("analysis", {
      position: `position sfen ${sfen}`,
      movetime,
      multipv: 1,
    });
    let last = null;
    const deadline = Date.now() + movetime + 30000;
    while (Date.now() < deadline) {
      if (scanToken !== this.scanToken) {
        await api.stopThinking("analysis").catch(() => {});
        return null;
      }
      const payload = await api.events("analysis", cursor);
      cursor = payload.cursor;
      for (const event of payload.events || []) {
        if (event.type === "info" && event.score) last = event;
        if (event.type === "bestmove") return last;
        if (event.type === "error") throw new Error(event.message || "analysis error");
      }
      if (payload.status?.state === "error") throw new Error(payload.status.error || "analysis error");
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    await api.stopThinking("analysis").catch(() => {});
    return last;
  }
}
