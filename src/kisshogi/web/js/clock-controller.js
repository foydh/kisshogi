// Per-side shogi clock. Pure logic; time source is injectable for tests.

import { Color } from "./shogi.js";

const nowDefault = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function cloneSide(side) {
  return {
    mainMs: Math.max(0, Number(side.mainMs) || 0),
    byoyomiMs: Math.max(0, Number(side.byoyomiMs) || 0),
    incrementMs: Math.max(0, Number(side.incrementMs) || 0),
  };
}

export class ClockController {
  constructor(timeControl, now = nowDefault) {
    this.now = now;
    this.timeControl = {
      black: cloneSide(timeControl?.black || {}),
      white: cloneSide(timeControl?.white || {}),
    };
    this.sides = {
      black: { remainingMain: 0, remainingByoyomi: 0, consumed: 0 },
      white: { remainingMain: 0, remainingByoyomi: 0, consumed: 0 },
    };
    this.active = null;
    this.startedAt = 0;
    this.running = false;
    this.finished = false;
    this.reset();
  }

  reset() {
    for (const color of [Color.BLACK, Color.WHITE]) {
      this.sides[color].remainingMain = this.timeControl[color].mainMs;
      this.sides[color].remainingByoyomi = this.timeControl[color].byoyomiMs;
      this.sides[color].consumed = 0;
    }
    this.active = null;
    this.startedAt = this.now();
    this.running = false;
    this.finished = false;
  }

  setTimeControl(timeControl) {
    this.timeControl = {
      black: cloneSide(timeControl?.black || {}),
      white: cloneSide(timeControl?.white || {}),
    };
    this.reset();
  }

  arm(color) {
    if (this.finished || (color !== Color.BLACK && color !== Color.WHITE)) return;
    if (this.active && this.running) this._charge(this.active, this.now());
    this.active = color;
    this.sides[color].remainingByoyomi = this.timeControl[color].byoyomiMs;
    this.startedAt = this.now();
    this.running = true;
  }

  pause() {
    if (this.running && this.active) this._charge(this.active, this.now());
    this.running = false;
  }

  resume() {
    if (this.finished || !this.active || this.running) return;
    this.startedAt = this.now();
    this.running = true;
  }

  stop() {
    if (this.running && this.active) this._charge(this.active, this.now());
    this.running = false;
  }

  // Charge elapsed time and then add Fischer increment on a completed move.
  completeMove(color) {
    if (this.finished || !this.active || this.active !== color) return true;
    const timeout = this._charge(color, this.now());
    if (timeout) {
      this.running = false;
      return false;
    }
    const increment = this.timeControl[color].incrementMs;
    if (increment > 0) this.sides[color].remainingMain += increment;
    this.sides[color].remainingByoyomi = this.timeControl[color].byoyomiMs;
    this.running = false;
    this.active = null;
    return true;
  }

  checkTimeout() {
    if (!this.running || !this.active || this.finished) return null;
    const result = this._effective(this.active, this.now());
    return result.timeout ? this.active : null;
  }

  timeout(color) {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.active = color;
  }

  snapshot() {
    const out = {};
    for (const color of [Color.BLACK, Color.WHITE]) {
      const cfg = this.timeControl[color];
      const side = this.sides[color];
      const effective = this._effective(color, this.now());
      out[color] = {
        mainMs: Math.max(0, effective.mainMs),
        byoyomiMs: Math.max(0, effective.byoyomiMs),
        mode: cfg.byoyomiMs > 0 ? "byoyomi" : cfg.incrementMs > 0 ? "increment" : "main",
        incrementMs: cfg.incrementMs,
        active: this.active === color && this.running,
        timeout: effective.timeout,
      };
    }
    return out;
  }

  timeArgs(color) {
    const cfg = this.timeControl[color];
    const b = this.sides[Color.BLACK];
    const w = this.sides[Color.WHITE];
    if (cfg.byoyomiMs > 0) {
      return {
        btime: Math.max(0, Math.round(b.remainingMain)),
        wtime: Math.max(0, Math.round(w.remainingMain)),
        byoyomi: cfg.byoyomiMs,
      };
    }
    if (cfg.incrementMs > 0) {
      return {
        btime: Math.max(0, Math.round(b.remainingMain - this.timeControl.black.incrementMs)),
        wtime: Math.max(0, Math.round(w.remainingMain - this.timeControl.white.incrementMs)),
        binc: this.timeControl.black.incrementMs,
        winc: this.timeControl.white.incrementMs,
      };
    }
    return {
      btime: Math.max(0, Math.round(b.remainingMain)),
      wtime: Math.max(0, Math.round(w.remainingMain)),
      byoyomi: 0,
    };
  }

  _effective(color, at) {
    const cfg = this.timeControl[color];
    const side = this.sides[color];
    if (!this.running || this.active !== color) {
      return { mainMs: side.remainingMain, byoyomiMs: side.remainingByoyomi, timeout: false };
    }
    const elapsed = Math.max(0, at - this.startedAt);
    if (cfg.byoyomiMs > 0) {
      if (side.remainingMain > 0) {
        if (elapsed < side.remainingMain) {
          return {
            mainMs: side.remainingMain - elapsed,
            byoyomiMs: cfg.byoyomiMs,
            timeout: false,
          };
        }
        const byoyomi = side.remainingByoyomi - (elapsed - side.remainingMain);
        return { mainMs: 0, byoyomiMs: Math.max(0, byoyomi), timeout: byoyomi <= 0 };
      }
      return {
        mainMs: 0,
        byoyomiMs: Math.max(0, side.remainingByoyomi - elapsed),
        timeout: side.remainingByoyomi - elapsed <= 0,
      };
    }
    return {
      mainMs: Math.max(0, side.remainingMain - elapsed),
      byoyomiMs: 0,
      timeout: side.remainingMain - elapsed <= 0,
    };
  }

  _charge(color, at) {
    const cfg = this.timeControl[color];
    const side = this.sides[color];
    const elapsed = Math.max(0, at - this.startedAt);
    side.consumed += elapsed;
    if (cfg.byoyomiMs > 0) {
      if (side.remainingMain > 0) {
        if (elapsed < side.remainingMain) {
          side.remainingMain -= elapsed;
          return false;
        }
        const overflow = elapsed - side.remainingMain;
        side.remainingMain = 0;
        side.remainingByoyomi -= overflow;
        if (side.remainingByoyomi <= 0) {
          this.finished = true;
          this.running = false;
          this.active = color;
          return true;
        }
        return false;
      }
      side.remainingByoyomi -= elapsed;
      if (side.remainingByoyomi <= 0) {
        this.finished = true;
        this.running = false;
        this.active = color;
        return true;
      }
      return false;
    }
    if (elapsed >= side.remainingMain) {
      side.remainingMain = 0;
      this.finished = true;
      this.running = false;
      this.active = color;
      return true;
    }
    side.remainingMain -= elapsed;
    return false;
  }
}

export function formatClock(ms, showTenths = false) {
  if (showTenths) {
    const totalTenths = Math.max(0, Math.ceil(ms / 100));
    const minutes = Math.floor(totalTenths / 600);
    const seconds = Math.floor((totalTenths % 600) / 10);
    const tenths = totalTenths % 10;
    return `${minutes}:${String(seconds).padStart(2, "0")}.${tenths}`;
  }
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
