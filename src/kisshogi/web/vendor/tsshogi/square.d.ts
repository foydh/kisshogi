import { Direction } from "./direction";
/**
 * マス目
 */
export declare class Square {
    file: number;
    rank: number;
    constructor(file: number, rank: number);
    /**
     * 9筋を0としたx座標
     */
    get x(): number;
    /**
     * 1段目を0としたy座標
     */
    get y(): number;
    /**
     * 0～80のインデックス
     * 0=「9一」, 1=「8一」, ..., 80=「1九」
     */
    get index(): number;
    /**
     * 先後を反転したマスを取得します。
     */
    get opposite(): Square;
    /**
     * 相対座標を指定して近隣のマスを取得します。
     * @param dx
     * @param dy
     */
    neighbor(dx: number, dy: number): Square;
    /**
     * 方向を指定して隣接(桂馬とびを含む)のマスを取得します。
     * @param dir
     */
    neighbor(dir: Direction): Square;
    /** 指定したマスへの方向を返します。 */
    directionTo(square: Square): Direction;
    /** 有効なマス目であるか判定します。 */
    get valid(): boolean;
    /** 同じマス目か判定します。 */
    equals(square: Square | null | undefined): boolean;
    /**
     * 座標を指定してマスを取得します。
     * @param x
     * @param y
     */
    static newByXY(x: number, y: number): Square;
    /**
     * インデクスを指定してマスを取得します。
     * @param index
     */
    static newByIndex(index: number): Square;
    /**
     * 全てのマス目の一覧
     */
    static all: Square[];
    /**
     * SFEN形式の文字列を取得します。
     * @deprecated Use usi instead.
     */
    get sfen(): string;
    /**
     * USI形式の文字列を取得します。
     */
    get usi(): string;
    /**
     * SFEN形式のマス目をパースします。
     * @param sfen
     * @deprecated Use newByUSI instead.
     */
    static parseSFENSquare(sfen: string): Square | null;
    /**
     * USI形式のマス目をパースします。
     * @param usi
     */
    static newByUSI(usi: string): Square | null;
}
