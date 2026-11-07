import { Move } from "./move";
import { ImmutableRecord, Record, RecordMetadataKey } from "./record";
export declare enum KakinokiFormatType {
    KIF = "KIF",
    KI2 = "KI2"
}
/**
 * 柿木形式のメタデータのキー名を RecordMetadataKey へ変換します。
 * @param key
 */
export declare function kakinokiToMetadataKey(key: string): RecordMetadataKey | undefined;
/**
 * RecordMetadataKey を柿木形式のメタデータのキー名へ変換します。
 * @param key
 */
export declare function metadataKeyToKakinoki(key: RecordMetadataKey): string;
/**
 * KIF 形式の文字列を読み込みます。
 * @param data
 */
export declare function importKIF(data: string): Record | Error;
/**
 * KI2 形式の文字列を読み込みます。
 * @param data
 */
export declare function importKI2(data: string): Record | Error;
type KIFExportOptions = {
    returnCode?: string;
    comment?: string;
};
/**
 * KIF 形式の指し手を出力します。
 * @param move 対象の指し手
 * @param prev 直前の指し手 ("同"の判定に使用)
 */
export declare function formatKIFMove(move: Move, options?: {
    prev?: Move;
    padding?: boolean;
}): string;
/**
 * KIF形式の文字列を出力します。
 * @param record
 * @param options
 */
export declare function exportKIF(record: ImmutableRecord, options?: KIFExportOptions): string;
type KI2ExportOptions = {
    returnCode?: string;
};
/**
 * KI2形式の文字列を出力します。
 * @param record
 * @param options
 */
export declare function exportKI2(record: ImmutableRecord, options?: KI2ExportOptions): string;
export declare function exportBOD(record: ImmutableRecord, options?: KIFExportOptions): string;
export {};
