// Position editor.  It edits a clone and only replaces the game on Apply.

import {
  Color,
  InitialPositionSFEN,
  PieceType,
  Position,
  isPromotable,
  promotedPieceType,
  setBoardPiece,
  setHandCount,
  validateEditorPosition,
  handPieceTypes,
} from "./shogi.js";
import { pieceGlyph } from "./board-view.js";
import { confirmDialog, toast } from "./dialogs.js";
import { t } from "./i18n.js";

const BASE_TYPES = [
  PieceType.PAWN,
  PieceType.LANCE,
  PieceType.KNIGHT,
  PieceType.SILVER,
  PieceType.GOLD,
  PieceType.BISHOP,
  PieceType.ROOK,
  PieceType.KING,
];

const HAND_LABEL = {
  [PieceType.ROOK]: "飛",
  [PieceType.BISHOP]: "角",
  [PieceType.GOLD]: "金",
  [PieceType.SILVER]: "銀",
  [PieceType.KNIGHT]: "桂",
  [PieceType.LANCE]: "香",
  [PieceType.PAWN]: "歩",
};

export class PositionEditor {
  constructor({ elements, game, getFlip, onRender, onClose }) {
    this.el = elements;
    this.game = game;
    this.getFlip = getFlip;
    this.onRender = onRender;
    this.onClose = onClose;
    this.active = false;
    this.position = null;
    this.color = Color.BLACK;
    this.type = PieceType.PAWN;
    this.tool = "place";
    this.promoted = false;
    this.turn = Color.BLACK;
    this._bind();
  }

  _bind() {
    this.el.toolbar.addEventListener("click", (event) => {
      const colorButton = event.target.closest("[data-editor-color]");
      if (colorButton) {
        this.color = colorButton.dataset.editorColor;
        this._renderControls();
        return;
      }
      const toolButton = event.target.closest("[data-editor-tool]");
      if (toolButton) {
        this.tool = toolButton.dataset.editorTool;
        this._renderControls();
        return;
      }
      const turnButton = event.target.closest("[data-editor-turn]");
      if (turnButton) {
        this.turn = turnButton.dataset.editorTurn;
        this.position?.setColor(this.turn);
        this._syncSfen();
        this._renderControls();
        this._renderBoard();
        return;
      }
      const pieceColorButton = event.target.closest("[data-editor-piece-color]");
      if (pieceColorButton) {
        this.color = pieceColorButton.dataset.editorPieceColor;
        this._renderControls();
      }
    });
    this.el.promote.addEventListener("change", () => {
      this.promoted = this.el.promote.checked;
    });
    this.el.standard.addEventListener("click", () => this._load(InitialPositionSFEN.STANDARD));
    this.el.clear.addEventListener("click", () => this._load(InitialPositionSFEN.EMPTY));
    this.el.cancel.addEventListener("click", () => this.close());
    this.el.apply.addEventListener("click", () => this.apply());
    this.el.loadSfen.addEventListener("click", () => this._load(this.el.sfen.value));
    this.el.copySfen.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.position?.sfen || "");
        toast(t("toast.copyOk"), "ok");
      } catch {
        toast(t("record.copyError"), "error");
      }
    });
  }

  _setError(message) {
    if (!this.el.error) return;
    this.el.error.textContent = message || "";
    this.el.error.classList.toggle("hidden", !message);
  }

  _clearError() {
    this._setError("");
  }

  open() {
    this.active = true;
    this._clearError();
    this.position = this.game.position.clone();
    this.turn = this.position.color;
    this.el.toolbar.classList.remove("hidden");
    this._renderControls();
    this._syncSfen();
    this._renderBoard();
  }

  close() {
    this.active = false;
    this._clearError();
    this.el.toolbar.classList.add("hidden");
    this.onClose?.();
  }

  _load(sfen) {
    const position = Position.newBySFEN(String(sfen || "").trim());
    if (!position) {
      toast(t("editor.invalidSfen"), "error");
      return;
    }
    this.position = position;
    this.turn = position.color;
    this._clearError();
    this._renderControls();
    this._syncSfen();
    this._renderBoard();
  }

  _renderBoard() {
    this.onRender?.({
      position: this.position,
      selected: null,
      legalMoves: [],
      lastMove: null,
      flip: this.getFlip(),
      editable: true,
    });
  }

  _syncSfen() {
    if (this.position) this.el.sfen.value = this.position.sfen;
  }

  _renderControls() {
    for (const button of this.el.toolbar.querySelectorAll("[data-editor-color], [data-editor-piece-color]")) {
      button.classList.toggle("active", button.dataset.editorColor === this.color || button.dataset.editorPieceColor === this.color);
    }
    for (const button of this.el.toolbar.querySelectorAll("[data-editor-tool]")) {
      button.classList.toggle("active", button.dataset.editorTool === this.tool);
    }
    for (const button of this.el.toolbar.querySelectorAll("[data-editor-turn]")) {
      button.classList.toggle("active", button.dataset.editorTurn === this.turn);
    }
    this.el.promote.checked = this.promoted;
    this.el.palette.replaceChildren();
    for (const type of BASE_TYPES) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = pieceGlyph(type);
      button.dataset.type = type;
      button.classList.toggle("active", this.type === type);
      button.title = type;
      button.addEventListener("click", () => {
        this.type = type;
        this._renderControls();
      });
      this.el.palette.appendChild(button);
    }
    this._renderHands();
  }

  _renderHands() {
    this.el.hands.replaceChildren();
    for (const color of [Color.BLACK, Color.WHITE]) {
      const row = document.createElement("div");
      row.className = "editor-hand-row";
      const label = document.createElement("span");
      label.textContent = color === Color.BLACK ? t("color.black") : t("color.white");
      row.appendChild(label);
      for (const type of handPieceTypes) {
        const count = this.position.hand(color).count(type);
        const wrap = document.createElement("label");
        wrap.className = "inline-check";
        wrap.innerHTML = `<span>${HAND_LABEL[type] || type}</span>`;
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "18";
        input.value = String(count);
        input.addEventListener("change", () => {
          setHandCount(this.position, color, type, Number(input.value));
          this._clearError();
          this._syncSfen();
          this._renderBoard();
          this._renderHands();
        });
        wrap.appendChild(input);
        row.appendChild(wrap);
      }
      this.el.hands.appendChild(row);
    }
  }

  onSquare(square) {
    if (!this.active || !this.position) return;
    if (this.tool === "erase") {
      setBoardPiece(this.position, square, null, null);
    } else {
      let type = this.type;
      if (this.promoted && isPromotable(type)) type = promotedPieceType(type);
      setBoardPiece(this.position, square, this.color, type);
    }
    this._clearError();
    this._syncSfen();
    this._renderBoard();
  }

  async apply() {
    if (!this.active || !this.position) return;
    const check = validateEditorPosition(this.position);
    if (!check.ok) {
      const key = {
        king_count: "editor.invalidKing",
        too_many_pieces: "editor.invalidPieces",
        nifu: "editor.invalidNifu",
        dead_piece: "editor.invalidDeadPiece",
        invalid_hand: "editor.invalidHand",
      }[check.reason] || "editor.invalidSfen";
      const message = t(key);
      this._setError(message);
      toast(message, "error");
      return;
    }
    if (this.game.length > 0) {
      const ok = await confirmDialog(t("game.editPosition"), t("editor.clearConfirm"), { danger: true });
      if (!ok) return;
    }
    if (!this.game.applySfen(this.position.sfen)) {
      this._setError(t("editor.invalidSfen"));
      toast(t("editor.invalidSfen"), "error");
      return;
    }
    toast(t("editor.applied"), "ok");
    this.close();
  }
}
