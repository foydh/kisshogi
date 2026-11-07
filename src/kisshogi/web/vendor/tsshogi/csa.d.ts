import { Color } from "./color";
import { Move, SpecialMove } from "./move";
import { ImmutablePosition } from "./position";
import { ImmutableRecord, Record } from "./record";
/**
 * CSA形式の特殊な指し手の名前をSpecialMoveTypeに変換します。
 * @param name 先頭の % 記号を含めない名前をしていします。
 * @param color 手番を指定します。 +ILLEGAL_ACTION や -ILLEGAL_ACTION の読み取りに使用します。
 */
export declare function getSpecialMoveByName(name: string, color: Color): SpecialMove;
/**
 * CSA形式の指し手を読み取ります。
 * @param position
 * @param line
 */
export declare function parseCSAMove(position: ImmutablePosition, line: string): Move | Error;
/**
 * CSA形式の棋譜を読み取ります。
 * @param data
 */
export declare function importCSA(data: string): Record | Error;
export type CSAV3Options = {
    encoding?: "UTF-8" | "SHIFT_JIS";
    milliseconds?: boolean;
};
export type CSAExportOptions = {
    returnCode?: string;
    v3?: CSAV3Options;
    comment?: string;
};
/**
 * 特殊な指し手のCSA形式文字列を取得します。
 * 先頭の % は含みません。
 * @param move
 * @param color 手番を指定します。 +ILLEGAL_ACTION や -ILLEGAL_ACTION の出力に使用します。
 */
export declare function getCSASpecialMoveName(move: SpecialMove, color: Color): string | undefined;
/**
 * CSA形式の指し手を出力します。
 * @param move
 */
export declare function formatCSAMove(move: Move): string;
/**
 * CSA形式の棋譜を出力します。
 * @param record
 * @param options
 */
export declare function exportCSA(record: ImmutableRecord, options?: CSAExportOptions): string;
