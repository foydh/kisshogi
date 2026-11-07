import test from "node:test";
import assert from "node:assert/strict";
import { EvalStore, graphGeometry, normalizeScore } from "../../src/kisshogi/web/js/eval-store.js";
import { Color } from "../../src/kisshogi/web/js/shogi.js";

test("score normalization", () => {
  assert.equal(normalizeScore({ type: "cp", value: 100 }, Color.BLACK), 1);
  assert.equal(normalizeScore({ type: "cp", value: 100 }, Color.WHITE), -1);
  assert.equal(normalizeScore({ type: "mate", value: 3 }, Color.WHITE), -15);
});

test("store, series and truncation", () => {
  const s = new EvalStore();
  s.record(0, { type: "cp", value: 10 }, "9/9/9/9/9/9/9/9/9 b - 1", "scan", 8);
  s.record(1, { type: "cp", value: -20 }, "9/9/9/9/9/9/9/9/9 w - 1", "scan", 9);
  assert.equal(s.series(1).length, 2);
  s.clearFrom(1);
  assert.equal(s.series(2).length, 1);
});

test("graph geometry", () => {
  const s = new EvalStore();
  s.record(0, { type: "cp", value: 0 }, "9/9/9/9/9/9/9/9/9 b - 1", "scan");
  s.record(2, { type: "cp", value: 100 }, "9/9/9/9/9/9/9/9/9 b - 1", "scan");
  const geo = graphGeometry(s.series(2), 2, 360, 150);
  assert.equal(geo.points.length, 2);
  assert.ok(geo.path.startsWith("M"));
  assert.ok(geo.zeroY > 0);
});
