// Sequential EvE batch runner.  Uses the same GameController/clocks as normal
// games, but drives the black/white engine roles directly so colours can swap.

import { api } from "./api.js";
import { Color, parseSfen } from "./shogi.js";

export class BatchRunner {
  constructor({ game, getConfig, onProgress, onGameResult, onStatus, onError }) {
    this.game = game;
    this.getConfig = getConfig;
    this.onProgress = onProgress || (() => {});
    this.onGameResult = onGameResult || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onError = onError || (() => {});
    this.running = false;
    this.token = 0;
    this.started = {};
    this.results = [];
    this.abortFlag = false;
  }

  async start({ games, swapColors, startSfens }) {
    if (this.running) return;
    const config = this.getConfig();
    const a = config.engines.black;
    const b = config.engines.white;
    if (!a?.path || !b?.path) {
      this.onError("Both black and white engines must be configured for a batch.");
      return;
    }
    const sfens = [];
    for (const line of startSfens || []) {
      const text = line.trim();
      if (!text) continue;
      if (!parseSfen(text)) {
        this.onError(`Invalid start SFEN: ${text}`);
        return;
      }
      sfens.push(text);
    }
    this.running = true;
    this.abortFlag = false;
    this.token += 1;
    const token = this.token;
    this.results = [];
    this.started = {};
    this.game.setMode("eve");
    this.onStatus({ running: true, current: 0, total: games });
    try {
      for (let index = 0; index < games; index += 1) {
        if (token !== this.token || this.abortFlag) break;
        const swap = Boolean(swapColors) && index % 2 === 1;
        const assignment = swap ? { black: "white", white: "black" } : { black: "black", white: "white" };
        const sfen = sfens.length ? sfens[index % sfens.length] : undefined;
        this.onProgress(index + 1, games, "starting");
        this.onStatus({ running: true, current: index + 1, total: games });
        await this._playGame({ index, games, assignment, sfen, config, token });
        if (token !== this.token || this.abortFlag) break;
      }
    } catch (err) {
      this.onError(err.message || String(err));
    } finally {
      this.running = false;
      this.onStatus({ running: false, current: this.results.length, total: games });
      for (const role of ["black", "white"]) {
        api.stopThinking(role).catch(() => {});
      }
    }
  }

  stop() {
    this.abortFlag = true;
    this.token += 1;
    this.running = false;
    for (const role of ["black", "white"]) {
      api.stopThinking(role).catch(() => {});
    }
  }

  async _playGame({ index, games, assignment, sfen, config, token }) {
    const slotForRole = (role) => config.engines[assignment[role]];
    const blackSlot = slotForRole("black");
    const whiteSlot = slotForRole("white");
    await this._ensureRole("black", blackSlot, token);
    await this._ensureRole("white", whiteSlot, token);
    await api.newGameEngine("black");
    await api.newGameEngine("white");
    this.game.setMode("eve");
    this.game.newGame({ sfen, autoPlay: true });
    const startedAt = Date.now();
    let blackName = this.started.black?.name || blackSlot.path;
    let whiteName = this.started.white?.name || whiteSlot.path;
    let moveCount = 0;
    while (!this.game.result) {
      if (token !== this.token || this.abortFlag) throw new Error("batch stopped");
      const color = this.game.currentColor;
      const role = color === Color.BLACK ? "black" : "white";
      const slot = slotForRole(role);
      await this._ensureRole(role, slot, token);
      this.game.clock.arm(color);
      const timeArgs = this.game.clock.timeArgs(color);
      const pre = await api.events(role, 0);
      let cursor = pre.cursor;
      await api.go(role, { position: this.game.record.getUSI(), ...timeArgs });
      let best = null;
      const deadline = Date.now() + 120000 + Math.max(0, timeArgs.btime || 0) + Math.max(0, timeArgs.wtime || 0);
      while (!best) {
        if (token !== this.token || this.abortFlag) {
          await api.stopThinking(role).catch(() => {});
          throw new Error("batch stopped");
        }
        if (this.game.result) {
          await api.stopThinking(role).catch(() => {});
          break;
        }
        if (Date.now() > deadline) {
          await api.stopThinking(role).catch(() => {});
          throw new Error("engine search timed out in batch");
        }
        const payload = await api.events(role, cursor);
        cursor = payload.cursor;
        for (const event of payload.events || []) {
          if (event.type === "bestmove") best = event;
          if (event.type === "error") throw new Error(event.message || "engine error");
        }
        if (payload.status?.state === "error") {
          throw new Error(payload.status.error || "engine error");
        }
        if (!best) await new Promise((resolve) => setTimeout(resolve, 80));
      }
      if (this.game.result) break;
      if (best.move === "resign") {
        this.game.resign();
        break;
      }
      const move = this.game.position.createMoveByUSI(best.move);
      if (!move || !this.game.position.isValidMove(move)) {
        throw new Error(`engine returned an illegal move: ${best.move}`);
      }
      const res = this.game.playMove(move);
      if (!res.ok) throw new Error(res.error || "could not apply move");
      moveCount += 1;
      this.onProgress(index + 1, games, "playing", this.game);
    }
    const result = this.game.result || { type: "aborted", winner: null, draw: false };
    let winnerLabel = "draw";
    if (result.winner === Color.BLACK) winnerLabel = blackName;
    else if (result.winner === Color.WHITE) winnerLabel = whiteName;
    else if (!result.draw) winnerLabel = "aborted";
    const record = {
      index: index + 1,
      black: blackName,
      white: whiteName,
      winner: winnerLabel,
      winnerColor: result.winner || null,
      reason: result.type,
      moves: moveCount,
      sfen: sfen || "standard",
      elapsedMs: Date.now() - startedAt,
      engineA: assignment.black === "black" ? blackName : whiteName,
      engineB: assignment.white === "white" ? whiteName : blackName,
      aColor: assignment.black === "black" ? Color.BLACK : Color.WHITE,
      bColor: assignment.black === "black" ? Color.WHITE : Color.BLACK,
    };
    this.results.push(record);
    this.onGameResult(record, this.results);
  }

  async _ensureRole(role, slot, token) {
    if (!slot?.path) throw new Error(`${role} engine is not configured`);
    const key = JSON.stringify({ path: slot.path, options: slot.options || {} });
    const current = this.started[role];
    let statuses = await api.engineStatus();
    let status = statuses[role];
    if (current?.key === key && status?.state === "ready") return;
    if (current) await api.stopEngine(role).catch(() => {});
    this.started[role] = null;
    await api.startEngine(role, slot.path, slot.options || {});
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      if (token !== this.token) throw new Error("batch stopped");
      await new Promise((resolve) => setTimeout(resolve, 200));
      statuses = await api.engineStatus();
      status = statuses[role];
      if (status?.state === "ready") {
        this.started[role] = { key, name: status.name || slot.path };
        return;
      }
      if (status?.state === "error") throw new Error(status.error || "engine start failed");
    }
    throw new Error("engine start timed out");
  }
}
