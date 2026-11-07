import test from "node:test";
import assert from "node:assert/strict";
import { Color } from "../../src/kisshogi/web/js/shogi.js";
import { ClockController, formatClock } from "../../src/kisshogi/web/js/clock-controller.js";

function tc(mainMs, byoyomiMs, incrementMs) {
  return { black: { mainMs, byoyomiMs, incrementMs }, white: { mainMs, byoyomiMs, incrementMs } };
}

test("sudden death timeout", () => {
  let now = 0;
  const c = new ClockController(tc(10000, 0, 0), () => now);
  c.arm(Color.BLACK);
  now = 10001;
  assert.equal(c.checkTimeout(), Color.BLACK);
});

test("byoyomi is per move", () => {
  let now = 0;
  const c = new ClockController(tc(1000, 3000, 0), () => now);
  c.arm(Color.BLACK);
  now = 1500; // main expires and 500ms of byoyomi used
  assert.equal(c.checkTimeout(), null);
  assert.equal(c.completeMove(Color.BLACK), true);
  assert.equal(c.snapshot().black.mainMs, 0);
  assert.equal(c.snapshot().black.byoyomiMs, 3000);
});

test("increment is added after a successful move", () => {
  let now = 0;
  const c = new ClockController(tc(10000, 0, 3000), () => now);
  c.arm(Color.BLACK);
  now = 2000;
  assert.equal(c.completeMove(Color.BLACK), true);
  const snap = c.snapshot().black;
  assert.equal(Math.round(snap.mainMs), 11000);
  assert.deepEqual(c.timeArgs(Color.BLACK), {
    btime: 8000, wtime: 7000, binc: 3000, winc: 3000,
  });
});

test("per-side modes", () => {
  let now = 0;
  const timeControl = {
    black: { mainMs: 60000, byoyomiMs: 0, incrementMs: 5000 },
    white: { mainMs: 0, byoyomiMs: 10000, incrementMs: 0 },
  };
  const c = new ClockController(timeControl, () => now);
  c.arm(Color.WHITE);
  now = 4000;
  assert.equal(c.checkTimeout(), null);
  assert.equal(c.snapshot().white.mode, "byoyomi");
  assert.equal(c.snapshot().black.mode, "increment");
});

test("format clock", () => {
  assert.equal(formatClock(0), "0:00");
  assert.equal(formatClock(61000), "1:01");
  assert.equal(formatClock(9500, true), "0:09.5");
});
