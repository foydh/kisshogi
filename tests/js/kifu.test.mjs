import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { decodeBytes, detectFormat, exportRecordText, parseRecordText, recordMetadata } from "../../src/kisshogi/web/js/kifu.js";

const root = path.resolve(import.meta.dirname, "..", "..", "tests", "fixtures");
const utf8 = new Uint8Array(fs.readFileSync(path.join(root, "sample.kif")));
const sjis = new Uint8Array(fs.readFileSync(path.join(root, "sample-sjis.kif")));

test("decode utf8 and shift_jis", () => {
  const a = decodeBytes(utf8).replaceAll("\r\n", "\n");
  const b = decodeBytes(sjis).replaceAll("\r\n", "\n");
  assert.equal(a, b);
  assert.ok(a.includes("７六歩"));
});

test("detect and parse kif", () => {
  const text = decodeBytes(utf8);
  const format = detectFormat("sample.kif", text);
  const record = parseRecordText(text, format);
  assert.equal(record.length, 8);
  record.goto(record.length);
  assert.equal(record.position.sfen.split(" ")[0], "lnsgk1snl/1r4gb1/p1pppp1pp/6p2/1p5P1/2P6/PP1PPPP1P/1B1S3R1/LN1GKGSNL");
});

test("parse csa and ki2", () => {
  const csa = decodeBytes(new Uint8Array(fs.readFileSync(path.join(root, "sample.csa"))));
  const ki2 = decodeBytes(new Uint8Array(fs.readFileSync(path.join(root, "sample.ki2"))));
  assert.equal(parseRecordText(csa, "csa").length, 8);
  assert.equal(parseRecordText(ki2, "ki2").length, 8);
});

test("export roundtrip", () => {
  const record = parseRecordText(decodeBytes(utf8), "kif");
  const kif = exportRecordText(record, "kif");
  assert.ok(kif.includes("７六歩"));
  const again = parseRecordText(kif, "kif");
  assert.equal(again.length, 8);
  const csa = exportRecordText(record, "csa");
  assert.ok(csa.includes("7776FU") || csa.includes("+7776FU"));
  assert.equal(exportRecordText(record, "sfen"), record.position.sfen);
});

test("metadata", () => {
  const record = parseRecordText(decodeBytes(utf8), "kif");
  const meta = recordMetadata(record);
  assert.equal(typeof meta.title, "string");
});
