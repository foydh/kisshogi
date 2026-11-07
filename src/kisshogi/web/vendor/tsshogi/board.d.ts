import { Color } from "./color";
import { Piece } from "./piece";
import { Square } from "./square";
type PowerDetectionOption = {
    filled?: Square;
    ignore?: Square;
};
/**
 * 盤面 (読み取り専用)
 */
export interface ImmutableBoard {
    /**
     * 指定したマスの駒を取得します。
     * @param square
     */
    at(square: Square): Piece | null;
    /**
     * 空ではないマスの一覧を取得します。
     */
    listNonEmptySquares(): Square[];
    /**
     * 指定した手番の玉のマスを返します。
     * @param color
     */
    findKing(color: Color): Square | undefined;
    /**
     * 指定したマスに指定した手番の駒の利きがあるかどうかを判定します。
     * @param target
     * @param color
     * @param option
     */
    hasPower(target: Square, color: Color, option?: PowerDetectionOption): boolean;
    /**
     * 指定した手番の玉に対して王手がかかっているかどうかを判定します。
     * @param kingColor
     * @param option
     */
    isChecked(kingColor: Color, option?: PowerDetectionOption): boolean;
    /**
     * SFEN形式の文字列を取得します。
     */
    readonly sfen: string;
}
/**
 * 盤面
 */
export declare class Board {
    private squares;
    constructor();
    /**
     * 指定したマスの駒を取得します。
     * @param square
     */
    at(square: Square): Piece | null;
    /**
     * 指定したマスに駒を配置します。
     * @param square
     * @param piece
     */
    set(square: Square, piece: Piece): void;
    /**
     * 指定した2マスの駒を入れ替えます。
     * @param square1
     * @param square2
     */
    swap(square1: Square, square2: Square): void;
    /**
     * 指定したマスの駒を取り除きます。
     * @param square
     */
    remove(square: Square): Piece | null;
    /**
     * 空ではないマスの一覧を取得します。
     */
    listNonEmptySquares(): Square[];
    /**
     * 指定した手番の駒があるマスの一覧を取得します。
     * @param color
     */
    listSquaresByColor(color: Color): Square[];
    /**
     * 指定した駒があるマスの一覧を取得します。
     * @param target
     */
    listSquaresByPiece(target: Piece): Square[];
    /**
     * 全てのマスの駒を取り除きます。
     */
    clear(): void;
    /**
     * SFEN形式の文字列を取得します。
     */
    get sfen(): string;
    /**
     * SFENで盤面を初期化します。
     * @param sfen
     */
    resetBySFEN(sfen: string): boolean;
    /**
     * 指定した手番の玉のマスを返します。
     * @param color
     */
    findKing(color: Color): Square | undefined;
    /**
     * 指定したマスに指定した手番の駒の利きがあるかどうかを判定します。
     * @param target
     * @param color
     * @param option
     */
    hasPower(target: Square, color: Color, option?: PowerDetectionOption): boolean;
    /**
     * 指定した手番の玉に対して王手がかかっているかどうかを判定します。
     * @param kingColor
     * @param option
     */
    isChecked(kingColor: Color, option?: PowerDetectionOption): boolean;
    /**
     * 文字列が正しいSFEN形式であるか判定します。
     * @param sfen
     */
    static isValidSFEN(sfen: string): boolean;
    /**
     * 別のオブジェクトから盤面をコピーします。
     * @param board
     */
    copyFrom(board: Board): void;
}
export {};
