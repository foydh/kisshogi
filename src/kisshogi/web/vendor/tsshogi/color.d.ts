export declare enum Color {
    /** 先手 */
    BLACK = "black",
    /** 後手 */
    WHITE = "white"
}
/**
 * 反対の手番を返します。
 * @param color
 */
export declare function reverseColor(color: Color): Color;
/**
 * SFEN形式の手番を取得します。
 * @param color
 */
export declare function colorToSFEN(color: Color): string;
/**
 * 指定した文字列が正しいSFENの手番かどうかを判定します。
 * @param sfen
 */
export declare function isValidSFENColor(sfen: string): boolean;
/**
 * SFEN形式の手番を読み取ります。
 * @param sfen
 */
export declare function parseSFENColor(sfen: string): Color;
