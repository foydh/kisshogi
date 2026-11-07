import test from "node:test";
import assert from "node:assert/strict";

const BLACK_MOVES = ["7g7f", "2g2f", "2f2e", "3i3h", "4i4h", "5i5h"];
const WHITE_MOVES = ["3c3d", "8c8d", "8d8e", "4a3b", "5a4b", "6a5b"];

let engines;
let stats;
let missBlack;

function scripted(side, movesPlayed) {
  if (side === "black") {
    return BLACK_MOVES[Math.min(Math.floor(movesPlayed / 2), BLACK_MOVES.length - 1)];
  }
  return WHITE_MOVES[Math.min(Math.max(0, Math.floor((movesPlayed - 1) / 2)), WHITE_MOVES.length - 1)];
}

function parsePosition(command) {
  const tokens = command.split(/\s+/);
  const index = tokens.indexOf("moves");
  const moves = index === -1 ? [] : tokens.slice(index + 1);
  if (tokens[1] === "startpos") {
    return { side: moves.length % 2 === 0 ? "black" : "white", count: moves.length };
  }
  let side = tokens[3] === "b" ? "black" : "white";
  if (moves.length % 2 === 1) side = side === "black" ? "white" : "black";
  return { side, count: moves.length };
}

function makeEngine(role) {
  return {
    role,
    state: "stopped",
    name: "Fake batch engine",
    options: [
      { name: "USI_Ponder", type: "check", default: "false" },
      { name: "Threads", type: "spin", default: 2, min: 1, max: 8 },
    ],
    appliedOptions: {},
    events: [],
    seq: 0,
    pondering: null,
  };
}

function reset(miss = false) {
  engines = {
    black: makeEngine("black"),
    white: makeEngine("white"),
    analysis: makeEngine("analysis"),
  };
  stats = { ponder: [], ponderhit: [], stop: [], stopDuringPonder: 0, go: [] };
  missBlack = miss;
}

function status(role) {
  const engine = engines[role];
  return {
    role,
    state: engine.state,
    name: engine.name,
    options: engine.options,
    appliedOptions: engine.appliedOptions,
    error: null,
    busy: engine.state === "thinking" || engine.state === "pondering",
  };
}

function push(role, event) {
  const engine = engines[role];
  engine.seq += 1;
  engine.events.push({ ...event, seq: engine.seq });
}

function bestMove(role, side, movesPlayed) {
  const move = scripted(side, movesPlayed);
  const opponent = side === "black" ? "white" : "black";
  let predicted = scripted(opponent, movesPlayed + 1);
  if (missBlack && role === "black") predicted = "8c8d";
  return [move, predicted];
}

function startSearch(role, side, movesPlayed) {
  const [move, predicted] = bestMove(role, side, movesPlayed);
  push(role, { type: "info", depth: 10, multipv: 1, score: { type: "cp", value: 30 }, pv: [move] });
  push(role, { type: "bestmove", move, ponder: predicted });
}

function onGo(body) {
  const engine = engines[body.role];
  const position = parsePosition(body.position);
  if (body.ponder) {
    stats.ponder.push(body.role);
    engine.state = "pondering";
    engine.pondering = position;
    return { ok: true };
  }
  stats.go.push({ role: body.role, side: position.side, count: position.count });
  engine.state = "ready";
  startSearch(body.role, position.side, position.count);
  return { ok: true };
}

function onStop(role) {
  const engine = engines[role];
  stats.stop.push(role);
  if (engine.pondering) {
    stats.stopDuringPonder += 1;
    startSearch(role, engine.pondering.side, engine.pondering.count);
    engine.pondering = null;
  }
  engine.state = "ready";
  return { ok: true };
}

function onPonderHit(role) {
  const engine = engines[role];
  if (!engine.pondering) return { ok: true };
  stats.ponderhit.push(role);
  startSearch(role, engine.pondering.side, engine.pondering.count);
  engine.pondering = null;
  engine.state = "ready";
  return { ok: true };
}

function json(payload) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

reset();
globalThis.document = {
  querySelector: () => ({ getAttribute: () => "test-token" }),
};
globalThis.fetch = async (path, options = {}) => {
  const url = new URL(path, "http://127.0.0.1");
  const method = options.method || "GET";
  const body = options.body ? JSON.parse(options.body) : {};
  if (url.pathname === "/api/engine/status") {
    return json({ black: status("black"), white: status("white"), analysis: status("analysis") });
  }
  if (url.pathname === "/api/engine/start") {
    const engine = engines[body.role];
    engine.state = "ready";
    engine.name = "Fake batch engine";
    engine.appliedOptions = { ...body.options };
    return json({ ok: true });
  }
  if (url.pathname === "/api/engine/stop") {
    engines[body.role].state = "stopped";
    engines[body.role].pondering = null;
    return json({ ok: true });
  }
  if (url.pathname === "/api/engine/newgame") return json({ ok: true });
  if (url.pathname === "/api/engine/events") {
    const role = url.searchParams.get("role");
    const since = Number(url.searchParams.get("since") || 0);
    const engine = engines[role];
    return json({
      cursor: engine.seq,
      events: engine.events.filter((event) => event.seq > since),
      status: status(role),
    });
  }
  if (url.pathname === "/api/engine/go") return json(onGo(body));
  if (url.pathname === "/api/engine/ponderhit") return json(onPonderHit(body.role));
  if (url.pathname === "/api/engine/stop-thinking") return json(onStop(body.role));
  throw new Error(`unexpected request ${method} ${url.pathname}`);
};

const { BatchRunner } = await import("../../src/kisshogi/web/js/batch-runner.js");
const { GameController } = await import("../../src/kisshogi/web/js/game-controller.js");

function makeGame() {
  const side = { mainMs: 600000, byoyomiMs: 1000, incrementMs: 0 };
  const game = new GameController({
    timeControl: { black: { ...side }, white: { ...side } },
    maxMoves: 6,
    jishogiRule: "general27",
  });
  game.setMode("eve");
  return game;
}

const config = {
  engines: {
    black: { path: "/fake/black", options: { USI_Ponder: "true" } },
    white: { path: "/fake/white", options: { USI_Ponder: "true" } },
    analysis: { path: "", options: {} },
  },
};

async function runBatch() {
  const game = makeGame();
  const results = [];
  const errors = [];
  const batch = new BatchRunner({
    game,
    getConfig: () => config,
    onGameResult: (record) => results.push(record),
    onError: (message) => errors.push(message),
  });
  await batch.start({ games: 1, swapColors: false, startSfens: [] });
  return { game, results, errors };
}

test("batch games use ponder and ponderhit", async () => {
  reset(false);
  const { results, errors } = await runBatch();
  assert.deepEqual(errors, []);
  assert.equal(results.length, 1);
  assert.equal(results[0].reason, "max-moves");
  assert.equal(results[0].moves, 6);
  assert.ok(stats.ponder.length >= 2, `ponder count ${stats.ponder.length}`);
  assert.ok(stats.ponderhit.length >= 2, `ponderhit count ${stats.ponderhit.length}`);
  // Every ponder either hits or is stopped; the game end stops the last one.
  assert.equal(stats.ponderhit.length + stats.stopDuringPonder, stats.ponder.length);
});

test("batch games recover when a ponder prediction misses", async () => {
  reset(true);
  const { results, errors } = await runBatch();
  assert.deepEqual(errors, []);
  assert.equal(results.length, 1);
  assert.equal(results[0].reason, "max-moves");
  assert.ok(stats.ponder.length >= 1, "ponder was started");
  assert.ok(stats.stopDuringPonder >= 1, "at least one ponder was stopped instead of hit");
  assert.ok(stats.ponderhit.includes("white"), "white ponder still hit");
  // The non-hit ponder must have been replaced by a normal search that kept
  // the game moving, so the whole line still finishes.
  assert.equal(stats.ponderhit.length + stats.stopDuringPonder, stats.ponder.length);
});
