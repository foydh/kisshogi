// Read-only mini board used by the analysis panel.

import { Color, PieceType, Square } from "./shogi.js";
import { pieceGlyph, squareName } from "./board-view.js";

const PROMOTED_TYPES = new Set([
  PieceType.PROM_PAWN,
  PieceType.PROM_LANCE,
  PieceType.PROM_KNIGHT,
  PieceType.PROM_SILVER,
  PieceType.HORSE,
  PieceType.DRAGON,
]);

export class MiniBoard {
  constructor(element) {
    this.el = element;
  }

  render(position, { best = null, flip = false, checked = false } = {}) {
    if (!this.el || !position) return;
    const from = best?.from instanceof Square ? squareName(best.from) : null;
    const to = best?.to ? squareName(best.to) : null;
    const checkedKing = checked ? position.board.findKing(position.color) : null;
    const checkedUsi = checkedKing ? squareName(checkedKing) : null;
    const files = flip ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [9, 8, 7, 6, 5, 4, 3, 2, 1];
    const ranks = flip ? [9, 8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const fragment = document.createDocumentFragment();
    for (const rank of ranks) {
      for (const file of files) {
        const square = new Square(file, rank);
        const usi = squareName(square);
        const cell = document.createElement("div");
        cell.className = "mini-square";
        cell.dataset.square = usi;
        if (usi === from) cell.classList.add("best-from");
        if (usi === to) cell.classList.add("best-to");
        if (usi === checkedUsi) cell.classList.add("checked");
        const piece = position.board.at(square);
        if (piece) {
          const span = document.createElement("span");
          span.className = "mini-piece";
          if (piece.color === Color.WHITE) span.classList.add("white");
          if (PROMOTED_TYPES.has(piece.type)) span.classList.add("promoted");
          const rotated = piece.color === Color.BLACK ? flip : !flip;
          if (rotated) span.classList.add("rotated");
          span.textContent = pieceGlyph(piece.type);
          cell.appendChild(span);
        }
        fragment.appendChild(cell);
      }
    }
    this.el.replaceChildren(fragment);
    this.el.classList.toggle("flipped", flip);
  }
}
