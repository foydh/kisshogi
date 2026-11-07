// KIF / KI2 / CSA / SFEN import and export.

import { api } from "./api.js";
import {
  RecordMetadataKey,
  exportCSA,
  exportKIF,
  exportKI2,
  importCSA,
  importKIF,
  importKI2,
} from "./shogi.js";

export function decodeBytes(buffer) {
  const bytes = new Uint8Array(buffer);
  let start = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(start));
  } catch {
    return new TextDecoder("shift_jis").decode(bytes);
  }
}

export function detectFormat(name, text) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".sfen")) return "sfen";
  if (lower.endsWith(".csa")) return "csa";
  if (lower.endsWith(".ki2") || lower.endsWith(".ki2u")) return "ki2";
  if (lower.endsWith(".kif") || lower.endsWith(".kifu")) return "kif";
  const head = text.slice(0, 500);
  if (/^V\d/m.test(head) || /^P[1-9]/m.test(head) || /^\$/.test(head)) return "csa";
  if (head.includes("手合割") || head.includes("▲") || head.includes("△")) return "kif";
  return "kif";
}

export function parseRecordText(text, format) {
  let result;
  if (format === "csa") result = importCSA(text);
  else if (format === "ki2") result = importKI2(text);
  else result = importKIF(text);
  if (result instanceof Error) throw result;
  return result;
}

export function recordMetadata(record) {
  const get = (key) => record.metadata?.getStandardMetadata?.(key) || "";
  return {
    title: get(RecordMetadataKey.TITLE),
    black: get(RecordMetadataKey.BLACK_NAME),
    white: get(RecordMetadataKey.WHITE_NAME),
    date: get(RecordMetadataKey.START_DATETIME) || get(RecordMetadataKey.DATE),
    event: get(RecordMetadataKey.TOURNAMENT),
  };
}

export function exportRecordText(record, format) {
  switch (format) {
    case "sfen":
      return record.position.sfen;
    case "ki2":
      return exportKI2(record, { returnCode: "\r\n" });
    case "csa":
      return exportCSA(record, { returnCode: "\r\n" });
    case "kif":
    default:
      return exportKIF(record, { returnCode: "\r\n" });
  }
}

export function downloadBytes(bytes, filename, mime = "application/octet-stream") {
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text, filename, { bom = false } = {}) {
  const encoded = new TextEncoder().encode((bom ? "\uFEFF" : "") + text);
  downloadBytes(encoded, filename, "text/plain;charset=utf-8");
}

export async function exportRecord(record, format, encoding, filename) {
  const text = exportRecordText(record, format);
  if (encoding === "shift_jis") {
    const buffer = await api.encode(text, "shift_jis");
    downloadBytes(new Uint8Array(buffer), filename);
  } else {
    downloadText(text, filename, { bom: format !== "sfen" });
  }
}

export function readFileAsText(file) {
  return file.arrayBuffer().then(decodeBytes);
}
