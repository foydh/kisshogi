import test from "node:test";
import assert from "node:assert/strict";
import { GameController } from "../../src/kisshogi/web/js/game-controller.js";

function makeGame(now) {
  const side = { mainMs: 60000, byoyomiMs: 0, incrementMs: 0 };
  const game = new GameController({
    timeControl: { black: { ...side }, white: { ...side } },
    maxMoves: 0,
    jishogiRule: "general27",
    now,
  });
  game.newGame();
  return game;
}

test("pausing stops the clock and blocks neither analysis moves nor resume", () => {
  let now = 0;
  const game = makeGame(() => now);
  assert.equal(game.clock.running, true);
  now = 5000;
  assert.equal(game.pauseGame(), true);
  assert.equal(game.paused, true);
  assert.equal(game.clock.running, false);
  now = 20000;
  game.onClockTimeout();
  assert.equal(game.result, null);

  // An analysis "play best move" is still allowed while paused, but the
  // clocks must stay frozen.
  const move = game.position.createMoveByUSI("7g7f");
  assert.ok(move);
  assert.equal(game.playMove(move).ok, true);
  assert.equal(game.length, 1);
  assert.equal(game.paused, true);
  assert.equal(game.clock.running, false);

  assert.equal(game.resumeGame(), true);
  assert.equal(game.paused, false);
  assert.equal(game.clock.running, true);
});

test("a new game clears the paused state", () => {
  let now = 0;
  const game = makeGame(() => now);
  game.pauseGame();
  assert.equal(game.paused, true);
  game.newGame();
  assert.equal(game.paused, false);
  assert.equal(game.clock.running, true);
});
