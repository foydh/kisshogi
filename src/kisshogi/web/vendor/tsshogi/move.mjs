import { Piece, pieceTypeToSFEN } from "./piece.mjs";
import { Square } from "./square.mjs";
/**
 * 指し手
 */
export class Move {
    from;
    to;
    promote;
    color;
    pieceType;
    capturedPieceType;
    constructor(from, to, promote, color, pieceType, capturedPieceType) {
        this.from = from;
        this.to = to;
        this.promote = promote;
        this.color = color;
        this.pieceType = pieceType;
        this.capturedPieceType = capturedPieceType;
    }
    /**
     * 指し手が等しいかどうかを判定します。
     * @param move
     */
    equals(move) {
        if (!move) {
            return false;
        }
        return (((this.from instanceof Square &&
            move.from instanceof Square &&
            this.from.equals(move.from)) ||
            (!(this.from instanceof Square) &&
                !(move.from instanceof Square) &&
                this.from === move.from)) &&
            this.to.equals(move.to) &&
            this.promote === move.promote &&
            this.color === move.color &&
            this.pieceType === move.pieceType &&
            this.capturedPieceType === move.capturedPieceType);
    }
    /**
     * 成る手を返します。
     */
    withPromote() {
        return new Move(this.from, this.to, true, this.color, this.pieceType, this.capturedPieceType);
    }
    /**
     * USI形式の文字列を取得します。
     */
    get usi() {
        let ret = "";
        if (this.from instanceof Square) {
            ret += this.from.usi;
        }
        else {
            ret += pieceTypeToSFEN(this.from) + "*";
        }
        ret += this.to.usi;
        if (this.promote) {
            ret += "+";
        }
        return ret;
    }
}
/**
 * USI形式の文字列を解析します。
 * @param usiMove
 */
export function parseUSIMove(usiMove) {
    let from;
    if (usiMove[1] === "*") {
        const piece = Piece.newBySFEN(usiMove[0]);
        if (!piece) {
            return null;
        }
        from = piece.type;
    }
    else {
        const square = Square.newByUSI(usiMove);
        if (!square) {
            return null;
        }
        from = square;
    }
    const to = Square.newByUSI(usiMove.substring(2));
    if (!to) {
        return null;
    }
    const promote = usiMove.length >= 5 && usiMove[4] === "+";
    return { from, to, promote };
}
export var SpecialMoveType;
(function (SpecialMoveType) {
    SpecialMoveType["START"] = "start";
    SpecialMoveType["INTERRUPT"] = "interrupt";
    SpecialMoveType["RESIGN"] = "resign";
    SpecialMoveType["MAX_MOVES"] = "maxMoves";
    SpecialMoveType["IMPASS"] = "impass";
    SpecialMoveType["DRAW"] = "draw";
    SpecialMoveType["REPETITION_DRAW"] = "repetitionDraw";
    SpecialMoveType["MATE"] = "mate";
    SpecialMoveType["NO_MATE"] = "noMate";
    SpecialMoveType["TIMEOUT"] = "timeout";
    SpecialMoveType["FOUL_WIN"] = "foulWin";
    SpecialMoveType["FOUL_LOSE"] = "foulLose";
    SpecialMoveType["ENTERING_OF_KING"] = "enteringOfKing";
    SpecialMoveType["WIN_BY_DEFAULT"] = "winByDefault";
    SpecialMoveType["LOSE_BY_DEFAULT"] = "loseByDefault";
    SpecialMoveType["TRY"] = "try";
})(SpecialMoveType || (SpecialMoveType = {}));
/**
 * 定義済みの特殊な指し手を作成します。
 * @param type
 */
export function specialMove(type) {
    return { type };
}
/**
 * 未定義の特殊な指し手を作成します。
 * @param name
 */
export function anySpecialMove(name) {
    return { type: "any", name };
}
/**
 * 定義済みの特殊な指し手かどうかを判定します。
 * @param move
 */
export function isKnownSpecialMove(move) {
    return !(move instanceof Move) && move.type !== "any";
}
export function areSameSpecialMoves(a, b) {
    if (a.type === "any" && b.type === "any") {
        return a.name === b.name;
    }
    return a.type === b.type;
}
export function areSameMoves(a, b) {
    if (a instanceof Move && b instanceof Move) {
        return a.equals(b);
    }
    if (a instanceof Move || b instanceof Move) {
        return false;
    }
    return areSameSpecialMoves(a, b);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW92ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb3ZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxLQUFLLEVBQWEsZUFBZSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzVELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEM7O0dBRUc7QUFDSCxNQUFNLE9BQU8sSUFBSTtJQUVOO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQU5ULFlBQ1MsSUFBd0IsRUFDeEIsRUFBVSxFQUNWLE9BQWdCLEVBQ2hCLEtBQVksRUFDWixTQUFvQixFQUNwQixpQkFBbUM7UUFMbkMsU0FBSSxHQUFKLElBQUksQ0FBb0I7UUFDeEIsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUNWLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLGNBQVMsR0FBVCxTQUFTLENBQVc7UUFDcEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFrQjtJQUN6QyxDQUFDO0lBRUo7OztPQUdHO0lBQ0gsTUFBTSxDQUFDLElBQTZCO1FBQ2xDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNWLE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNELE9BQU8sQ0FDTCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxNQUFNO1lBQzNCLElBQUksQ0FBQyxJQUFJLFlBQVksTUFBTTtZQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksWUFBWSxNQUFNLENBQUM7Z0JBQzdCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxZQUFZLE1BQU0sQ0FBQztnQkFDOUIsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QixJQUFJLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxPQUFPO1lBQzdCLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLEtBQUs7WUFDekIsSUFBSSxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUztZQUNqQyxJQUFJLENBQUMsaUJBQWlCLEtBQUssSUFBSSxDQUFDLGlCQUFpQixDQUNsRCxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVztRQUNULE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxHQUFHO1FBQ0wsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxJQUFJLENBQUMsSUFBSSxZQUFZLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUN2QixDQUFDO2FBQU0sQ0FBQztZQUNOLEdBQUcsSUFBSSxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMxQyxDQUFDO1FBQ0QsR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDO1FBQ25CLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0Y7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLE9BQWU7SUFLMUMsSUFBSSxJQUF3QixDQUFDO0lBQzdCLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDcEIsQ0FBQztTQUFNLENBQUM7UUFDTixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUNELElBQUksR0FBRyxNQUFNLENBQUM7SUFDaEIsQ0FBQztJQUNELE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2pELElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNSLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUNELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUM7SUFDMUQsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUM7QUFDL0IsQ0FBQztBQUVELE1BQU0sQ0FBTixJQUFZLGVBaUJYO0FBakJELFdBQVksZUFBZTtJQUN6QixrQ0FBZSxDQUFBO0lBQ2YsMENBQXVCLENBQUE7SUFDdkIsb0NBQWlCLENBQUE7SUFDakIseUNBQXNCLENBQUE7SUFDdEIsb0NBQWlCLENBQUE7SUFDakIsZ0NBQWEsQ0FBQTtJQUNiLHFEQUFrQyxDQUFBO0lBQ2xDLGdDQUFhLENBQUE7SUFDYixxQ0FBa0IsQ0FBQTtJQUNsQixzQ0FBbUIsQ0FBQTtJQUNuQix1Q0FBb0IsQ0FBQTtJQUNwQix5Q0FBc0IsQ0FBQTtJQUN0QixzREFBbUMsQ0FBQTtJQUNuQyxrREFBK0IsQ0FBQTtJQUMvQixvREFBaUMsQ0FBQTtJQUNqQyw4QkFBVyxDQUFBO0FBQ2IsQ0FBQyxFQWpCVyxlQUFlLEtBQWYsZUFBZSxRQWlCMUI7QUFhRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUFDLElBQXFCO0lBQy9DLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUNsQixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGNBQWMsQ0FBQyxJQUFZO0lBQ3pDLE9BQU8sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDO0FBQy9CLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQUMsSUFBd0I7SUFDekQsT0FBTyxDQUFDLENBQUMsSUFBSSxZQUFZLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssS0FBSyxDQUFDO0FBQ3hELENBQUM7QUFFRCxNQUFNLFVBQVUsbUJBQW1CLENBQUMsQ0FBYyxFQUFFLENBQWM7SUFDaEUsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLEtBQUssRUFBRSxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQzNCLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzQixDQUFDO0FBRUQsTUFBTSxVQUFVLFlBQVksQ0FBQyxDQUFxQixFQUFFLENBQXFCO0lBQ3ZFLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUM7UUFDM0MsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFDRCxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDO1FBQzNDLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUNELE9BQU8sbUJBQW1CLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMifQ==