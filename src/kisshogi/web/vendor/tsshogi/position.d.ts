import { Board, ImmutableBoard } from "./board";
import { Color } from "./color";
import { Move } from "./move";
import { Square } from "./square";
import { Hand, ImmutableHand } from "./hand";
import { Piece, PieceType } from "./piece";
export declare enum InitialPositionType {
    STANDARD = "standard",
    EMPTY = "empty",
    HANDICAP_LANCE = "handicapLance",
    HANDICAP_RIGHT_LANCE = "handicapRightLance",
    HANDICAP_BISHOP = "handicapBishop",
    HANDICAP_ROOK = "handicapRook",
    HANDICAP_ROOK_LANCE = "handicapRookLance",
    HANDICAP_2PIECES = "handicap2Pieces",
    HANDICAP_4PIECES = "handicap4Pieces",
    HANDICAP_6PIECES = "handicap6Pieces",
    HANDICAP_8PIECES = "handicap8Pieces",
    HANDICAP_10PIECES = "handicap10Pieces",
    TSUME_SHOGI = "tsumeShogi",
    TSUME_SHOGI_2KINGS = "tsumeShogi2Kings"
}
export declare enum InitialPositionSFEN {
    STANDARD = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1",
    EMPTY = "9/9/9/9/9/9/9/9/9 b - 1",
    HANDICAP_LANCE = "lnsgkgsn1/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_RIGHT_LANCE = "1nsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_BISHOP = "lnsgkgsnl/1r7/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_ROOK = "lnsgkgsnl/7b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_ROOK_LANCE = "lnsgkgsn1/7b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_2PIECES = "lnsgkgsnl/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_4PIECES = "1nsgkgsn1/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_6PIECES = "2sgkgs2/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_8PIECES = "3gkg3/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    HANDICAP_10PIECES = "4k4/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1",
    TSUME_SHOGI = "4k4/9/9/9/9/9/9/9/9 b 2r2b4g4s4n4l18p 1",
    TSUME_SHOGI_2KINGS = "4k4/9/9/9/9/9/9/9/4K4 b 2r2b4g4s4n4l18p 1"
}
/**
 * InitialPositionType から SFEN 形式の文字列に変換します。
 * @param type
 */
export declare function initialPositionTypeToSFEN(type: InitialPositionType): string;
export declare function isPromotableRank(color: Color, rank: number): boolean;
export type PositionChange = {
    move?: {
        /**
         * 移動元のマスまたは持ち駒を指定します。
         */
        from: Square | Piece;
        /**
         * 移動先のマスまたは駒台を指定します。
         */
        to: Square | Color;
    };
    /**
     * 指定したマスの駒をローテートします。
     */
    rotate?: Square;
};
/**
 * 局面(読み取り専用)
 */
export interface ImmutablePosition {
    /**
     * 盤面
     */
    readonly board: ImmutableBoard;
    /**
     * 手番
     */
    readonly color: Color;
    /**
     * 先手の持ち駒
     */
    readonly blackHand: ImmutableHand;
    /**
     * 後手の持ち駒
     */
    readonly whiteHand: ImmutableHand;
    /**
     * 指定した手番の持ち駒を取得します。
     * @param color
     */
    hand(color: Color): ImmutableHand;
    /**
     * 王手がかかっているかどうかを判定します。
     */
    readonly checked: boolean;
    /**
     * 現在の局面における指し手を生成します。
     * @param from
     * @param to
     */
    createMove(from: Square | PieceType, to: Square): Move | null;
    /**
     * USI形式の指し手から Move オブジェクトを生成します。
     * @param usiMove
     */
    createMoveByUSI(usiMove: string): Move | null;
    /**
     * 打ち歩詰めかどうかを判定します。
     * @param move
     */
    isPawnDropMate(move: Move): boolean;
    /**
     * 指定したマスに利いている駒のマス目を列挙します。
     * @param to
     * @param piece
     */
    listAttackers(to: Square): Square[];
    /**
     * 指定したマスに利いている指定した駒のマス目を列挙します。
     * @param to
     * @param piece
     */
    listAttackersByPiece(to: Square, piece: Piece): Square[];
    /**
     * 合法手かどうかを判定します。
     * @param move
     */
    isValidMove(move: Move): boolean;
    /**
     * 有効な編集作業かどうかを判定します。
     * @param from 移動元のマスまたは持ち駒を指定します。
     * @param to 移動先のマスまたは駒台を指定します。
     */
    isValidEditing(from: Square | Piece, to: Square | Color): boolean;
    /**
     * SFEN形式の文字列を返します。
     */
    readonly sfen: string;
    /**
     * 手数を指定してSFEN形式の文字列を取得します。
     * @param nextPly
     */
    getSFEN(nextPly: number): string;
    /**
     * クローンを生成します。
     */
    clone(): Position;
}
export type DoMoveOption = {
    ignoreValidation?: boolean;
};
/**
 * 局面
 */
export declare class Position {
    private _board;
    private _color;
    private _blackHand;
    private _whiteHand;
    /**
     * 盤面
     */
    get board(): Board;
    /**
     * 手番
     */
    get color(): Color;
    /**
     * 先手の持ち駒
     */
    get blackHand(): Hand;
    /**
     * 後手の持ち駒
     */
    get whiteHand(): Hand;
    /**
     * 指定した手番の持ち駒を取得します。
     * @param color
     */
    hand(color: Color): Hand;
    /**
     * 王手がかかっているかどうかを判定します。
     */
    get checked(): boolean;
    /**
     * 現在の局面における指し手を生成します。
     * @param from
     * @param to
     */
    createMove(from: Square | PieceType, to: Square): Move | null;
    /**
     * USI形式の指し手から Move オブジェクトを生成します。
     * @param usiMove
     */
    createMoveByUSI(usiMove: string): Move | null;
    /**
     * 打ち歩詰めかどうかを判定します。
     * @param move
     */
    isPawnDropMate(move: Move): boolean;
    /**
     * 指定したマスに利いている駒のマス目を列挙します。
     * @param to
     * @param piece
     */
    listAttackers(to: Square): Square[];
    /**
     * 指定したマスに利いている指定した駒のマス目を列挙します。
     * @param to
     * @param piece
     */
    listAttackersByPiece(to: Square, piece: Piece): Square[];
    /**
     * 合法手かどうかを判定します。
     * @param move
     */
    isValidMove(move: Move): boolean;
    /**
     * 指定した指し手で駒を動かします。
     * @param move
     * @param opt
     */
    doMove(move: Move, opt?: DoMoveOption): boolean;
    /**
     * 指定した指し手を元に戻します。
     * @param move
     * @param opt
     */
    undoMove(move: Move): void;
    /**
     * 有効な編集作業かどうかを判定します。
     * @param from
     * @param to
     */
    isValidEditing(from: Square | Piece, to: Square | Color): boolean;
    /**
     * 盤面を編集します。
     * @param change
     */
    edit(change: PositionChange): boolean;
    reset(type: InitialPositionType): void;
    /**
     * SFEN形式の文字列を返します。
     */
    get sfen(): string;
    /**
     * 手数を指定してSFEN形式の文字列を取得します。
     * @param nextPly
     */
    getSFEN(nextPly: number): string;
    /**
     * SFENで盤面を初期化します。
     * @param sfen
     */
    resetBySFEN(sfen: string): boolean;
    /**
     * 手番を設定します。
     * @param color
     */
    setColor(color: Color): void;
    /**
     * 正しいSFEN形式の文字列かどうかを判定します。
     * @param sfen
     */
    static isValidSFEN(sfen: string): boolean;
    /**
     * SFEN形式の文字列から局面を生成します。
     */
    static newBySFEN(sfen: string): Position | null;
    private isMovable;
    /**
     * 別のオブジェクトからコピーします。
     * @param position
     */
    copyFrom(position: Position): void;
    /**
     * クローンを生成します。
     */
    clone(): Position;
}
type PieceCounts = {
    [pieceType in PieceType]: number;
};
export declare function countExistingPieces(position: ImmutablePosition): PieceCounts;
export declare function countNotExistingPieces(position: ImmutablePosition): PieceCounts;
export declare enum JishogiDeclarationRule {
    GENERAL24 = "general24",// 24点法
    GENERAL27 = "general27"
}
export declare enum JishogiDeclarationResult {
    WIN = "win",
    LOSE = "lose",
    DRAW = "draw"
}
/**
 * 時将棋指し直し判定の点数を計算します。
 * 入玉宣言法と異なり、敵陣に侵入していない駒も加点対象となります。
 * 時将棋指し直しは原則として対局者の合意によって成立し、ここで求められる点数はあくまで参考値です。
 * @param position
 * @param color 計算対象のプレイヤー
 * @returns
 */
export declare function countJishogiPoint(position: ImmutablePosition, color: Color): number;
/**
 * 入玉宣言法に基づいて宣言する際の点数を計算します。
 * 敵陣に侵入している駒と持ち駒だけが対象となり、それ以外の駒は加点対象になりません。
 * @param position
 * @param color 宣言するプレイヤー
 */
export declare function countJishogiDeclarationPoint(position: ImmutablePosition, color: Color): number;
/**
 * 入玉宣言法に基づいて宣言した場合の結果を判定します。
 * @param rule
 * @param position
 * @param color 宣言するプレイヤー
 */
export declare function judgeJishogiDeclaration(rule: JishogiDeclarationRule, position: ImmutablePosition, color: Color): JishogiDeclarationResult;
export {};
