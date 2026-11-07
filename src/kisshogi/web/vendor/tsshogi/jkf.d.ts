import { ImmutableRecord, Record } from "./record";
export type JKF = {
    header: {
        [key: string]: string;
    };
    initial?: JKFInitial;
    moves: JKFMoveWithForksAndInfo[];
};
export type JKFInitial = {
    preset: string;
    data?: JKFInitialData | null;
};
export type JKFInitialData = {
    color: JKFColor;
    board: JKFSquare[][] | {
        [key: string]: object;
    };
    hands: JKFHands;
};
export type JKFSquare = {
    color: JKFColor;
    kind: JKFKind;
} | {
    color?: null;
    kind?: null;
};
export type JKFHands = [JKFHand, JKFHand];
export type JKFHand = {
    FU?: number;
    KY?: number;
    KE?: number;
    GI?: number;
    KI?: number;
    KA?: number;
    HI?: number;
    OU?: number;
    TO?: number;
    NY?: number;
    NK?: number;
    NG?: number;
    UM?: number;
    RY?: number;
};
export declare enum JKFColor {
    BLACK = 0,
    WHITE = 1
}
export type JKFMoveWithForksAndInfo = {
    comments?: string[] | null;
    move?: JKFMove | null;
    time?: JKFConsumption | null;
    special?: JKFSpecial | null;
    forks?: JKFForks | null;
};
export declare enum JKFSpecial {
    TORYO = "TORYO",
    CHUDAN = "CHUDAN",
    SENNICHITE = "SENNICHITE",
    TIME_UP = "TIME_UP",
    ILLEGAL_MOVE = "ILLEGAL_MOVE",
    BLACK_ILLEGAL_ACTION = "+ILLEGAL_ACTION",// 先手の反則手
    WHITE_ILLEGAL_ACTION = "-ILLEGAL_ACTION",// 後手の反則手
    JISHOGI = "JISHOGI",
    KACHI = "KACHI",
    HIKIWAKE = "HIKIWAKE",
    MAX_MOVES = "MAX_MOVES",// NOTE: CSA V3 で追加
    MATTA = "MATTA",// NOTE: CSA V3 で廃止
    TSUMI = "TSUMI",
    FUZUMI = "FUZUMI",
    ERROR = "ERROR"
}
export type JKFForks = JKFFork[];
export type JKFFork = JKFMoveWithForksAndInfo[];
export type JKFConsumption = {
    now: JKFTime;
    total: JKFTime;
};
export type JKFMove = {
    color: JKFColor;
    from?: JKFPlaceFormat | null;
    to?: JKFPlaceFormat;
    piece: JKFKind;
    same?: boolean | null;
    promote?: boolean | null;
    capture?: JKFKind | null;
    relative?: string | null;
};
export type JKFTime = {
    h?: number | null;
    m: number;
    s: number;
};
export type JKFPlaceFormat = {
    x: number;
    y: number;
};
export declare enum JKFKind {
    FU = "FU",
    KY = "KY",
    KE = "KE",
    GI = "GI",
    KI = "KI",
    KA = "KA",
    HI = "HI",
    OU = "OU",
    TO = "TO",
    NY = "NY",
    NK = "NK",
    NG = "NG",
    UM = "UM",
    RY = "RY"
}
/**
 * JSON棋譜フォーマットの文字列を読み取ります。
 * @param data
 */
export declare function importJKFString(data: string): Record | Error;
/**
 * JSON棋譜フォーマットのオブジェクトを読み取ります。
 * @param jkf
 */
export declare function importJKF(jkf: JKF): Record | Error;
/**
 * JSON棋譜フォーマットの文字列を出力します。
 * @param record
 */
export declare function exportJKFString(record: ImmutableRecord): string;
/**
 * JSON棋譜フォーマットのオブジェクトを出力します。
 * @param record
 */
export declare function exportJKF(record: ImmutableRecord): JKF;
