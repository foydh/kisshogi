import test from "node:test";
import assert from "node:assert/strict";
import {
  Color, Piece, PieceType, Square, InitialPositionSFEN, Position,
  allLegalMoves, createMoveChoices, hasAnyLegalMove, newRecord,
  parseSfen, pvNotation, judgeDeclaration, judgeImpasse, kingsInEnemyCamp,
  JishogiDeclarationRule, JishogiDeclarationResult,
} from "../../src/kisshogi/web/js/shogi.js";
import { GameController } from "../../src/kisshogi/web/js/game-controller.js";

test("standard position has 30 legal moves", () => {
  const p = Position.newBySFEN(InitialPositionSFEN.STANDARD);
  assert.equal(allLegalMoves(p).length, 30);
});

test("play and undo", () => {
  const g = new GameController();
  g.newGame();
  const m = g.position.createMoveByUSI("7g7f");
  assert.equal(g.playMove(m).ok, true);
  assert.equal(g.length, 1);
  assert.equal(g.currentColor, Color.WHITE);
  assert.equal(g.record.getUSI(), "position startpos moves 7g7f");
  g.undo();
  assert.equal(g.length, 0);
  assert.equal(g.currentColor, Color.BLACK);
});

test("illegal move rejected", () => {
  const g = new GameController();
  g.newGame();
  const m = g.position.createMoveByUSI("7g7e");
  assert.ok(m);
  assert.equal(g.playMove(m).ok, false);
});

test("move choices respect forced promotion", () => {
  const p = Position.newBySFEN("5k3/4P4/9/9/9/9/9/9/4K4 b - 1");
  const from = Square.newByUSI("5b");
  const to = Square.newByUSI("5a");
  const choices = createMoveChoices(p, from, to);
  assert.equal(choices.length, 1);
  assert.equal(choices[0].promote, true);
});

test("checkmate detection", () => {
  const sfen = "4k4/4G4/9/9/9/9/9/9/K3R4 w - 1";
  const p = Position.newBySFEN(sfen);
  assert.equal(p.checked, true);
  assert.equal(hasAnyLegalMove(p), false);
  const g = new GameController();
  g.applySfen(sfen);
  assert.equal(g.checkGameEnd(), true);
  assert.equal(g.result.type, "checkmate");
  assert.equal(g.result.winner, Color.BLACK);
});

test("jishogi helpers reject non-entered kings", () => {
  const p = Position.newBySFEN(InitialPositionSFEN.STANDARD);
  assert.equal(kingsInEnemyCamp(p), false);
  const info = judgeImpasse(p);
  assert.equal(info.ok, false);
  assert.equal(info.reason, "kings_not_entered");
  const decl = judgeDeclaration(JishogiDeclarationRule.GENERAL24, p, Color.BLACK);
  assert.equal(decl, JishogiDeclarationResult.LOSE);
});

test("pv notation does not throw", () => {
  const p = Position.newBySFEN(InitialPositionSFEN.STANDARD);
  assert.ok(pvNotation(p, ["7g7f", "3c3d"]).length > 0);
});

test("sfen parse", () => {
  assert.ok(parseSfen(InitialPositionSFEN.STANDARD));
  assert.equal(parseSfen("bad"), null);
});


function put(position, usi, color, type) {
  position.board.set(Square.newByUSI(usi), new Piece(color, type));
}

test("jishogi declaration win and draw thresholds", () => {
  const p = Position.newBySFEN("9/9/9/9/9/9/9/9/9 b - 1");
  put(p, "5a", Color.BLACK, PieceType.KING);
  put(p, "5i", Color.WHITE, PieceType.KING);
  // 10 invading pieces: 2 rooks + 2 bishops + 6 golds = 26 points.
  const squares = ["1a", "2a", "3a", "4a", "6a", "7a", "8a", "9a", "1b", "2b"];
  const types = [PieceType.ROOK, PieceType.ROOK, PieceType.BISHOP, PieceType.BISHOP,
    PieceType.GOLD, PieceType.GOLD, PieceType.GOLD, PieceType.GOLD, PieceType.GOLD, PieceType.GOLD];
  squares.forEach((sq, i) => put(p, sq, Color.BLACK, types[i]));
  assert.equal(judgeDeclaration(JishogiDeclarationRule.GENERAL24, p, Color.BLACK),
    JishogiDeclarationResult.DRAW);
  assert.equal(judgeDeclaration(JishogiDeclarationRule.GENERAL27, p, Color.BLACK),
    JishogiDeclarationResult.LOSE);
  p.hand(Color.BLACK).set(PieceType.ROOK, 1);
  p.hand(Color.BLACK).set(PieceType.PAWN, 3);
  assert.equal(judgeDeclaration(JishogiDeclarationRule.GENERAL24, p, Color.BLACK),
    JishogiDeclarationResult.WIN);
  assert.equal(judgeDeclaration(JishogiDeclarationRule.GENERAL27, p, Color.BLACK),
    JishogiDeclarationResult.WIN);
});

test("jishogi points require both kings to enter", () => {
  const p = Position.newBySFEN(InitialPositionSFEN.STANDARD);
  assert.equal(judgeImpasse(p).ok, false);
});

test("jishogi points draw when both sides have 24+", () => {
  const p = Position.newBySFEN("9/9/9/9/9/9/9/9/9 b - 1");
  put(p, "5a", Color.BLACK, PieceType.KING);
  put(p, "5i", Color.WHITE, PieceType.KING);
  for (const [sq, color] of [["1a", Color.BLACK], ["2a", Color.BLACK], ["3a", Color.BLACK],
    ["1i", Color.WHITE], ["2i", Color.WHITE], ["3i", Color.WHITE]]) {
    put(p, sq, color, PieceType.ROOK);
  }
  // 15 points each from rooks; add two bishops (10) to each side.
  for (const [sq, color] of [["4a", Color.BLACK], ["6a", Color.BLACK],
    ["4i", Color.WHITE], ["6i", Color.WHITE]]) {
    put(p, sq, color, PieceType.BISHOP);
  }
  p.hand(Color.BLACK).set(PieceType.PAWN, 4);
  p.hand(Color.WHITE).set(PieceType.PAWN, 4);
  assert.equal(kingsInEnemyCamp(p), true);
  const info = judgeImpasse(p);
  assert.equal(info.ok, true);
  assert.equal(info.result, "draw");
});
