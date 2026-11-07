import { PieceType } from "./piece";
import { Color } from "./color";
/**
 * 持ち駒(読み取り専用)
 */
export interface ImmutableHand {
    /**
     * 持ち駒の枚数を取得します。
     * @param pieceType
     */
    count(pieceType: PieceType): number;
    /**
     * 駒の種類ごとにハンドラーを呼び出します。
     * @param handler
     */
    forEach(handler: (pieceType: PieceType, n: number) => void): void;
    /**
     * 持ち駒の種類と枚数の一覧を取得します。
     */
    readonly counts: {
        type: PieceType;
        count: number;
    }[];
    /**
     * 先手の持ち駒に対してSFEN形式の文字列を取得します。
     */
    readonly sfenBlack: string;
    /**
     * 後手の持ち駒に対してSFEN形式の文字列を取得します。
     */
    readonly sfenWhite: string;
    /**
     * SFEN形式の文字列を取得します。
     * @param color
     */
    formatSFEN(color: Color): string;
}
/**
 * 持ち駒
 */
export declare class Hand {
    private pieces;
    constructor();
    /**
     * 持ち駒の種類と枚数の一覧を取得します。
     */
    get counts(): {
        type: PieceType;
        count: number;
    }[];
    /**
     * 持ち駒の枚数を取得します。
     * @param pieceType
     */
    count(pieceType: PieceType): number;
    /**
     * 持ち駒の枚数を設定します。
     * @param pieceType
     * @param count
     */
    set(pieceType: PieceType, count: number): void;
    /**
     * 持ち駒を追加します。
     * @param pieceType
     * @param n
     */
    add(pieceType: PieceType, n: number): number;
    /**
     * 持ち駒を減らします。
     * @param pieceType
     * @param n
     */
    reduce(pieceType: PieceType, n: number): number;
    /**
     * 駒の種類ごとにハンドラーを呼び出します。
     * @param handler
     */
    forEach(handler: (pieceType: PieceType, n: number) => void): void;
    /**
     * 先手の持ち駒に対してSFEN形式の文字列を取得します。
     */
    get sfenBlack(): string;
    /**
     * 後手の持ち駒に対してSFEN形式の文字列を取得します。
     */
    get sfenWhite(): string;
    /**
     * SFEN形式の文字列を取得します。
     * @param color
     */
    formatSFEN(color: Color): string;
    /**
     * SFEN形式の文字列を取得します。
     * @param black
     * @param white
     */
    static formatSFEN(black: Hand, white: Hand): string;
    /**
     * 指定した文字列が正しい持ち駒のSFENであるかどうかを判定します。
     * @param sfen
     */
    static isValidSFEN(sfen: string): boolean;
    /**
     * 持ち駒のSFENを解析します。
     * @param sfen
     */
    static parseSFEN(sfen: string): {
        black: Hand;
        white: Hand;
    } | null;
    /**
     * 別のオブジェクトからコピーします。
     * @param hand
     */
    copyFrom(hand: Hand): void;
}
