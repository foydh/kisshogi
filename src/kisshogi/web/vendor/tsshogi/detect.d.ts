export declare enum RecordFormatType {
    USI = 0,
    SFEN = 1,
    KIF = 2,
    KI2 = 3,
    CSA = 4,
    JKF = 5,
    USEN = 6
}
/**
 * 文字列から棋譜形式を推定します。
 * 一部の文字の並びや出現頻度による簡易的な判定であり、判定結果のフォーマットに準拠していることを保証するものではありません。
 * @param data
 */
export declare function detectRecordFormat(data: string): RecordFormatType;
