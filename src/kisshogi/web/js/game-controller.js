// Authoritative game state.  UI and engine controllers observe this object.

import {
  Color,
  JishogiDeclarationResult,
  JishogiDeclarationRule,
  SpecialMoveType,
  allLegalMoves,
  createMoveChoices,
  hasAnyLegalMove,
  judgeDeclaration,
  judgeImpasse,
  legalDrops,
  legalMovesFrom,
  newRecord,
  parseSfen,
  resultFromSpecial,
  specialMoveType,
} from "./shogi.js";
import { ClockController } from "./clock-controller.js";

const DRAW_TYPES = new Set(["repetition", "draw", "max-moves", "special"]);

export class GameController {
  constructor({ timeControl, maxMoves = 512, jishogiRule = "general27", now } = {}) {
    this.timeControl = timeControl || {
      black: { mainMs: 300000, byoyomiMs: 10000, incrementMs: 0 },
      white: { mainMs: 300000, byoyomiMs: 10000, incrementMs: 0 },
    };
    this.maxMoves = maxMoves;
    this.jishogiRule = jishogiRule;
    this.clock = new ClockController(this.timeControl, now);
    this.record = newRecord();
    this.mode = "pvp";
    this.engineSide = Color.WHITE;
    this.autoPlay = false;
    this.paused = false;
    this.result = null;
    this.subscribers = new Set();
    this._lastMove = null;
    this.gameId = 0;
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  emit() {
    for (const fn of this.subscribers) fn(this);
  }

  get position() { return this.record.position; }
  get currentPly() { return this.record.current.ply; }
  get length() { return this.record.length; }
  get isLatest() { return this.record.current.ply >= this.record.length; }
  get currentColor() { return this.position.color; }
  get clockEnabled() { return this.mode !== "analysis"; }

  isEngineTurn(color = this.currentColor) {
    if (this.mode === "analysis" || this.mode === "pvp") return false;
    if (this.mode === "pve") return color === this.engineSide;
    return true;
  }

  isHumanTurn(color = this.currentColor) {
    return !this.isEngineTurn(color);
  }

  newGame({ sfen = undefined, autoPlay = true } = {}) {
    const record = sfen ? newRecord(sfen) : newRecord();
    if (!record) return false;
    this.record = record;
    this.result = null;
    this._lastMove = null;
    this.gameId += 1;
    this.paused = false;
    this.autoPlay = autoPlay;
    this.clock.setTimeControl(this.timeControl);
    this.clock.reset();
    if (this.clockEnabled && (this.mode === "pvp" || this.isHumanTurn())) {
      this.clock.arm(this.currentColor);
    } else {
      this.clock.stop();
    }
    this.emit();
    return true;
  }

  applyRecord(record) {
    if (!record) return false;
    this.record = record;
    this.record.goto(this.record.length);
    this.gameId += 1;
    this.result = this._resultFromRecord();
    this.paused = false;
    this.autoPlay = false;
    this.clock.setTimeControl(this.timeControl);
    this.clock.reset();
    this.clock.stop();
    this._lastMove = this.record.current?.move || null;
    this.emit();
    return true;
  }

  applySfen(sfen) {
    const position = parseSfen(sfen);
    if (!position) return false;
    const record = newRecord(sfen);
    if (!record) return false;
    this.record = record;
    this.gameId += 1;
    this.result = null;
    this.paused = false;
    this.autoPlay = false;
    this.clock.setTimeControl(this.timeControl);
    this.clock.reset();
    this.clock.stop();
    this.emit();
    return true;
  }

  setTimeControl(timeControl) {
    this.timeControl = timeControl;
    // Applies on the next game, as documented in the UI.
  }

  setMaxMoves(value) {
    this.maxMoves = Math.max(0, Math.min(10000, Number(value) || 0));
  }

  setJishogiRule(rule) {
    if (["none", "general24", "general27"].includes(rule)) this.jishogiRule = rule;
  }

  setMode(mode, engineSide = this.engineSide) {
    this.mode = mode;
    this.engineSide = engineSide;
    this.paused = false;
    this.autoPlay = false;
    if (mode === "analysis") this.clock.stop();
    else this.clock.pause();
    this.emit();
  }

  pauseGame() {
    if (this.paused || this.result) return false;
    this.paused = true;
    this.autoPlay = false;
    this.clock.pause();
    this.emit();
    return true;
  }

  resumeGame() {
    if (!this.paused || this.result) return false;
    this.paused = false;
    this.autoPlay = true;
    if (this.clockEnabled && (this.mode === "pvp" || this.isHumanTurn())) this.clock.arm(this.currentColor);
    this.emit();
    return true;
  }

  legalMoves() { return allLegalMoves(this.position); }
  legalMovesFrom(from) { return legalMovesFrom(this.position, from); }
  legalDrops(type) { return legalDrops(this.position, type); }
  moveChoices(from, to) { return createMoveChoices(this.position, from, to); }

  playMove(move) {
    if (this.result) return { ok: false, error: "game_over" };
    if (!move || !this.position.isValidMove(move)) return { ok: false, error: "illegal_move" };
    const mover = this.currentColor;
    if (this.clock.running && this.clock.active === mover) {
      const ok = this.clock.completeMove(mover);
      if (!ok) {
        this._finishTimeout(mover);
        return { ok: false, error: "timeout" };
      }
    }
    if (!this.isLatest) {
      this.record.removeNextMove();
      this.autoPlay = false;
    }
    if (!this.record.append(move)) return { ok: false, error: "append_failed" };
    this._lastMove = move;
    if (!this.checkGameEnd()) {
      this._armNextClock();
    }
    this.emit();
    return { ok: true };
  }

  _armNextClock() {
    if (this.result || this.paused) return;
    if (!this.isLatest) return;
    if (!this.clockEnabled) {
      this.clock.stop();
      return;
    }
    if (this.mode === "pvp" || this.isHumanTurn()) this.clock.arm(this.currentColor);
    else this.clock.stop();
  }

  checkGameEnd() {
    if (this.result) return true;
    if (!hasAnyLegalMove(this.position)) {
      const loser = this.currentColor;
      const winner = loser === Color.BLACK ? Color.WHITE : Color.BLACK;
      this._appendSpecial(SpecialMoveType.MATE);
      this._setResult({
        type: this.position.checked ? "checkmate" : "no-legal-moves",
        winner,
      });
      return true;
    }
    if (this.record.repetition) {
      const offender = this.record.perpetualCheck;
      if (offender) {
        this._appendSpecial(SpecialMoveType.FOUL_LOSE);
        this._setResult({
          type: "perpetual-check",
          winner: offender === Color.BLACK ? Color.WHITE : Color.BLACK,
          loser: offender,
        });
      } else {
        this._appendSpecial(SpecialMoveType.REPETITION_DRAW);
        this._setResult({ type: "repetition", winner: null, draw: true });
      }
      return true;
    }
    if (this.maxMoves > 0 && this.record.length >= this.maxMoves) {
      this._appendSpecial(SpecialMoveType.MAX_MOVES);
      this._setResult({ type: "max-moves", winner: null, draw: true });
      return true;
    }
    return false;
  }

  _finishTimeout(color) {
    this.clock.timeout(color);
    this._appendSpecial(SpecialMoveType.TIMEOUT);
    this._setResult({
      type: "timeout",
      winner: color === Color.BLACK ? Color.WHITE : Color.BLACK,
      loser: color,
    });
    this.emit();
  }

  onClockTimeout() {
    if (this.result || this.paused || !this.clockEnabled) return;
    const color = this.clock.checkTimeout();
    if (!color) return;
    this._finishTimeout(color);
  }

  resign() {
    if (this.result) return false;
    const loser = this.currentColor;
    this._appendSpecial(SpecialMoveType.RESIGN);
    this._setResult({
      type: "resign",
      winner: loser === Color.BLACK ? Color.WHITE : Color.BLACK,
      loser,
    });
    this.emit();
    return true;
  }

  undo() {
    if (!this.isLatest) return false;
    if (!this.record.current || this.record.current.ply <= 0) return false;
    const mover = this.currentColor;
    if (this.clock.running) this.clock.pause();
    this.record.removeCurrentMove();
    this.result = null;
    this.autoPlay = this.mode !== "pvp" ? this.autoPlay : this.autoPlay;
    this._lastMove = this.record.current?.move || null;
    if (!this.paused && this.clockEnabled && (this.mode === "pvp" || this.isHumanTurn())) this.clock.arm(this.currentColor);
    else this.clock.stop();
    // PvE undo should return to the human turn, but that is handled by the UI
    // calling undo repeatedly (max 2). Kept small and predictable here.
    this.emit();
    return true;
  }

  goto(ply) {
    this.clock.pause();
    this.autoPlay = false;
    this.record.goto(ply);
    this._lastMove = this.record.current?.move || null;
    this.emit();
  }

  continueGame() {
    this.record.goto(this.record.length);
    if (this.result) {
      this.emit();
      return;
    }
    this.paused = false;
    this.autoPlay = true;
    if (this.clockEnabled && (this.mode === "pvp" || this.isHumanTurn())) this.clock.arm(this.currentColor);
    else this.clock.stop();
    this._lastMove = this.record.current?.move || null;
    this.emit();
  }

  resignCurrent() { return this.resign(); }

  declareJishogi() {
    if (this.result || this.jishogiRule === "none") return { ok: false, error: "disabled" };
    const rule = this.jishogiRule === "general24"
      ? JishogiDeclarationRule.GENERAL24
      : JishogiDeclarationRule.GENERAL27;
    const color = this.currentColor;
    const result = judgeDeclaration(rule, this.position, color);
    if (result === JishogiDeclarationResult.WIN) {
      this._appendSpecial(SpecialMoveType.ENTERING_OF_KING);
      this._setResult({ type: "declaration", winner: color });
    } else if (result === JishogiDeclarationResult.DRAW) {
      this._appendSpecial(SpecialMoveType.DRAW);
      this._setResult({ type: "declaration-draw", winner: null, draw: true });
    } else {
      this._appendSpecial(SpecialMoveType.FOUL_LOSE);
      this._setResult({
        type: "declaration-foul",
        winner: color === Color.BLACK ? Color.WHITE : Color.BLACK,
        loser: color,
      });
    }
    this.emit();
    return { ok: true, result };
  }

  evaluateImpasse() {
    if (this.jishogiRule !== "general24") return { ok: false, error: "disabled" };
    return judgeImpasse(this.position);
  }

  applyImpasse() {
    const info = this.evaluateImpasse();
    if (!info.ok) return info;
    if (info.result === "draw") {
      this._appendSpecial(SpecialMoveType.DRAW);
      this._setResult({ type: "impasse-draw", winner: null, draw: true });
    } else {
      const winner = info.result === "black" ? Color.BLACK : Color.WHITE;
      this._appendSpecial(SpecialMoveType.WIN_BY_DEFAULT);
      this._setResult({ type: "impasse", winner });
    }
    this.emit();
    return info;
  }

  get lastMove() { return this._lastMove; }

  get clockSnapshot() { return this.clock.snapshot(); }
  get clockTimeArgs() { return this.clock.timeArgs(this.currentColor); }

  _setResult(result) {
    this.result = result;
    this.clock.stop();
    this.autoPlay = false;
  }

  _appendSpecial(type) {
    try {
      this.record.append(specialMoveType(type));
    } catch {
      // A result must never be lost because a special move could not be
      // appended (e.g. a malformed imported record).
    }
  }

  _resultFromRecord() {
    const node = this.record.current;
    if (!node || !node.move) return null;
    const special = resultFromSpecial(node.move);
    if (!special) return null;
    const turn = this.position.color;
    if (special.winnerFromTurn) return { ...special, winner: turn, loser: null };
    if (special.loserFromTurn) {
      return {
        ...special,
        winner: turn === Color.BLACK ? Color.WHITE : Color.BLACK,
        loser: turn,
      };
    }
    if (special.draw) return { ...special, winner: null };
    return special;
  }
}

export function resultLabelKey(type) {
  return {
    checkmate: "result.checkmate",
    "no-legal-moves": "result.noLegalMoves",
    resign: "result.resign",
    timeout: "result.timeout",
    repetition: "result.repetition",
    "perpetual-check": "result.perpetualCheck",
    "max-moves": "result.maxMoves",
    declaration: "result.declaration",
    "declaration-draw": "result.declarationDraw",
    "declaration-foul": "result.declarationFoul",
    impasse: "result.impasse",
    "impasse-draw": "result.impasseDraw",
    foul: "result.foul",
    special: "result.special",
    draw: "result.draw",
  }[type] || "result.special";
}
