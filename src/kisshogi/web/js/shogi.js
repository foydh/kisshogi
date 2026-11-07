// Thin adapter around the vendored tsshogi library.
// Keep every tsshogi-specific detail in this file.

import {
  Color,
  InitialPositionSFEN,
  InitialPositionType,
  Move,
  Piece,
  PieceType,
  Position,
  Record,
  RecordMetadataKey,
  SpecialMoveType,
  Square,
  JishogiDeclarationResult,
  JishogiDeclarationRule,
  countJishogiDeclarationPoint,
  countJishogiPoint,
  exportCSA,
  exportKIF,
  exportKI2,
  formatMove,
  formatPV,
  importCSA,
  importKIF,
  importKI2,
  isPromotableRank,
  isPromotable,
  judgeJishogiDeclaration,
  promotedPieceType,
  pieceTypes,
  handPieceTypes,
  specialMove,
  unpromotedPieceType,
} from "../vendor/tsshogi/index.mjs";

export {
  Color,
  InitialPositionSFEN,
  InitialPositionType,
  JishogiDeclarationResult,
  JishogiDeclarationRule,
  Move,
  Piece,
  PieceType,
  Position,
  Record,
  RecordMetadataKey,
  SpecialMoveType,
  Square,
  countJishogiDeclarationPoint,
  countJishogiPoint,
  exportCSA,
  exportKIF,
  exportKI2,
  formatMove,
  formatPV,
  importCSA,
  importKIF,
  importKI2,
  isPromotableRank,
  isPromotable,
  judgeJishogiDeclaration,
  promotedPieceType,
  pieceTypes,
  handPieceTypes,
  specialMove,
  unpromotedPieceType,
};

const legalMoveCache = new Map();

function cacheSet(key, value) {
  if (legalMoveCache.size > 80) legalMoveCache.clear();
  legalMoveCache.set(key, value);
}

// Brute-force enumeration is fast enough for a GUI (about 1ms per position)
// and guarantees that tsshogi remains the single source of truth for legality.
export function allLegalMoves(position) {
  const key = position.sfen;
  const cached = legalMoveCache.get(key);
  if (cached) return cached;
  const moves = [];
  const color = position.color;
  for (const from of Square.all) {
    const piece = position.board.at(from);
    if (!piece || piece.color !== color) continue;
    for (const to of Square.all) {
      const base = position.createMove(from, to);
      if (!base) continue;
      if (position.isValidMove(base)) moves.push(base);
      const promoted = base.withPromote();
      if (promoted && !promoted.equals(base) && position.isValidMove(promoted)) {
        moves.push(promoted);
      }
    }
  }
  for (const pieceType of handPieceTypes) {
    if (position.hand(color).count(pieceType) <= 0) continue;
    for (const to of Square.all) {
      if (position.board.at(to)) continue;
      const move = position.createMove(pieceType, to);
      if (move && position.isValidMove(move)) moves.push(move);
    }
  }
  cacheSet(key, moves);
  return moves;
}

export function hasAnyLegalMove(position) {
  return allLegalMoves(position).length > 0;
}

export function legalMovesFrom(position, from) {
  return allLegalMoves(position).filter((move) => move.from instanceof Square && move.from.equals(from));
}

export function legalDrops(position, pieceType) {
  return allLegalMoves(position).filter(
    (move) => !(move.from instanceof Square) && move.pieceType === pieceType,
  );
}

export function createMoveChoices(position, from, to) {
  const base = position.createMove(from, to);
  if (!base) return [];
  const choices = [];
  if (position.isValidMove(base)) choices.push(base);
  if (base.pieceType === PieceType.PAWN || base.pieceType === PieceType.LANCE ||
      base.pieceType === PieceType.KNIGHT || base.pieceType === PieceType.SILVER ||
      base.pieceType === PieceType.BISHOP || base.pieceType === PieceType.ROOK) {
    const promoted = base.withPromote();
    if (promoted && position.isValidMove(promoted)) choices.push(promoted);
  }
  return choices;
}

export function parseSfen(sfen) {
  const text = String(sfen || "").trim();
  if (!text) return null;
  return Position.newBySFEN(text);
}

export function standardSfen() {
  return InitialPositionSFEN.STANDARD;
}

export function newRecord(sfen = InitialPositionSFEN.STANDARD) {
  const position = Position.newBySFEN(sfen);
  if (!position) return null;
  return new Record(position);
}

export function parseUsiMove(position, usi) {
  return position.createMoveByUSI(usi);
}

export function moveToUsi(move) {
  return move.usi;
}

export function specialUsi(type) {
  return type;
}

export function recordUsi(record) {
  return record.getUSI();
}

export function notation(position, move) {
  try {
    return formatMove(position, move);
  } catch {
    return move.usi;
  }
}

export function pvNotation(position, usiList) {
  let p = position.clone();
  const moves = [];
  for (const usi of usiList || []) {
    const move = p.createMoveByUSI(usi);
    if (!move || !p.isValidMove(move)) break;
    moves.push(move);
    p.doMove(move, { ignoreValidation: true });
  }
  try {
    return formatPV(position, moves);
  } catch {
    return (usiList || []).join(" ");
  }
}

// -- position editor -------------------------------------------------

const STANDARD_LIMITS = {
  [PieceType.PAWN]: 18,
  [PieceType.LANCE]: 4,
  [PieceType.KNIGHT]: 4,
  [PieceType.SILVER]: 4,
  [PieceType.GOLD]: 4,
  [PieceType.BISHOP]: 2,
  [PieceType.ROOK]: 2,
};

export function baseType(type) {
  return unpromotedPieceType(type);
}

export function validateEditorPosition(position) {
  const kings = { black: 0, white: 0 };
  const counts = { black: {}, white: {} };
  const pawnFiles = { black: new Set(), white: new Set() };
  for (const color of [Color.BLACK, Color.WHITE]) {
    for (const type of Object.values(PieceType)) counts[color][type] = 0;
  }
  for (const square of Square.all) {
    const piece = position.board.at(square);
    if (!piece) continue;
    if (piece.type === PieceType.KING) kings[piece.color] += 1;
    const base = unpromotedPieceType(piece.type);
    counts[piece.color][piece.type] = (counts[piece.color][piece.type] || 0) + 1;
    if (base === PieceType.PAWN && piece.type === PieceType.PAWN) {
      if (pawnFiles[piece.color].has(square.file)) {
        return { ok: false, reason: "nifu", color: piece.color, square };
      }
      pawnFiles[piece.color].add(square.file);
    }
    const last = piece.color === Color.BLACK ? 1 : 9;
    const knightZone = piece.color === Color.BLACK ? [1, 2] : [8, 9];
    if ((base === PieceType.PAWN || base === PieceType.LANCE) && square.rank === last) {
      return { ok: false, reason: "dead_piece", color: piece.color, square };
    }
    if (base === PieceType.KNIGHT && knightZone.includes(square.rank)) {
      return { ok: false, reason: "dead_piece", color: piece.color, square };
    }
  }
  for (const color of [Color.BLACK, Color.WHITE]) {
    if (kings[color] !== 1) return { ok: false, reason: "king_count", color };
    const hand = position.hand(color);
    for (const type of handPieceTypes) {
      const n = hand.count(type);
      if (n < 0) return { ok: false, reason: "invalid_hand", color };
      counts[color][type] = (counts[color][type] || 0) + n;
    }
    for (const [type, limit] of Object.entries(STANDARD_LIMITS)) {
      const total = Object.entries(counts[color])
        .filter(([t]) => unpromotedPieceType(t) === type)
        .reduce((sum, [, n]) => sum + n, 0);
      if (total > limit) return { ok: false, reason: "too_many_pieces", color, type };
    }
  }
  return { ok: true };
}

export function setBoardPiece(position, square, color, type) {
  if (!color || !type) {
    position.board.remove(square);
  } else {
    position.board.set(square, new Piece(color, type));
  }
}

export function setHandCount(position, color, type, count) {
  position.hand(color).set(type, Math.max(0, Math.min(18, count)));
}

// -- jishogi ---------------------------------------------------------

export function enemyCamp(color, square) {
  return isPromotableRank(color, square.rank);
}

export function kingsInEnemyCamp(position) {
  const blackKing = position.board.findKing(Color.BLACK);
  const whiteKing = position.board.findKing(Color.WHITE);
  return Boolean(
    blackKing && whiteKing &&
    enemyCamp(Color.BLACK, blackKing) &&
    enemyCamp(Color.WHITE, whiteKing),
  );
}

export function declarationInfo(position, color) {
  const result = judgeJishogiDeclaration(
    JishogiDeclarationRule.GENERAL27,
    position,
    color,
  );
  return {
    general24: judgeJishogiDeclaration(JishogiDeclarationRule.GENERAL24, position, color),
    general27: result,
    points24: countJishogiDeclarationPoint(position, color),
    kingInCamp: (() => {
      const king = position.board.findKing(color);
      return Boolean(king && enemyCamp(color, king));
    })(),
    checked: position.checked,
    invading: allLegalMoves(position).filter(() => true).length, // placeholder; replaced below
  };
}

export function declarationPoints(position, color) {
  return countJishogiDeclarationPoint(position, color);
}

export function impassePoints(position, color) {
  return countJishogiPoint(position, color);
}

export function judgeDeclaration(rule, position, color) {
  return judgeJishogiDeclaration(rule, position, color);
}

export function judgeImpasse(position) {
  const bothEntered = kingsInEnemyCamp(position);
  const black = countJishogiPoint(position, Color.BLACK);
  const white = countJishogiPoint(position, Color.WHITE);
  if (!bothEntered) return { ok: false, reason: "kings_not_entered", black, white };
  if (black >= 24 && white >= 24) return { ok: true, result: "draw", black, white };
  if (black >= 24 && white < 24) return { ok: true, result: "black", black, white };
  if (white >= 24 && black < 24) return { ok: true, result: "white", black, white };
  return { ok: false, reason: "below_24", black, white };
}

// -- game end helpers ------------------------------------------------

export function resultFromSpecial(move) {
  if (!move || !move.type) return null;
  switch (move.type) {
    case SpecialMoveType.RESIGN:
      return { type: "resign", winner: null, loserFromTurn: true };
    case SpecialMoveType.TIMEOUT:
      return { type: "timeout", winner: null, loserFromTurn: true };
    case SpecialMoveType.MATE:
      return { type: "checkmate", winner: null, loserFromTurn: true };
    case SpecialMoveType.REPETITION_DRAW:
      return { type: "repetition", winner: null, draw: true };
    case SpecialMoveType.DRAW:
      return { type: "draw", winner: null, draw: true };
    case SpecialMoveType.FOUL_LOSE:
      return { type: "foul", winner: null, loserFromTurn: true };
    case SpecialMoveType.FOUL_WIN:
      return { type: "foul", winner: null, winnerFromTurn: true };
    case SpecialMoveType.MAX_MOVES:
      return { type: "max-moves", winner: null, draw: true };
    case SpecialMoveType.ENTERING_OF_KING:
      return { type: "declaration", winner: null, winnerFromTurn: true };
    case SpecialMoveType.WIN_BY_DEFAULT:
      return { type: "declaration", winner: null, winnerFromTurn: true };
    default:
      return { type: "special", winner: null, draw: true };
  }
}

export function specialMoveType(type) {
  return specialMove(type);
}

export function opposite(color) {
  return color === Color.BLACK ? Color.WHITE : Color.BLACK;
}
