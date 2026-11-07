import { Color } from "./color";
export declare enum PieceType {
    PAWN = "pawn",
    LANCE = "lance",
    KNIGHT = "knight",
    SILVER = "silver",
    GOLD = "gold",
    BISHOP = "bishop",
    ROOK = "rook",
    KING = "king",
    PROM_PAWN = "promPawn",
    PROM_LANCE = "promLance",
    PROM_KNIGHT = "promKnight",
    PROM_SILVER = "promSilver",
    HORSE = "horse",
    DRAGON = "dragon"
}
/**
 * 標準的な駒の名前を返します。
 * @param type
 */
export declare function standardPieceName(type: PieceType): string;
export declare const pieceTypes: PieceType[];
export declare const handPieceTypes: PieceType[];
/**
 * 成ることができる駒かどうかを返します。
 * @param pieceType
 */
export declare function isPromotable(pieceType: PieceType): boolean;
/**
 * 成った時の駒の種類を返します。
 * @param pieceType
 */
export declare function promotedPieceType(pieceType: PieceType): PieceType;
/**
 * 成る前の駒の種類を返します。
 * @param pieceType
 */
export declare function unpromotedPieceType(pieceType: PieceType): PieceType;
/**
 * SFEN形式の駒種を表す文字列を返します。
 * @param type
 */
export declare function pieceTypeToSFEN(type: PieceType): string;
/**
 * 駒(手番を含む)
 */
export declare class Piece {
    color: Color;
    type: PieceType;
    constructor(color: Color, type: PieceType);
    /**
     * 先手番の駒に変換します。
     */
    black(): Piece;
    /**
     * 後手番の駒に変換します。
     */
    white(): Piece;
    /**
     * 手番を変更した駒を返します。
     */
    withColor(color: Color): Piece;
    /**
     * 等しい駒かどうかを判定します。
     */
    equals(piece: Piece): boolean;
    /**
     * 成った駒を返します。
     */
    promoted(): Piece;
    /**
     * 成る前の駒を返します。
     */
    unpromoted(): Piece;
    /**
     * 成ることが可能な駒かどうかを返します。
     */
    isPromotable(): boolean;
    /**
     * 駒の向きと種類をローテートします。
     * ex) 先手・歩 -> 先手・と -> 後手・歩 -> 後手・と -> 先手・歩
     */
    rotate(): Piece;
    /**
     * 手番と種類を一意に識別する ID を返します。
     */
    get id(): string;
    /**
     * SFEN形式の文字列を取得します。
     */
    get sfen(): string;
    /**
     * 指定した文字列が正しいSFEN形式の駒かどうかを判定します。
     * @param sfen
     */
    static isValidSFEN(sfen: string): boolean;
    /**
     * SFEN形式の文字列から駒を生成します。
     * @param sfen
     */
    static newBySFEN(sfen: string): Piece | null;
}
