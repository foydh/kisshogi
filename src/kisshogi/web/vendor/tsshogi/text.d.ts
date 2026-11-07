import { Color } from "./color";
import { Move, SpecialMove, SpecialMoveType } from "./move";
import { PieceType } from "./piece";
import { ImmutablePosition } from "./position";
export declare function stringToNumber(s: string): number;
export declare function stringToPieceType(piece: string): PieceType;
export declare function numberToKanji(n: number): string;
export declare function fileToMultiByteChar(file: number): string;
export declare function rankToKanji(rank: number): string;
export declare function pieceTypeToStringForMove(pieceType: PieceType): string;
export declare function pieceTypeToStringForBoard(pieceType: PieceType): string;
/**
 * 特殊な指し手の表示用の文字列を返します。
 * @param move
 */
export declare function formatSpecialMove(move: SpecialMove | SpecialMoveType, color?: Color): string;
/**
 * 「上」や「引」など指し手の移動方向を修飾する文字列を返します。
 * @param move
 * @param position
 */
export declare function getDirectionModifier(move: Move, position: ImmutablePosition): string;
/**
 * 指し手を表す文字列を返します。
 * @param position 指し手の直前の局面
 * @param move 対象の指し手
 */
export declare function formatMove(position: ImmutablePosition, move: Move, opt?: {
    lastMove?: Move;
    compatible?: boolean;
}): string;
export declare function formatPV(position: ImmutablePosition, pv: Move[]): string;
export declare function parsePV(position: ImmutablePosition, text: string): Move[];
/**
 * テキストから指し手を読み込みます。 KI2 と互換性があります。
 * @param position 指し手の直前の局面
 * @param text 対象の文字列
 * @param lastMove 直前の指し手（1 手目が "同" を使った表記の場合に使用する。）
 */
export declare function parseMoves(position: ImmutablePosition, text: string, lastMove?: Move): [Move[], Error | undefined];
