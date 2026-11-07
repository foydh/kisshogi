// Plain-DOM board and hand renderer.

import {
  Color,
  PieceType,
  Square,
  handPieceTypes,
} from "./shogi.js";

const GLYPHS = {
  [PieceType.PAWN]: "歩",
  [PieceType.LANCE]: "香",
  [PieceType.KNIGHT]: "桂",
  [PieceType.SILVER]: "銀",
  [PieceType.GOLD]: "金",
  [PieceType.BISHOP]: "角",
  [PieceType.ROOK]: "飛",
  [PieceType.KING]: "玉",
  [PieceType.PROM_PAWN]: "と",
  [PieceType.PROM_LANCE]: "杏",
  [PieceType.PROM_KNIGHT]: "圭",
  [PieceType.PROM_SILVER]: "全",
  [PieceType.HORSE]: "馬",
  [PieceType.DRAGON]: "龍",
};

const HAND_ORDER = [
  PieceType.ROOK,
  PieceType.BISHOP,
  PieceType.GOLD,
  PieceType.SILVER,
  PieceType.KNIGHT,
  PieceType.LANCE,
  PieceType.PAWN,
];

const RANK_NAMES = "abcdefghi";
const RANK_KANJI = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function pieceGlyph(type) {
  return GLYPHS[type] || "?";
}

export function squareName(square) {
  return `${square.file}${RANK_NAMES[square.rank - 1]}`;
}

export class BoardView {
  constructor({ board, blackHand, whiteHand, handStack, coordinates }, { onSquare, onHand }) {
    this.board = board;
    this.blackHand = blackHand;
    this.whiteHand = whiteHand;
    this.handStack = handStack;
    this.coordinates = coordinates;
    this.onSquare = onSquare;
    this.onHand = onHand;
    this.board.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-square]");
      if (!button) return;
      const usi = button.dataset.square;
      const square = Square.newByUSI(usi);
      if (square) this.onSquare?.(square);
    });
    for (const [el, color] of [[this.blackHand, Color.BLACK], [this.whiteHand, Color.WHITE]]) {
      el.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-hand]");
        if (!button) return;
        this.onHand?.(color, button.dataset.hand);
      });
    }
  }

  render(state) {
    const position = state.position;
    if (!position) return;
    const flip = Boolean(state.flip);
    const selected = state.selected ? squareName(state.selected) : null;
    const targets = new Set((state.legalMoves || []).filter((m) => m.to).map((m) => squareName(m.to)));
    const lastFrom = state.lastMove?.from instanceof Square ? squareName(state.lastMove.from) : null;
    const lastTo = state.lastMove?.to ? squareName(state.lastMove.to) : null;
    const checked = state.checked;
    const checkedKing = checked ? position.board.findKing(position.color) : null;
    const checkedUsi = checkedKing ? squareName(checkedKing) : null;
    const showCoords = Boolean(state.coordinates);

    const fragment = document.createDocumentFragment();
    const files = flip ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1];
    const ranks = flip ? [9, 8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (const rank of ranks) {
      for (const file of files) {
        const square = new Square(file, rank);
        const usi = squareName(square);
        const piece = position.board.at(square);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "square";
        button.dataset.square = usi;
        button.setAttribute("role", "gridcell");
        if (selected === usi) button.classList.add("selected");
        if (targets.has(usi)) button.classList.add("target");
        if (lastFrom === usi || lastTo === usi) button.classList.add("last-move");
        if (checkedUsi === usi) button.classList.add("checked");
        if (state.editable) button.classList.add("editable");
        if (showCoords && rank === ranks[0]) {
          const coord = document.createElement("span");
          coord.className = "coord coord-top";
          coord.textContent = String(file);
          button.appendChild(coord);
        }
        if (showCoords && file === files[0]) {
          const coord = document.createElement("span");
          coord.className = "coord coord-left";
          coord.textContent = RANK_KANJI[rank - 1];
          button.appendChild(coord);
        }
        if (piece) {
          const span = document.createElement("span");
          span.className = `piece ${piece.color}`;
          if (piece.type.startsWith("prom")) span.classList.add("promoted");
          if ([PieceType.HORSE, PieceType.DRAGON, PieceType.PROM_PAWN, PieceType.PROM_LANCE, PieceType.PROM_KNIGHT, PieceType.PROM_SILVER].includes(piece.type)) {
            span.classList.add("promoted");
          }
          const rotated = piece.color === Color.BLACK ? flip : !flip;
          if (rotated) span.classList.add("rotated");
          span.textContent = pieceGlyph(piece.type);
          button.appendChild(span);
          button.setAttribute("aria-label", `${usi} ${pieceGlyph(piece.type)}`);
        } else {
          button.setAttribute("aria-label", usi);
        }
        fragment.appendChild(button);
      }
    }
    this.board.replaceChildren(fragment);
    this._renderHand(this.blackHand, position.hand(Color.BLACK), Color.BLACK, flip, state);
    this._renderHand(this.whiteHand, position.hand(Color.WHITE), Color.WHITE, flip, state);
    this.board.classList.toggle("flipped", flip);
    this.handStack?.classList.toggle("flipped", flip);
  }

  _renderHand(el, hand, color, flip, state) {
    el.replaceChildren();
    const label = document.createElement("span");
    label.className = "hand-label";
    label.textContent = color === Color.BLACK ? "☗" : "☖";
    el.appendChild(label);
    for (const type of HAND_ORDER) {
      const count = hand.count(type);
      if (count <= 0) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `hand-piece ${color}`;
      button.dataset.hand = type;
      const rotated = color === Color.BLACK ? flip : !flip;
      if (rotated) button.classList.add("rotated");
      if (state.selectedHand === type && state.selectedHandColor === color) button.classList.add("selected");
      button.innerHTML = `<span class="hand-glyph">${pieceGlyph(type)}</span><span class="hand-count">${count}</span>`;
      button.setAttribute("aria-label", `${color} ${pieceGlyph(type)} ${count}`);
      el.appendChild(button);
    }
    if (!hand.counts?.length) return;
  }
}
