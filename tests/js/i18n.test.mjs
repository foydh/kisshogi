import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..", "..", "src", "kisshogi", "web");
const locales = ["en", "zh-CN", "ja"].map((name) => ({
  name,
  data: JSON.parse(fs.readFileSync(path.join(root, "locales", `${name}.json`), "utf8")),
}));
const enKeys = Object.keys(locales[0].data).sort();

test("locale keys are in sync", () => {
  for (const locale of locales.slice(1)) {
    assert.deepEqual(Object.keys(locale.data).sort(), enKeys, `${locale.name} keys differ`);
    for (const [key, value] of Object.entries(locale.data)) {
      assert.equal(typeof value, "string", `${locale.name}.${key}`);
      assert.ok(value.length > 0, `${locale.name}.${key} is empty`);
    }
  }
});

test("html translation keys exist", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const keys = new Set();
  for (const match of html.matchAll(/data-i18n(?:-title|-placeholder|-aria-label)?="([^"]+)"/g)) {
    keys.add(match[1]);
  }
  for (const key of keys) assert.ok(key in locales[0].data, `missing locale key: ${key}`);
});

test("html has no duplicate ids", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length);
});
