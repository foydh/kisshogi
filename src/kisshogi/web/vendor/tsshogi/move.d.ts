import { Color } from "./color";
import { PieceType } from "./piece";
import { Square } from "./square";
/**
 * 指し手
 */
export declare class Move {
    from: Square | PieceType;
    to: Square;
    promote: boolean;
    color: Color;
    pieceType: PieceType;
    capturedPieceType: PieceType | null;
    constructor(from: Square | PieceType, to: Square, promote: boolean, color: Color, pieceType: PieceType, capturedPieceType: PieceType | null);
    /**
     * 指し手が等しいかどうかを判定します。
     * @param move
     */
    equals(move: Move | null | undefined): boolean;
    /**
     * 成る手を返します。
     */
    withPromote(): Move;
    /**
     * USI形式の文字列を取得します。
     */
    get usi(): string;
}
/**
 * USI形式の文字列を解析します。
 * @param usiMove
 */
export declare function parseUSIMove(usiMove: string): {
    from: Square | PieceType;
    to: Square;
    promote: boolean;
} | null;
export declare enum SpecialMoveType {
    START = "start",
    INTERRUPT = "interrupt",
    RESIGN = "resign",
    MAX_MOVES = "maxMoves",
    IMPASS = "impass",
    DRAW = "draw",
    REPETITION_DRAW = "repetitionDraw",
    MATE = "mate",
    NO_MATE = "noMate",
    TIMEOUT = "timeout",
    FOUL_WIN = "foulWin",// 手番側の勝ち(直前の指し手が反則手)
    FOUL_LOSE = "foulLose",// 手番側の負け
    ENTERING_OF_KING = "enteringOfKing",
    WIN_BY_DEFAULT = "winByDefault",
    LOSE_BY_DEFAULT = "loseByDefault",
    TRY = "try"
}
export type PredefinedSpecialMove = {
    type: SpecialMoveType;
};
export type AnySpecialMove = {
    type: "any";
    name: string;
};
export type SpecialMove = PredefinedSpecialMove | AnySpecialMove;
/**
 * 定義済みの特殊な指し手を作成します。
 * @param type
 */
export declare function specialMove(type: SpecialMoveType): PredefinedSpecialMove;
/**
 * 未定義の特殊な指し手を作成します。
 * @param name
 */
export declare function anySpecialMove(name: string): AnySpecialMove;
/**
 * 定義済みの特殊な指し手かどうかを判定します。
 * @param move
 */
export declare function isKnownSpecialMove(move: Move | SpecialMove): move is PredefinedSpecialMove;
export declare function areSameSpecialMoves(a: SpecialMove, b: SpecialMove): boolean;
export declare function areSameMoves(a: Move | SpecialMove, b: Move | SpecialMove): boolean;
