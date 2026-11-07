import { reverseColor } from "./color.mjs";
import { directions, MoveType, resolveMoveType, reverseDirection } from "./direction.mjs";
import { Piece, PieceType } from "./piece.mjs";
import { Square } from "./square.mjs";
function sfenCharToNumber(sfen) {
    switch (sfen) {
        case "1":
            return 1;
        case "2":
            return 2;
        case "3":
            return 3;
        case "4":
            return 4;
        case "5":
            return 5;
        case "6":
            return 6;
        case "7":
            return 7;
        case "8":
            return 8;
        case "9":
            return 9;
        default:
            return null;
    }
}
/**
 * 盤面
 */
export class Board {
    squares;
    constructor() {
        this.squares = new Array();
        for (let i = 0; i < 81; i += 1) {
            this.squares.push(null);
        }
        this.resetBySFEN("lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL");
    }
    /**
     * 指定したマスの駒を取得します。
     * @param square
     */
    at(square) {
        return this.squares[square.index];
    }
    /**
     * 指定したマスに駒を配置します。
     * @param square
     * @param piece
     */
    set(square, piece) {
        this.squares[square.index] = piece;
    }
    /**
     * 指定した2マスの駒を入れ替えます。
     * @param square1
     * @param square2
     */
    swap(square1, square2) {
        const tmp = this.squares[square1.index];
        this.squares[square1.index] = this.squares[square2.index];
        this.squares[square2.index] = tmp;
    }
    /**
     * 指定したマスの駒を取り除きます。
     * @param square
     */
    remove(square) {
        const removed = this.squares[square.index];
        this.squares[square.index] = null;
        return removed;
    }
    /**
     * 空ではないマスの一覧を取得します。
     */
    listNonEmptySquares() {
        return Square.all.filter((square) => {
            return this.squares[square.index];
        });
    }
    /**
     * 指定した手番の駒があるマスの一覧を取得します。
     * @param color
     */
    listSquaresByColor(color) {
        return Square.all.filter((square) => {
            const piece = this.squares[square.index];
            return piece && piece.color === color;
        });
    }
    /**
     * 指定した駒があるマスの一覧を取得します。
     * @param target
     */
    listSquaresByPiece(target) {
        return Square.all.filter((square) => {
            const piece = this.squares[square.index];
            return piece && target.equals(piece);
        });
    }
    /**
     * 全てのマスの駒を取り除きます。
     */
    clear() {
        Square.all.forEach((square) => {
            this.squares[square.index] = null;
        });
    }
    /**
     * SFEN形式の文字列を取得します。
     */
    get sfen() {
        let ret = "";
        let empty = 0;
        for (let y = 0; y < 9; y += 1) {
            for (let x = 0; x < 9; x += 1) {
                const piece = this.at(Square.newByXY(x, y));
                if (piece) {
                    if (empty) {
                        ret += empty;
                        empty = 0;
                    }
                    ret += piece.sfen;
                }
                else {
                    empty += 1;
                }
            }
            if (empty) {
                ret += empty;
                empty = 0;
            }
            if (y !== 8) {
                ret += "/";
            }
        }
        return ret;
    }
    /**
     * SFENで盤面を初期化します。
     * @param sfen
     */
    resetBySFEN(sfen) {
        if (!Board.isValidSFEN(sfen)) {
            return false;
        }
        this.clear();
        const rows = sfen.split("/");
        for (let y = 0; y < 9; y += 1) {
            let x = 0;
            for (let i = 0; i < rows[y].length; i += 1) {
                let c = rows[y][i];
                if (c === "+") {
                    i += 1;
                    c += rows[y][i];
                }
                const n = sfenCharToNumber(c);
                if (n) {
                    x += n;
                }
                else {
                    this.set(Square.newByXY(x, y), Piece.newBySFEN(c));
                    x += 1;
                }
            }
        }
        return true;
    }
    /**
     * 指定した手番の玉のマスを返します。
     * @param color
     */
    findKing(color) {
        const king = new Piece(color, PieceType.KING);
        return Square.all.find((square) => {
            const piece = this.at(square);
            if (piece && king.equals(piece)) {
                return true;
            }
            return;
        });
    }
    /**
     * 指定したマスに指定した手番の駒の利きがあるかどうかを判定します。
     * @param target
     * @param color
     * @param option
     */
    hasPower(target, color, option) {
        return !!directions.find((dir) => {
            let step = 0;
            for (let square = target.neighbor(dir); square.valid; square = square.neighbor(dir)) {
                step += 1;
                if (option && option.filled && square.equals(option.filled)) {
                    break;
                }
                if (option && option.ignore && square.equals(option.ignore)) {
                    continue;
                }
                const piece = this.at(square);
                if (piece) {
                    if (piece.color !== color) {
                        return false;
                    }
                    const rdir = reverseDirection(dir);
                    const type = resolveMoveType(piece, rdir);
                    return type === MoveType.LONG || (type === MoveType.SHORT && step === 1);
                }
            }
            return false;
        });
    }
    /**
     * 指定した手番の玉に対して王手がかかっているかどうかを判定します。
     * @param kingColor
     * @param option
     */
    isChecked(kingColor, option) {
        const square = this.findKing(kingColor);
        if (!square) {
            return false;
        }
        return this.hasPower(square, reverseColor(kingColor), {
            filled: option && option.filled,
            ignore: option && option.ignore,
        });
    }
    /**
     * 文字列が正しいSFEN形式であるか判定します。
     * @param sfen
     */
    static isValidSFEN(sfen) {
        const rows = sfen.split("/");
        if (rows.length !== 9) {
            return false;
        }
        for (let y = 0; y < 9; y += 1) {
            let x = 0;
            for (let i = 0; i < rows[y].length; i += 1) {
                let c = rows[y][i];
                if (c === "+") {
                    i += 1;
                    c += rows[y][i];
                }
                const n = sfenCharToNumber(c);
                if (n) {
                    x += n;
                }
                else if (Piece.isValidSFEN(c)) {
                    x += 1;
                }
                else {
                    return false;
                }
            }
            if (x !== 9) {
                return false;
            }
        }
        return true;
    }
    /**
     * 別のオブジェクトから盤面をコピーします。
     * @param board
     */
    copyFrom(board) {
        Square.all.forEach((square) => {
            this.squares[square.index] = board.at(square);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9hcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFTLFlBQVksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDM0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVsQyxTQUFTLGdCQUFnQixDQUFDLElBQVk7SUFDcEMsUUFBUSxJQUFJLEVBQUUsQ0FBQztRQUNiLEtBQUssR0FBRztZQUNOLE9BQU8sQ0FBQyxDQUFDO1FBQ1gsS0FBSyxHQUFHO1lBQ04sT0FBTyxDQUFDLENBQUM7UUFDWCxLQUFLLEdBQUc7WUFDTixPQUFPLENBQUMsQ0FBQztRQUNYLEtBQUssR0FBRztZQUNOLE9BQU8sQ0FBQyxDQUFDO1FBQ1gsS0FBSyxHQUFHO1lBQ04sT0FBTyxDQUFDLENBQUM7UUFDWCxLQUFLLEdBQUc7WUFDTixPQUFPLENBQUMsQ0FBQztRQUNYLEtBQUssR0FBRztZQUNOLE9BQU8sQ0FBQyxDQUFDO1FBQ1gsS0FBSyxHQUFHO1lBQ04sT0FBTyxDQUFDLENBQUM7UUFDWCxLQUFLLEdBQUc7WUFDTixPQUFPLENBQUMsQ0FBQztRQUNYO1lBQ0UsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztBQUNILENBQUM7QUE0Q0Q7O0dBRUc7QUFDSCxNQUFNLE9BQU8sS0FBSztJQUNSLE9BQU8sQ0FBc0I7SUFFckM7UUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksS0FBSyxFQUFTLENBQUM7UUFDbEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENB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