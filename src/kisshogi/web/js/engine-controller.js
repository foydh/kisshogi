// Drives the black/white USI engines, including standard ponder.

import { api } from "./api.js";
import { Color } from "./shogi.js";

const POLL_MS = 120;

function roleFor(color) { return color === Color.BLACK ? "black" : "white"; }
function colorFor(role) { return role === "black" ? Color.BLACK : Color.WHITE; }

export class EngineController {
  constructor({ game, getConfig, onStatus, onError, onEval, onPonder }) {
    this.game = game;
    this.getConfig = getConfig;
    this.onStatus = onStatus || (() => {});
    this.onError = onError || (() => {});
    this.onEval = onEval || (() => {});
    this.onPonder = onPonder || (() => {});
    this.searching = { black: false, white: false };
    this.pondering = { black: null, white: null };
    this.tokens = { black: 0, white: 0 };
    this.seenGame = { black: null, white: null };
    this.cursors = { black: 0, white: 0 };
    this.lastGameId = null;
    this.disabled = false;
  }

  setDisabled(value) {
    this.disabled = Boolean(value);
    if (this.disabled) this.stopAllThinking();
  }

  statusLabel() {
    const any = this.searching.black || this.searching.white || this.pondering.black || this.pondering.white;
    return any;
  }

  onGameChange() {
    if (this.lastGameId !== this.game.gameId) {
      this.lastGameId = this.game.gameId;
      this.stopAllThinking();
    }
    if (this.disabled || this.game.paused || !this.game.autoPlay || this.game.result || !this.game.isLatest) {
      if (this.searching.black || this.searching.white || this.pondering.black || this.pondering.white) {
        this.stopAllThinking();
      }
      return;
    }
    this.resolvePonders().finally(() => this.sync());
  }

  sync() {
    if (this.disabled || this.game.paused || !this.game.autoPlay || this.game.result || !this.game.isLatest) return;
    const color = this.game.currentColor;
    if (!this.game.isEngineTurn(color)) return;
    const role = roleFor(color);
    if (this.searching[role] || this.pondering[role]?.active) return;
    this._goNormal(color).catch((err) => this.onError(err.message || String(err)));
  }

  async startNewGame() {
    this.lastGameId = this.game.gameId;
    this.stopAllThinking();
    this.sync();
  }

  stopAllThinking() {
    for (const role of ["black", "white"]) {
      this.tokens[role] += 1;
      this.searching[role] = false;
      this.pondering[role] = null;
      api.stopThinking(role).catch(() => {});
    }
    this.onStatus();
  }

  async ensureReady(role, token) {
    const slot = this.getConfig().engines?.[role];
    if (!slot?.path) throw new Error("no engine path");
    let statuses = await api.engineStatus();
    let status = statuses[role];
    if (status?.state === "error") {
      await api.stopEngine(role).catch(() => {});
      status = { state: "stopped" };
    }
    if (status?.state === "ready") return status;
    if (!status || status.state === "stopped" || status.state === "error") {
      await api.startEngine(role, slot.path, slot.options || {});
    }
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline) {
      if (token !== this.tokens[role]) throw new Error("cancelled");
      await new Promise((resolve) => setTimeout(resolve, 200));
      const current = await api.engineStatus();
      const value = current[role];
      this.onStatus(role, value);
      if (value?.state === "ready") return value;
      if (value?.state === "error") throw new Error(value.error || "engine error");
    }
    throw new Error("engine start timed out");
  }

  _ponderEnabled(role) {
    const slot = this.getConfig().engines?.[role];
    if (!slot?.path) return false;
    const status = this._lastStatus?.[role];
    const definition = status?.options?.find((o) => o.name === "USI_Ponder");
    if (!definition) return false;
    const value = slot.options?.[definition.name] ?? definition.default ?? "false";
    return String(value).toLowerCase() === "true";
  }

  async _goNormal(color) {
    const role = roleFor(color);
    const slot = this.getConfig().engines?.[role];
    if (!slot?.path) {
      this.onError(`${role} engine is not configured`);
      return;
    }
    const token = ++this.tokens[role];
    this.searching[role] = true;
    this.pondering[role] = null;
    this.onStatus();
    try {
      const status = await this.ensureReady(role, token);
      this._lastStatus = { ...(this._lastStatus || {}), [role]: status };
      if (token !== this.tokens[role] || this.game.gameId !== this.lastGameId) return;
      if (this.seenGame[role] !== this.game.gameId) {
        await api.newGameEngine(role);
        this.seenGame[role] = this.game.gameId;
      }
      this.game.clock.arm(color);
      const timeArgs = this.game.clock.timeArgs(color);
      const position = this.game.record.getUSI();
      this.cursors[role] = (await api.events(role, 0)).cursor;
      await api.go(role, { position, ...timeArgs });
      this._poll(role, token, false, color);
    } catch (err) {
      if (token === this.tokens[role]) {
        this.searching[role] = false;
        this.onError(err.message || String(err));
        this.onStatus();
      }
    }
  }

  _poll(role, token, isPonder, color) {
    const run = async () => {
      if (token !== this.tokens[role]) return;
      let payload;
      try {
        payload = await api.events(role, this.cursors[role]);
      } catch (err) {
        if (token !== this.tokens[role]) return;
        this.searching[role] = false;
        this.pondering[role] = null;
        this.onError(err.message || String(err));
        this.onStatus();
        return;
      }
      this.cursors[role] = payload.cursor;
      this._lastStatus = { ...(this._lastStatus || {}), [role]: payload.status };
      this.onStatus(role, payload.status);
      for (const event of payload.events || []) {
        if (event.type === "info") {
          if (!isPonder) {
            this.onEval(event, this.game.currentPly, this.game.position.sfen, "game");
            this.onPonder(role, null);
          }
        } else if (event.type === "bestmove") {
          if (isPonder) {
            // A ponder result is only expected after ponderhit/stop.  If it
            // arrives while pondering, keep it for the next normal turn.
            this.pondering[role] = null;
            this.searching[role] = false;
            this.onStatus();
            return;
          }
          this.searching[role] = false;
          this.pondering[role] = null;
          this.onStatus();
          this._applyBestMove(role, event, token, color).catch((err) => this.onError(err.message || String(err)));
          return;
        } else if (event.type === "error") {
          this.searching[role] = false;
          this.pondering[role] = null;
          this.onError(event.message || "engine error");
          this.onStatus();
          return;
        }
      }
      if (payload.status?.state === "error") {
        this.searching[role] = false;
        this.pondering[role] = null;
        this.onError(payload.status.error || "engine error");
        this.onStatus();
        return;
      }
      if (token === this.tokens[role]) setTimeout(run, POLL_MS);
    };
    setTimeout(run, POLL_MS);
  }

  async _applyBestMove(role, best, token, color) {
    if (token !== this.tokens[role] || this.game.gameId !== this.lastGameId) return;
    if (this.game.result) return;
    if (best.move === "resign") {
      this.game.resign();
      this.onStatus();
      return;
    }
    if (best.move === "win") {
      this.game.declareJishogi();
      this.onStatus();
      return;
    }
    const move = this.game.position.createMoveByUSI(best.move);
    if (!move || !this.game.position.isValidMove(move)) {
      throw new Error(`engine returned an illegal move: ${best.move}`);
    }
    const result = this.game.playMove(move);
    if (!result.ok) throw new Error(result.error || "could not apply engine move");
    this.onStatus();
    if (best.ponder && this._ponderEnabled(role) && !this.game.result && this.game.autoPlay) {
      this.startPonder(role, best.ponder).catch((err) => this.onError(err.message || String(err)));
    }
    this.onGameChange();
  }

  async startPonder(role, ponderUsi) {
    if (!this.game.autoPlay || this.game.result || !this.game.isLatest) return;
    if (!this._ponderEnabled(role)) return;
    const predicted = this.game.position.createMoveByUSI(ponderUsi);
    if (!predicted || !this.game.position.isValidMove(predicted)) return;
    const token = ++this.tokens[role];
    this.searching[role] = false;
    this.pondering[role] = { active: true, move: ponderUsi, token };
    this.onPonder(role, ponderUsi);
    this.onStatus();
    try {
      const status = await this.ensureReady(role, token);
      this._lastStatus = { ...(this._lastStatus || {}), [role]: status };
      if (token !== this.tokens[role]) return;
      const base = this.game.record.getUSI();
      const position = `${base} ${ponderUsi}`;
      const color = colorFor(role);
      const timeArgs = this.game.clock.timeArgs(color);
      this.cursors[role] = (await api.events(role, 0)).cursor;
      await api.go(role, { position, ponder: true, ...timeArgs });
      this._poll(role, token, true, color);
    } catch (err) {
      if (token === this.tokens[role]) {
        this.pondering[role] = null;
        this.onError(err.message || String(err));
        this.onStatus();
      }
    }
  }

  async resolvePonders() {
    if (this.game.result) return;
    const role = roleFor(this.game.currentColor);
    const pending = this.pondering[role];
    if (!pending?.active) return;
    const actual = this.game.lastMove?.usi;
    const token = ++this.tokens[role];
    this.pondering[role] = null;
    try {
      if (actual && actual === pending.move) {
        await api.ponderhit(role);
        this.searching[role] = true;
        this.game.clock.arm(this.game.currentColor);
        this.onPonder(role, null);
        this.onStatus();
        this._poll(role, token, false, this.game.currentColor);
      } else {
        await api.stopThinking(role);
        // Wait for the engine to finish the abandoned ponder search.
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          const statuses = await api.engineStatus();
          if (statuses[role]?.state === "ready") break;
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.onPonder(role, null);
        this.onStatus();
      }
    } catch (err) {
      this.onError(err.message || String(err));
    }
  }
}
