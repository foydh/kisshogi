// Kisshogi UI wiring.

import { api } from "./api.js";
import {
  Color,
  PieceType,
  Square,
  declarationPoints,
  impassePoints,
  kingsInEnemyCamp,
  parseSfen,
  pvNotation,
} from "./shogi.js";
import { BoardView } from "./board-view.js";
import { GameController, resultLabelKey } from "./game-controller.js";
import { ClockController, formatClock } from "./clock-controller.js";
import { loadLocale, applyStaticTranslations, t, LANGUAGES } from "./i18n.js";
import { promotionDialog, confirmDialog, infoDialog, toast, textDialog } from "./dialogs.js";
import { EngineController } from "./engine-controller.js";
import { AnalysisController } from "./analysis-controller.js";
import { EvalStore, normalizeScore } from "./eval-store.js";
import { GraphView } from "./graph-view.js";
import { PositionEditor } from "./position-editor.js";
import { EngineOptionsPanel } from "./options-form.js";
import { BatchRunner } from "./batch-runner.js";
import {
  detectFormat,
  downloadText,
  exportRecord,
  parseRecordText,
  readFileAsText,
  recordMetadata,
} from "./kifu.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const token = document.querySelector('meta[name="kisshogi-token"]')?.getAttribute("content") || "";

let config = null;
let game = null;
let boardView = null;
let editor = null;
let engine = null;
let analysis = null;
let batch = null;
let optionsPanel = null;
let evalStore = null;
let graphView = null;
let lastGameId = null;
let lastLength = 0;
let selected = null;
let selectedHand = null;
let selectedHandColor = null;
let legalMoves = [];
let saveTimer = 0;
let lastStatuses = {};
let batchResults = [];
let heartbeatFailures = 0;
let initialized = false;

function persistConfig() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      config = await api.saveConfig(config);
    } catch (err) {
      toast(t("toast.configError", { message: err.message }), "error");
    }
  }, 350);
}

function colorName(color) {
  return color === Color.BLACK ? t("color.black") : t("color.white");
}

function engineRoleFor(color) {
  return color === Color.BLACK ? "black" : "white";
}

function engineName(role) {
  return lastStatuses?.[role]?.name || "";
}

function slotPath(role) {
  return config?.engines?.[role]?.path || "";
}

function validateModeForNewGame() {
  if (config.mode === "pve") {
    if (!slotPath(config.engineSide)) {
      toast(t("engine.clearPath"), "error");
      return false;
    }
  } else if (config.mode === "eve") {
    if (!slotPath("black") || !slotPath("white")) {
      toast(t("engine.clearPath"), "error");
      return false;
    }
  }
  return true;
}

function selectedState() {
  return {
    position: game.position,
    selected,
    selectedHand,
    selectedHandColor,
    legalMoves,
    lastMove: game.lastMove,
    flip: Boolean(config.ui?.flip),
    checked: game.position.checked,
    coordinates: Boolean(config.ui?.coordinates),
    editable: editor?.active || false,
  };
}

function render() {
  if (!game) return;
  if (editor?.active) {
    // The editor owns the board rendering while active.
    renderClocks();
    renderStatus();
    renderMoveList();
    return;
  }
  boardView.render(selectedState());
  renderClocks();
  renderStatus();
  renderMoveList();
  renderRecordMeta();
  renderGraph();
  renderButtons();
  renderMini();
  updateModeBadge();
  renderEngineDots();
}

function updateModeBadge() {
  const labels = { pvp: t("mode.pvp"), pve: t("mode.pve"), eve: t("mode.eve") };
  $("#modeBadge").textContent = labels[config.mode] || config.mode;
}

function renderClocks() {
  if (!game) return;
  const snapshot = game.clock.snapshot();
  for (const color of [Color.BLACK, Color.WHITE]) {
    const role = engineRoleFor(color);
    const isEngine = config.mode === "eve" || (config.mode === "pve" && role === config.engineSide);
    const name = isEngine ? (engineName(role) || t("status.engine")) : t("status.human");
    $(`#clock-${color}-name`).textContent = `${colorName(color)} · ${name}`;
    const card = $(`#clock-${color}`);
    const data = snapshot[color];
    card.classList.toggle("active", Boolean(data.active));
    card.classList.toggle("timeout", Boolean(data.timeout));
    const displayMs = data.mainMs > 0 ? data.mainMs : (data.mode === "byoyomi" ? data.byoyomiMs : data.mainMs);
    const showTenths = displayMs <= 10000;
    $(`#clock-${color}-time`).textContent = formatClock(displayMs, showTenths);
    const parts = [];
    if (data.mode === "byoyomi") parts.push(`${t("time.byoyomi")} ${Math.ceil((data.byoyomiMs || 0) / 1000)}s`);
    else if (data.mode === "increment") parts.push(`+${Math.round((data.incrementMs || 0) / 1000)}s`);
    else parts.push(t("time.mainMode"));
    if (data.mainMs <= 0 && data.mode === "byoyomi") parts.unshift(t("time.byoyomiMode"));
    $(`#clock-${color}-sub`).textContent = parts.join(" · ");
  }
}

function renderStatus() {
  if (!game) return;
  let status = "";
  if (game.result) {
    status = t("status.gameOver");
  } else if (!game.isLatest) {
    status = t("status.paused", { ply: game.currentPly });
  } else {
    status = game.currentColor === Color.BLACK ? t("status.blackToMove") : t("status.whiteToMove");
    if (game.position.checked) status += ` · ${t("status.check")}`;
  }
  if (!game.result) {
    const blackState = lastStatuses.black?.state;
    const whiteState = lastStatuses.white?.state;
    if (blackState === "pondering" || whiteState === "pondering") status += ` · ${t("status.pondering")}`;
    else if (blackState === "thinking" || whiteState === "thinking") status += ` · ${t("status.thinking")}`;
    else if (blackState === "starting" || whiteState === "starting") status += ` · ${t("status.starting")}`;
  }
  $("#statusText").textContent = status;
  $("#resultText").textContent = game.result ? resultText(game.result) : "";
}

function resultText(result) {
  if (!result) return "";
  const key = resultLabelKey(result.type);
  const winner = result.winner ? colorName(result.winner) : "";
  const loser = result.loser ? colorName(result.loser) : "";
  if (!result.winner && !result.loser && result.draw) return t(key);
  return t(key, { winner, loser });
}

function renderMoveList() {
  const list = $("#moveList");
  list.replaceChildren();
  if (!game) return;
  const nodes = game.record.moves || [];
  if (!nodes.length) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = t("record.empty");
    list.appendChild(li);
    return;
  }
  for (const node of nodes) {
    if (node.ply <= 0) continue;
    const li = document.createElement("li");
    li.className = node.ply === game.currentPly ? "current" : "";
    li.dataset.ply = String(node.ply);
    const ply = document.createElement("span");
    ply.className = "ply";
    ply.textContent = String(node.ply);
    const notation = document.createElement("span");
    notation.className = "move-notation";
    notation.textContent = node.displayText || node.move?.usi || "";
    li.append(ply, notation);
    li.addEventListener("click", () => {
      engine?.stopAllThinking();
      game.goto(node.ply);
      render();
    });
    list.appendChild(li);
  }
}

function renderRecordMeta() {
  const meta = $("#recordMeta");
  if (!game) return;
  const info = recordMetadata(game.record);
  const lines = [];
  if (info.title) lines.push(info.title);
  if (info.black || info.white) lines.push(`${info.black || "?"} vs ${info.white || "?"}`);
  if (info.date) lines.push(info.date);
  if (info.event) lines.push(info.event);
  meta.textContent = lines.length ? lines.join(" · ") : t("record.noMeta");
}

function renderGraph() {
  if (!graphView || !evalStore || !game) return;
  graphView.render(evalStore.series(game.length), game.length, game.currentPly);
}

function renderAnalysisLines(lines) {
  const box = $("#analysisLines");
  box.replaceChildren();
  const entries = [...(lines || new Map()).entries()].sort((a, b) => a[0] - b[0]);
  if (!entries.length) {
    const p = document.createElement("p");
    p.className = "muted small";
    p.textContent = t("analysis.noLines");
    box.appendChild(p);
    return;
  }
  for (const [rank, info] of entries) {
    const div = document.createElement("div");
    div.className = "analysis-line";
    const rankEl = document.createElement("span");
    rankEl.className = "rank";
    rankEl.textContent = String(rank);
    const scoreEl = document.createElement("span");
    scoreEl.className = "score";
    scoreEl.textContent = formatAnalysisScore(info);
    const pvEl = document.createElement("span");
    pvEl.className = "pv";
    pvEl.textContent = `${info.pv ? pvNotation(game.position, info.pv) : ""}${info.depth ? `  d${info.depth}` : ""}`;
    div.append(rankEl, scoreEl, pvEl);
    box.appendChild(div);
  }
}

function formatAnalysisScore(info) {
  if (!info?.score) return "—";
  if (info.score.type === "mate") {
    return `${info.score.value >= 0 ? "+" : "-"}M${Math.abs(info.score.value)}`;
  }
  const value = info.score.value / 100;
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function renderButtons() {
  const busy = Boolean(batch?.running);
  $("#newGameBtn").disabled = busy;
  $("#undoBtn").disabled = busy || !game.length || !game.isLatest;
  $("#resignBtn").disabled = busy || Boolean(game.result);
  $("#continueBtn").disabled = busy || (game.isLatest && game.autoPlay) || Boolean(game.result);
  $("#editPositionBtn").disabled = busy;
  $("#declareBtn").disabled = busy || Boolean(game.result) || config.jishogiRule === "none";
  $("#impasseBtn").disabled = busy || Boolean(game.result) || config.jishogiRule !== "general24";
  $("#batchStart").disabled = busy;
  $("#batchStop").disabled = !busy;
  $("#analysisStart").disabled = false;
  $("#modeSelect").disabled = busy;
  $("#engineSideSelect").disabled = busy;
  $("#maxMovesInput").disabled = busy;
}

function renderMini() {
  for (const role of ["black", "white", "analysis"]) {
    const el = $(`#engine-mini-${role}`);
    if (!el) continue;
    const status = lastStatuses[role];
    const label = { black: "Black", white: "White", analysis: "Analysis" }[role];
    el.textContent = status?.name
      ? `${label}: ${status.name} (${t(`engine.state.${status.state}`) || status.state})`
      : `${label}: ${t("status.noEngine")}`;
  }
}

function renderEngineDots() {
  for (const role of ["black", "white"]) {
    const dot = $(`#engine-${role}-dot`);
    if (!dot) continue;
    const state = lastStatuses[role]?.state;
    dot.classList.toggle("on", state === "ready");
    dot.classList.toggle("busy", state === "thinking" || state === "pondering");
  }
}

async function refreshStatuses() {
  try {
    lastStatuses = await api.engineStatus();
    await optionsPanel?.refreshStatuses(lastStatuses);
    renderMini();
    renderEngineDots();
    renderClocks();
    renderStatus();
  } catch {
    // The lifecycle watchdog will handle a dead server.
  }
}

function onGameChange() {
  if (!game) return;
  const changedGame = lastGameId !== game.gameId;
  if (changedGame) {
    evalStore.clear();
    analysis?.lines?.clear?.();
    batchResults = batchResults;
  }
  if (game.length < lastLength) evalStore.clearFrom(game.currentPly + 1);
  lastGameId = game.gameId;
  lastLength = game.length;
  selected = null;
  selectedHand = null;
  selectedHandColor = null;
  legalMoves = [];
  render();
  engine?.onGameChange();
  analysis?.onPositionChange();
}

function setupBoard() {
  boardView = new BoardView(
    {
      board: $("#board"),
      blackHand: $("#blackHand"),
      whiteHand: $("#whiteHand"),
      coordinates: config.ui?.coordinates,
    },
    {
      onSquare: (square) => handleSquare(square),
      onHand: (color, type) => handleHand(color, type),
    },
  );
}

function handleSquare(square) {
  if (editor?.active) {
    editor.onSquare(square);
    return;
  }
  if (batch?.running) return;
  if (game.result) { toast(t("toast.gameOver")); return; }
  if (game.isEngineTurn()) return;

  if (selectedHand) {
    const move = game.position.createMove(selectedHand, square);
    if (move && game.position.isValidMove(move)) {
      selectedHand = null;
      selectedHandColor = null;
      legalMoves = [];
      const result = game.playMove(move);
      if (!result.ok) toast(t("toast.illegalMove"), "error");
      render();
    } else {
      selectedHand = null;
      selectedHandColor = null;
      legalMoves = [];
      render();
    }
    return;
  }

  if (selected) {
    const target = legalMoves.find((move) => move.to.equals(square));
    if (target) {
      const choices = game.moveChoices(selected, square);
      const apply = async (choice) => {
        selected = null;
        legalMoves = [];
        const result = game.playMove(choice);
        if (!result.ok) toast(t("toast.illegalMove"), "error");
        render();
      };
      if (choices.length === 1) apply(choices[0]);
      else if (choices.length > 1) promotionDialog(choices).then((choice) => { if (choice) apply(choice); });
      return;
    }
    if (game.position.board.at(square)?.color === game.currentColor) {
      selected = square;
      legalMoves = game.legalMovesFrom(square);
      render();
      return;
    }
    selected = null;
    legalMoves = [];
    render();
    return;
  }

  const piece = game.position.board.at(square);
  if (piece && piece.color === game.currentColor) {
    selected = square;
    legalMoves = game.legalMovesFrom(square);
    render();
  } else {
    selected = null;
    legalMoves = [];
    render();
  }
}

function handleHand(color, type) {
  if (editor?.active || game.result || game.isEngineTurn() || color !== game.currentColor) return;
  if (selectedHand === type && selectedHandColor === color) {
    selectedHand = null;
    selectedHandColor = null;
    legalMoves = [];
  } else {
    selected = null;
    selectedHand = type;
    selectedHandColor = color;
    legalMoves = game.legalDrops(type);
  }
  render();
}

function setupTimeControls() {
  const table = $("#timeTable");
  for (const row of table.querySelectorAll(".time-row")) row.remove();
  for (const color of [Color.BLACK, Color.WHITE]) {
    const row = document.createElement("div");
    row.className = "time-row";
    row.dataset.side = color;
    row.innerHTML = `
      <span class="side-label">${colorName(color)}</span>
      <input type="number" class="tc-main" min="0" max="360" step="0.5" aria-label="main minutes">
      <input type="number" class="tc-byoyomi" min="0" max="60" step="1" aria-label="byoyomi seconds">
      <input type="number" class="tc-increment" min="0" max="60" step="1" aria-label="increment seconds">
      <select class="tc-mode">
        <option value="byoyomi">${t("time.byoyomiMode")}</option>
        <option value="increment">${t("time.incrementMode")}</option>
        <option value="main">${t("time.mainMode")}</option>
      </select>`;
    const main = row.querySelector(".tc-main");
    const byoyomi = row.querySelector(".tc-byoyomi");
    const increment = row.querySelector(".tc-increment");
    const mode = row.querySelector(".tc-mode");
    const sync = () => {
      const tc = config.timeControl[color];
      main.value = String((tc.mainMs || 0) / 60000);
      byoyomi.value = String((tc.byoyomiMs || 0) / 1000);
      increment.value = String((tc.incrementMs || 0) / 1000);
      mode.value = tc.byoyomiMs > 0 ? "byoyomi" : tc.incrementMs > 0 ? "increment" : "main";
    };
    const commit = () => {
      const modeValue = mode.value;
      const mainMs = Math.max(0, Math.round(Number(main.value || 0) * 60000));
      const byoyomiMs = modeValue === "byoyomi" ? Math.max(0, Math.round(Number(byoyomi.value || 0) * 1000)) : 0;
      const incrementMs = modeValue === "increment" ? Math.max(0, Math.round(Number(increment.value || 0) * 1000)) : 0;
      config.timeControl[color] = { mainMs, byoyomiMs, incrementMs };
      game.setTimeControl(config.timeControl);
      persistConfig();
      sync();
    };
    main.addEventListener("change", commit);
    byoyomi.addEventListener("change", commit);
    increment.addEventListener("change", commit);
    mode.addEventListener("change", () => {
      if (mode.value === "byoyomi" && Number(byoyomi.value) <= 0) byoyomi.value = "10";
      if (mode.value === "increment" && Number(increment.value) <= 0) increment.value = "5";
      commit();
    });
    row._sync = sync;
    table.appendChild(row);
  }
  syncTimeControls();
}

function syncTimeControls() {
  for (const row of $$(".time-row")) row._sync?.();
}

function syncSettings() {
  $("#modeSelect").value = config.mode;
  $("#engineSideSelect").value = config.engineSide;
  $("#maxMovesInput").value = String(config.maxMoves);
  $("#jishogiSelect").value = config.jishogiRule;
  $("#coordinatesToggle").checked = Boolean(config.ui?.coordinates);
  $("#analysisMultiPV").value = String(config.analysis?.multipv ?? 3);
  $("#analysisScanMs").value = String(config.analysis?.scanMs ?? 500);
  $("#batchGames").value = String(config.batch?.games ?? 10);
  $("#batchSwap").checked = config.batch?.swapColors !== false;
  $("#batchSfens").value = (config.batch?.startSfens || []).join("\n");
  $("#analysisAuto").checked = true;
}

function newGame() {
  if (batch?.running) return;
  if (!validateModeForNewGame()) return;
  engine?.stopAllThinking();
  game.setMode(config.mode, config.engineSide);
  game.setTimeControl(config.timeControl);
  game.setMaxMoves(config.maxMoves);
  game.setJishogiRule(config.jishogiRule);
  game.newGame({ autoPlay: true });
  if (game.mode === "eve") engine?.setDisabled(false);
  render();
}

function undo() {
  if (batch?.running) return;
  engine?.stopAllThinking();
  if (!game.length) return;
  game.undo();
  if (config.mode === "pve") {
    while (game.currentPly > 0 && game.isEngineTurn()) game.undo();
  }
  game.autoPlay = config.mode !== "eve";
  render();
  engine?.onGameChange();
}

function flip() {
  config.ui.flip = !config.ui.flip;
  persistConfig();
  render();
}

function quit() {
  toast(t("toast.quit"));
  api.quit().catch(() => {});
}

function setupEditor() {
  editor = new PositionEditor({
    elements: {
      toolbar: $("#editorToolbar"),
      palette: $("#editorPalette"),
      hands: $("#editorHands"),
      error: $("#editorError"),
      sfen: $("#editorSfen"),
      promote: $("#editorPromote"),
      standard: $("#editorStandard"),
      clear: $("#editorClear"),
      cancel: $("#editorCancel"),
      apply: $("#editorApply"),
      loadSfen: $("#editorLoadSfen"),
      copySfen: $("#editorCopySfen"),
    },
    game,
    getFlip: () => Boolean(config.ui?.flip),
    onRender: (state) => boardView.render(state),
    onClose: () => render(),
  });
}

async function importKifu(file) {
  try {
    const text = await readFileAsText(file);
    const format = detectFormat(file.name, text);
    if (format === "sfen") {
      if (!game.applySfen(text.trim())) throw new Error("invalid sfen");
    } else {
      const record = parseRecordText(text, format);
      engine?.stopAllThinking();
      game.applyRecord(record);
      evalStore.clear();
    }
    toast(t("record.imported"), "ok");
    render();
  } catch (err) {
    toast(t("toast.importError", { message: err.message }), "error");
  }
}

async function doExport() {
  const format = $("#exportFormat").value;
  const encoding = format === "sfen" ? "utf-8" : $("#exportEncoding").value;
  const ext = format === "sfen" ? "sfen" : format;
  const stamp = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const filename = `kisshogi-${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}.${ext}`;
  try {
    await exportRecord(game.record, format, encoding, filename);
    toast(t("record.exported"), "ok");
  } catch (err) {
    toast(t("toast.exportError", { message: err.message }), "error");
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast(t("toast.copyOk"), "ok");
  } catch {
    toast(t("record.copyError"), "error");
  }
}

function batchCsv() {
  const rows = [["game", "black", "white", "winner", "reason", "moves", "start_sfen", "elapsed_ms"]];
  for (const r of batchResults) rows.push([r.index, r.black, r.white, r.winner, r.reason, r.moves, r.sfen, r.elapsedMs]);
  const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  downloadText(csv, "kisshogi-batch.csv", { bom: true });
}

function renderBatch() {
  const box = $("#batchResults");
  box.replaceChildren();
  if (!batchResults.length) return;
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>#</th><th>Black</th><th>White</th><th>Result</th><th>Moves</th></tr></thead><tbody></tbody>";
  const tbody = table.querySelector("tbody");
  for (const r of batchResults) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.index}</td><td>${r.black}</td><td>${r.white}</td><td>${r.winner} (${r.reason})</td><td>${r.moves}</td>`;
    tbody.appendChild(tr);
  }
  box.appendChild(table);
  const aName = batchResults[0]?.engineA || "A";
  const bName = batchResults[0]?.engineB || "B";
  let aWins = 0, bWins = 0, draws = 0;
  for (const r of batchResults) {
    if (r.winner === "draw") draws += 1;
    else if (r.winnerColor && r.aColor && r.winnerColor === r.aColor) aWins += 1;
    else if (r.winnerColor) bWins += 1;
  }
  const summary = document.createElement("p");
  summary.className = "muted small";
  summary.textContent = t("batch.summary", { a: aName, aw: aWins, b: bName, bw: bWins, draws });
  box.appendChild(summary);
}

async function startBatch() {
  if (batch?.running) return;
  if (!slotPath("black") || !slotPath("white")) {
    toast(t("engine.clearPath"), "error");
    return;
  }
  analysis?.stop();
  engine?.setDisabled(true);
  engine?.stopAllThinking();
  batchResults = [];
  config.batch = {
    games: Math.max(1, Math.min(1000, Number($("#batchGames").value) || 10)),
    swapColors: $("#batchSwap").checked,
    startSfens: $("#batchSfens").value.split("\n").map((s) => s.trim()).filter(Boolean),
  };
  persistConfig();
  await batch.start({
    games: config.batch.games,
    swapColors: config.batch.swapColors,
    startSfens: config.batch.startSfens,
  });
}

function buildLanguageSelect() {
  const select = $("#languageSelect");
  select.replaceChildren();
  for (const lang of LANGUAGES) {
    const option = document.createElement("option");
    option.value = lang.id;
    option.textContent = t(lang.labelKey);
    select.appendChild(option);
  }
  select.value = config.language || "auto";
}

async function changeLanguage(value) {
  config.language = value;
  persistConfig();
  await loadLocale(value === "auto" ? "auto" : value);
  applyStaticTranslations();
  buildLanguageSelect();
  setupTimeControls();
  syncSettings();
  render();
  toast(`${t("language.label")}: ${value === "auto" ? t("language.auto") : value}`);
}

function bindUi() {
  $("#languageSelect").addEventListener("change", (event) => changeLanguage(event.target.value));
  for (const tab of $$(".tab")) {
    tab.addEventListener("click", () => {
      for (const el of $$(".tab")) el.classList.toggle("active", el === tab);
      for (const panel of $$(".panel")) panel.classList.toggle("active", panel.dataset.panel === tab.dataset.tab);
      if (tab.dataset.tab === "settings") refreshStatuses();
      if (tab.dataset.tab === "analysis") renderGraph();
    });
  }
  $("#modeSelect").addEventListener("change", (event) => {
    config.mode = event.target.value;
    game.setMode(config.mode, config.engineSide);
    persistConfig();
    render();
  });
  $("#engineSideSelect").addEventListener("change", (event) => {
    config.engineSide = event.target.value;
    game.setMode(config.mode, config.engineSide);
    persistConfig();
    render();
  });
  $("#syncTimes").addEventListener("click", () => {
    config.timeControl.white = { ...config.timeControl.black };
    game.setTimeControl(config.timeControl);
    syncTimeControls();
    persistConfig();
  });
  $("#maxMovesInput").addEventListener("change", (event) => {
    config.maxMoves = Math.max(0, Math.min(10000, Number(event.target.value) || 0));
    game.setMaxMoves(config.maxMoves);
    persistConfig();
  });
  $("#jishogiSelect").addEventListener("change", (event) => {
    config.jishogiRule = event.target.value;
    game.setJishogiRule(config.jishogiRule);
    persistConfig();
    render();
  });
  $("#newGameBtn").addEventListener("click", newGame);
  $("#undoBtn").addEventListener("click", undo);
  $("#resignBtn").addEventListener("click", () => { engine?.stopAllThinking(); game.resign(); render(); });
  $("#flipBtn").addEventListener("click", flip);
  $("#continueBtn").addEventListener("click", () => { engine?.stopAllThinking(); game.continueGame(); render(); engine?.onGameChange(); });
  $("#editPositionBtn").addEventListener("click", () => { engine?.stopAllThinking(); editor.open(); });
  $("#declareBtn").addEventListener("click", async () => {
    if (game.result) return;
    const points = declarationPoints(game.position, game.currentColor);
    const ok = await confirmDialog(t("game.declare"), `${t("color.black")}/${t("color.white")} ${t("game.declare")} — ${points} pt\n${t("editor.clearConfirm")}`);
    if (ok) { game.declareJishogi(); render(); }
  });
  $("#impasseBtn").addEventListener("click", () => {
    const info = game.evaluateImpasse();
    const lines = info.ok
      ? [`Black: ${info.black}`, `White: ${info.white}`]
      : [`Black: ${info.black ?? "-"}`, `White: ${info.white ?? "-"}`, info.reason || ""];
    if (!info.ok) { infoDialog(t("game.impasse"), lines); return; }
    confirmDialog(t("game.impasse"), lines.join("\n")).then((ok) => {
      if (ok) { game.applyImpasse(); render(); }
    });
  });
  $("#quitButton").addEventListener("click", quit);
  $("#quitButton2").addEventListener("click", quit);
  $("#coordinatesToggle").addEventListener("change", (event) => {
    config.ui.coordinates = event.target.checked;
    persistConfig();
    render();
  });
  $("#kifuFile").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importKifu(file);
    event.target.value = "";
  });
  $("#exportBtn").addEventListener("click", doExport);
  $("#exportFormat").addEventListener("change", () => {
    $("#exportEncoding").disabled = $("#exportFormat").value === "sfen";
  });
  $("#copySfenBtn").addEventListener("click", () => copyText(game.position.sfen));
  $("#copyUsiBtn").addEventListener("click", () => copyText(game.record.getUSI()));
  $("#analysisStart").addEventListener("click", () => analysis.start());
  $("#analysisStop").addEventListener("click", () => analysis.stop());
  $("#analysisAuto").addEventListener("change", (event) => analysis.setFollow(event.target.checked));
  $("#analysisMultiPV").addEventListener("change", (event) => {
    config.analysis.multipv = Math.max(1, Math.min(8, Number(event.target.value) || 3));
    persistConfig();
    analysis.stop();
  });
  $("#analysisScanMs").addEventListener("change", (event) => {
    config.analysis.scanMs = Math.max(100, Math.min(5000, Number(event.target.value) || 500));
    persistConfig();
  });
  $("#analyzeGameBtn").addEventListener("click", () => analysis.scanGame());
  $("#analyzeGameStop").addEventListener("click", () => analysis.stopScan());
  $("#batchStart").addEventListener("click", startBatch);
  $("#batchStop").addEventListener("click", () => {
    game.autoPlay = false;
    batch?.stop();
    renderButtons();
  });
  $("#batchCsv").addEventListener("click", batchCsv);

  window.addEventListener("pagehide", (event) => {
    if (event.persisted) return;
    try {
      fetch("/api/pagehide", {
        method: "POST",
        headers: { "X-Kisshogi-Token": token, "Content-Type": "application/json" },
        body: "{}",
        keepalive: true,
      }).catch(() => {});
    } catch { /* ignore */ }
  });
  setInterval(() => {
    api.heartbeat().then(() => { heartbeatFailures = 0; }).catch(() => {
      heartbeatFailures += 1;
      if (heartbeatFailures === 1) toast(t("toast.connectionLost"), "error");
    });
  }, 5000);
  setInterval(() => {
    if (!game || game.result) return;
    game.onClockTimeout();
    renderClocks();
    if (game.result) { render(); engine?.onGameChange(); }
  }, 100);
  setInterval(refreshStatuses, 2500);
}

async function init() {
  config = await api.config();
  config.ui ||= { flip: false, coordinates: true };
  config.analysis ||= { multipv: 3, scanMs: 500 };
  config.batch ||= { games: 10, swapColors: true, startSfens: [] };
  await loadLocale(config.language || "auto");
  applyStaticTranslations();
  game = new GameController({
    timeControl: config.timeControl,
    maxMoves: config.maxMoves,
    jishogiRule: config.jishogiRule,
  });
  game.mode = config.mode;
  game.engineSide = config.engineSide;
  game.autoPlay = false;
  evalStore = new EvalStore();
  setupBoard();
  setupEditor();
  graphView = new GraphView($("#evalGraph"), (ply) => { game.goto(ply); render(); });
  engine = new EngineController({
    game,
    getConfig: () => config,
    onStatus: (role, status) => {
      if (role && status) lastStatuses = { ...lastStatuses, [role]: status };
      renderMini();
      renderEngineDots();
      renderStatus();
    },
    onError: (message) => toast(t("toast.engineError", { message }), "error"),
    onEval: (info, ply, sfen, source) => {
      if (!info?.score) return;
      evalStore.record(ply, info.score, sfen, source, info.depth);
      renderGraph();
    },
    onPonder: () => renderStatus(),
  });
  analysis = new AnalysisController({
    game,
    getConfig: () => config,
    onLines: (lines) => renderAnalysisLines(lines),
    onStatus: (status) => {
      $("#analysisStatus").textContent = status?.state ? (t(`engine.state.${status.state}`) || status.state) : "";
      if (status?.error) $("#analysisStatus").textContent = status.error;
    },
    onEval: (info, ply, sfen, source) => {
      if (!info?.score) return;
      evalStore.record(ply, info.score, sfen, source, info.depth);
      renderGraph();
    },
    onScanProgress: (current, total) => {
      $("#analyzeGameProgress").textContent = current < total ? t("analysis.scanning", { current, total }) : t("analysis.done");
    },
  });
  analysis.follow = true;
  batch = new BatchRunner({
    game,
    getConfig: () => config,
    onProgress: (current, total, phase) => {
      $("#batchProgress").textContent = phase === "playing"
        ? t("batch.progress", { current, total })
        : phase === "starting" ? t("batch.progress", { current, total }) : "";
    },
    onGameResult: (record, results) => {
      batchResults = results;
      renderBatch();
    },
    onStatus: (status) => {
      if (!status.running) {
        engine.setDisabled(false);
        setTimeout(() => engine.onGameChange(), 100);
      }
      renderButtons();
    },
    onError: (message) => {
      toast(t("toast.engineError", { message }), "error");
      engine.setDisabled(false);
      renderButtons();
    },
  });
  optionsPanel = new EngineOptionsPanel({
    container: $("#engineCards"),
    getConfig: () => config,
    persist: persistConfig,
    onStatusChanged: () => {},
  });
  setupTimeControls();
  syncSettings();
  buildLanguageSelect();
  bindUi();
  game.subscribe(onGameChange);
  lastGameId = game.gameId;
  lastLength = game.length;
  render();
  await refreshStatuses();
  renderBatch();
  initialized = true;
  api.nativeReady().catch(() => {});
  // Local UI tests need a stable handle on the controllers.  Keep it opt-in
  // so a normal launch exposes no debug surface.
  if (new URLSearchParams(window.location.search).has("debug")) {
    window.__kisshogiDebug = {
      get engine() { return engine; },
      get game() { return game; },
      get config() { return config; },
    };
  }
}

init().catch((err) => {
  console.error(err);
  toast(`Kisshogi failed to start: ${err.message}`, "error");
});
