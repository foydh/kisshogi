import { Piece } from "./piece";
export declare enum Direction {
    UP = "up",
    DOWN = "down",
    LEFT = "left",
    RIGHT = "right",
    LEFT_UP = "left_up",
    RIGHT_UP = "right_up",
    LEFT_DOWN = "left_down",
    RIGHT_DOWN = "right_down",
    LEFT_UP_KNIGHT = "left_up_knight",
    RIGHT_UP_KNIGHT = "right_up_knight",
    LEFT_DOWN_KNIGHT = "left_down_knight",
    RIGHT_DOWN_KNIGHT = "right_down_knight"
}
/**
 * 反転した方向を返します。
 * @param dir
 */
export declare function reverseDirection(dir: Direction): Direction;
export declare const directions: Direction[];
export declare enum MoveType {
    SHORT = "short",
    LONG = "long"
}
/**
 * 指定した駒の移動可能な方向を返します。
 * @param piece
 */
export declare function movableDirections(piece: Piece): Direction[];
/**
 * 指定した駒と方向に対して、1マスのみ移動可能か遠距離移動可能かを返します。
 * @param piece
 * @param direction
 */
export declare function resolveMoveType(piece: Piece, direction: Direction): MoveType | undefined;
export declare const directionToDeltaMap: {
    [direction in Direction]: {
        x: number;
        y: number;
    };
};
/**
 * ベクトルを方向と距離に変換します。
 * @param x
 * @param y
 */
export declare function vectorToDirectionAndDistance(x: number, y: number): {
    direction: Direction;
    distance: number;
    ok: boolean;
};
export declare enum VDirection {
    UP = "up",
    NONE = "none",
    DOWN = "down"
}
/**
 * 垂直方向の動きを取り出します。
 * @param direction
 */
export declare function directionToVDirection(direction: Direction): VDirection;
export declare enum HDirection {
    LEFT = "left",
    NONE = "none",
    RIGHT = "right"
}
/**
 * 水平方向の動きを取り出します。
 * @param direction
 */
export declare function directionToHDirection(direction: Direction): HDirection;
