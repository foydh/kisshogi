import { Board } from "./board.mjs";
import { Color, reverseColor, colorToSFEN, parseSFENColor, isValidSFENColor } from "./color.mjs";
import { Move, parseUSIMove } from "./move.mjs";
import { Square } from "./square.mjs";
import { Hand } from "./hand.mjs";
import { Piece, PieceType } from "./piece.mjs";
import { Direction, directionToDeltaMap, movableDirections, MoveType, resolveMoveType, vectorToDirectionAndDistance, } from "./direction.mjs";
// Deprecated: Use InitialPositionSFEN instead.
// NOTICE: ShogiHomeのgame_setting.jsonで使用しているため互換性のために残す。
export var InitialPositionType;
(function (InitialPositionType) {
    InitialPositionType["STANDARD"] = "standard";
    InitialPositionType["EMPTY"] = "empty";
    InitialPositionType["HANDICAP_LANCE"] = "handicapLance";
    InitialPositionType["HANDICAP_RIGHT_LANCE"] = "handicapRightLance";
    InitialPositionType["HANDICAP_BISHOP"] = "handicapBishop";
    InitialPositionType["HANDICAP_ROOK"] = "handicapRook";
    InitialPositionType["HANDICAP_ROOK_LANCE"] = "handicapRookLance";
    InitialPositionType["HANDICAP_2PIECES"] = "handicap2Pieces";
    InitialPositionType["HANDICAP_4PIECES"] = "handicap4Pieces";
    InitialPositionType["HANDICAP_6PIECES"] = "handicap6Pieces";
    InitialPositionType["HANDICAP_8PIECES"] = "handicap8Pieces";
    InitialPositionType["HANDICAP_10PIECES"] = "handicap10Pieces";
    InitialPositionType["TSUME_SHOGI"] = "tsumeShogi";
    InitialPositionType["TSUME_SHOGI_2KINGS"] = "tsumeShogi2Kings";
})(InitialPositionType || (InitialPositionType = {}));
export var InitialPositionSFEN;
(function (InitialPositionSFEN) {
    InitialPositionSFEN["STANDARD"] = "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";
    InitialPositionSFEN["EMPTY"] = "9/9/9/9/9/9/9/9/9 b - 1";
    InitialPositionSFEN["HANDICAP_LANCE"] = "lnsgkgsn1/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_RIGHT_LANCE"] = "1nsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_BISHOP"] = "lnsgkgsnl/1r7/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_ROOK"] = "lnsgkgsnl/7b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_ROOK_LANCE"] = "lnsgkgsn1/7b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_2PIECES"] = "lnsgkgsnl/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_4PIECES"] = "1nsgkgsn1/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_6PIECES"] = "2sgkgs2/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_8PIECES"] = "3gkg3/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["HANDICAP_10PIECES"] = "4k4/9/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL w - 1";
    InitialPositionSFEN["TSUME_SHOGI"] = "4k4/9/9/9/9/9/9/9/9 b 2r2b4g4s4n4l18p 1";
    InitialPositionSFEN["TSUME_SHOGI_2KINGS"] = "4k4/9/9/9/9/9/9/9/4K4 b 2r2b4g4s4n4l18p 1";
})(InitialPositionSFEN || (InitialPositionSFEN = {}));
/**
 * InitialPositionType から SFEN 形式の文字列に変換します。
 * @param type
 */
export function initialPositionTypeToSFEN(type) {
    return {
        [InitialPositionType.STANDARD]: InitialPositionSFEN.STANDARD,
        [InitialPositionType.EMPTY]: InitialPositionSFEN.EMPTY,
        [InitialPositionType.HANDICAP_LANCE]: InitialPositionSFEN.HANDICAP_LANCE,
        [InitialPositionType.HANDICAP_RIGHT_LANCE]: InitialPositionSFEN.HANDICAP_RIGHT_LANCE,
        [InitialPositionType.HANDICAP_BISHOP]: InitialPositionSFEN.HANDICAP_BISHOP,
        [InitialPositionType.HANDICAP_ROOK]: InitialPositionSFEN.HANDICAP_ROOK,
        [InitialPositionType.HANDICAP_ROOK_LANCE]: InitialPositionSFEN.HANDICAP_ROOK_LANCE,
        [InitialPositionType.HANDICAP_2PIECES]: InitialPositionSFEN.HANDICAP_2PIECES,
        [InitialPositionType.HANDICAP_4PIECES]: InitialPositionSFEN.HANDICAP_4PIECES,
        [InitialPositionType.HANDICAP_6PIECES]: InitialPositionSFEN.HANDICAP_6PIECES,
        [InitialPositionType.HANDICAP_8PIECES]: InitialPositionSFEN.HANDICAP_8PIECES,
        [InitialPositionType.HANDICAP_10PIECES]: InitialPositionSFEN.HANDICAP_10PIECES,
        [InitialPositionType.TSUME_SHOGI]: InitialPositionSFEN.TSUME_SHOGI,
        [InitialPositionType.TSUME_SHOGI_2KINGS]: InitialPositionSFEN.TSUME_SHOGI_2KINGS,
    }[type];
}
const invalidRankMap = {
    black: {
        pawn: { 1: true },
        lance: { 1: true },
        knight: { 1: true, 2: true },
    },
    white: {
        pawn: { 9: true },
        lance: { 9: true },
        knight: { 9: true, 8: true },
    },
};
function isInvalidRank(color, type, rank) {
    const rule = invalidRankMap[color][type];
    return rule ? rule[rank] : false;
}
export function isPromotableRank(color, rank) {
    if (color === Color.BLACK) {
        return rank <= 3;
    }
    return rank >= 7;
}
function pawnExists(color, board, file) {
    for (let rank = 1; rank <= 9; rank += 1) {
        const piece = board.at(new Square(file, rank));
        if (piece && piece.type === PieceType.PAWN && piece.color === color) {
            return true;
        }
    }
    return false;
}
/**
 * 局面
 */
export class Position {
    _board = new Board();
    _color = Color.BLACK;
    _blackHand = new Hand();
    _whiteHand = new Hand();
    /**
     * 盤面
     */
    get board() {
        return this._board;
    }
    /**
     * 手番
     */
    get color() {
        return this._color;
    }
    /**
     * 先手の持ち駒
     */
    get blackHand() {
        return this._blackHand;
    }
    /**
     * 後手の持ち駒
     */
    get whiteHand() {
        return this._whiteHand;
    }
    /**
     * 指定した手番の持ち駒を取得します。
     * @param color
     */
    hand(color) {
        if (color === Color.BLACK) {
            return this._blackHand;
        }
        return this._whiteHand;
    }
    /**
     * 王手がかかっているかどうかを判定します。
     */
    get checked() {
        return this._board.isChecked(this.color);
    }
    /**
     * 現在の局面における指し手を生成します。
     * @param from
     * @param to
     */
    createMove(from, to) {
        let pieceType;
        if (from instanceof Square) {
            const piece = this._board.at(from);
            if (!piece) {
                return null;
            }
            pieceType = piece.type;
        }
        else {
            pieceType = from;
        }
        const capturedPiece = this._board.at(to);
        return new Move(from, to, false, this.color, pieceType, capturedPiece ? capturedPiece.type : null);
    }
    /**
     * USI形式の指し手から Move オブジェクトを生成します。
     * @param usiMove
     */
    createMoveByUSI(usiMove) {
        const m = parseUSIMove(usiMove);
        if (!m) {
            return null;
        }
        let move = this.createMove(m.from, m.to);
        if (!move) {
            return null;
        }
        if (m.promote) {
            move = move.withPromote();
        }
        return move;
    }
    /**
     * 打ち歩詰めかどうかを判定します。
     * @param move
     */
    isPawnDropMate(move) {
        if (move.from instanceof Square) {
            return false;
        }
        if (move.pieceType !== PieceType.PAWN) {
            return false;
        }
        const kingSquare = move.to.neighbor(move.color === Color.BLACK ? Direction.UP : Direction.DOWN);
        const king = this.board.at(kingSquare);
        if (!king || king.type !== PieceType.KING || king.color === move.color) {
            return false;
        }
        const movable = movableDirections(king).find((dir) => {
            const to = kingSquare.neighbor(dir);
            if (!to.valid) {
                return false;
            }
            const piece = this.board.at(to);
            if (piece && piece.color == king.color) {
                return false;
            }
            return !this.board.hasPower(to, move.color, { filled: move.to });
        });
        if (movable) {
            return false;
        }
        return !this.board.listSquaresByColor(king.color).find((from) => {
            return (!from.equals(kingSquare) &&
                this.isMovable(from, move.to) &&
                !this.board.isChecked(king.color, {
                    filled: move.to,
                    ignore: from,
                }));
        });
    }
    /**
     * 指定したマスに利いている駒のマス目を列挙します。
     * @param to
     * @param piece
     */
    listAttackers(to) {
        return this.board.listNonEmptySquares().filter((from) => {
            return this.isMovable(from, to);
        });
    }
    /**
     * 指定したマスに利いている指定した駒のマス目を列挙します。
     * @param to
     * @param piece
     */
    listAttackersByPiece(to, piece) {
        return this.board.listSquaresByPiece(piece).filter((from) => {
            return this.isMovable(from, to);
        });
    }
    /**
     * 合法手かどうかを判定します。
     * @param move
     */
    isValidMove(move) {
        if (move.from instanceof Square) {
            const target = this._board.at(move.from);
            if (!target || target.color !== this.color || target.type !== move.pieceType) {
                return false;
            }
            if (!this.isMovable(move.from, move.to)) {
                return false;
            }
            const captured = this._board.at(move.to);
            if (captured && captured.color === this.color) {
                return false;
            }
            if ((captured === null) !== (move.capturedPieceType === null)) {
                return false;
            }
            if (captured && move.capturedPieceType && captured.type !== move.capturedPieceType) {
                return false;
            }
            if (move.promote) {
                if (!target.isPromotable()) {
                    return false;
                }
                if (!isPromotableRank(this.color, move.from.rank) &&
                    !isPromotableRank(this.color, move.to.rank)) {
                    return false;
                }
            }
            else if (isInvalidRank(this.color, target.type, move.to.rank)) {
                return false;
            }
            if (move.pieceType !== PieceType.KING
                ? this._board.isChecked(this.color, {
                    filled: move.to,
                    ignore: move.from,
                })
                : this._board.hasPower(move.to, reverseColor(this.color), {
                    ignore: move.from,
                })) {
                return false;
            }
        }
        else {
            if (move.promote) {
                return false;
            }
            if (move.color !== this.color) {
                return false;
            }
            if (this.hand(this.color).count(move.from) === 0) {
                return false;
            }
            if (this._board.at(move.to)) {
                return false;
            }
            if (isInvalidRank(this.color, move.from, move.to.rank)) {
                return false;
            }
            if (move.from === PieceType.PAWN && pawnExists(this.color, this._board, move.to.file)) {
                return false;
            }
            if (this._board.isChecked(this.color, { filled: move.to })) {
                return false;
            }
            if (this.isPawnDropMate(move)) {
                return false;
            }
        }
        return true;
    }
    /**
     * 指定した指し手で駒を動かします。
     * @param move
     * @param opt
     */
    doMove(move, opt) {
        if (!(opt && opt.ignoreValidation) && !this.isValidMove(move)) {
            return false;
        }
        if (move.from instanceof Square) {
            const target = this._board.at(move.from);
            if (!target) {
                return false;
            }
            const captured = this._board.at(move.to);
            this._board.remove(move.from);
            this._board.set(move.to, move.promote ? target.promoted() : target);
            if (captured && captured.type !== PieceType.KING) {
                this.hand(this.color).add(captured.unpromoted().type, 1);
            }
        }
        else {
            this.hand(this.color).reduce(move.from, 1);
            this._board.set(move.to, new Piece(this.color, move.from));
        }
        this._color = reverseColor(this.color);
        return true;
    }
    /**
     * 指定した指し手を元に戻します。
     * @param move
     * @param opt
     */
    undoMove(move) {
        this._color = reverseColor(this.color);
        if (move.from instanceof Square) {
            this._board.set(move.from, new Piece(this.color, move.pieceType));
            if (move.capturedPieceType) {
                const capturedPiece = new Piece(reverseColor(this.color), move.capturedPieceType);
                this._board.set(move.to, capturedPiece);
                if (capturedPiece.type !== PieceType.KING) {
                    this.hand(this.color).reduce(capturedPiece.unpromoted().type, 1);
                }
            }
            else {
                this._board.remove(move.to);
            }
        }
        else {
            this.hand(this.color).add(move.from, 1);
            this._board.remove(move.to);
        }
    }
    /**
     * 有効な編集作業かどうかを判定します。
     * @param from
     * @param to
     */
    isValidEditing(from, to) {
        if (from instanceof Square) {
            const piece = this._board.at(from);
            if (!piece) {
                return false;
            }
            if (to instanceof Square) {
                if (from.equals(to)) {
                    return false;
                }
            }
            else if (piece.type === PieceType.KING) {
                return false;
            }
        }
        else {
            if (!from.color) {
                return false;
            }
            if (this.hand(from.color).count(from.type) === 0) {
                return false;
            }
            if (to instanceof Square) {
                if (this._board.at(to)) {
                    return false;
                }
            }
            else if (from.color === to) {
                return false;
            }
        }
        return true;
    }
    /**
     * 盤面を編集します。
     * @param change
     */
    edit(change) {
        if (change.move) {
            if (!this.isValidEditing(change.move.from, change.move.to)) {
                return false;
            }
            if (!(change.move.from instanceof Square)) {
                this.hand(change.move.from.color).reduce(change.move.from.type, 1);
                if (change.move.to instanceof Square) {
                    this._board.set(change.move.to, change.move.from);
                }
                else {
                    this.hand(change.move.to).add(change.move.from.type, 1);
                }
            }
            else if (!(change.move.to instanceof Square)) {
                const piece = this._board.remove(change.move.from);
                this.hand(change.move.to).add(piece.unpromoted().type, 1);
            }
            else {
                this._board.swap(change.move.from, change.move.to);
            }
        }
        if (change.rotate) {
            const piece = this._board.at(change.rotate);
            if (piece) {
                this._board.set(change.rotate, piece.rotate());
            }
        }
        return true;
    }
    // Deprecated: Use resetBySFEN() instead.
    reset(type) {
        this.resetBySFEN(initialPositionTypeToSFEN(type));
    }
    /**
     * SFEN形式の文字列を返します。
     */
    get sfen() {
        return this.getSFEN(1);
    }
    /**
     * 手数を指定してSFEN形式の文字列を取得します。
     * @param nextPly
     */
    getSFEN(nextPly) {
        let ret = `${this._board.sfen} ${colorToSFEN(this.color)} `;
        ret += Hand.formatSFEN(this._blackHand, this._whiteHand);
        ret += " " + Math.max(nextPly, 1);
        return ret;
    }
    /**
     * SFENで盤面を初期化します。
     * @param sfen
     */
    resetBySFEN(sfen) {
        if (!Position.isValidSFEN(sfen)) {
            return false;
        }
        const sections = sfen.split(" ");
        if (sections[0] === "sfen") {
            sections.shift();
        }
        this._board.resetBySFEN(sections[0]);
        this._color = parseSFENColor(sections[1]);
        const hands = Hand.parseSFEN(sections[2]);
        this._blackHand = hands.black;
        this._whiteHand = hands.white;
        return true;
    }
    /**
     * 手番を設定します。
     * @param color
     */
    setColor(color) {
        this._color = color;
    }
    /**
     * 正しいSFEN形式の文字列かどうかを判定します。
     * @param sfen
     */
    static isValidSFEN(sfen) {
        const sections = sfen.split(" ");
        if ((sections.length === 5 || sections.length === 4) && sections[0] === "sfen") {
            sections.shift();
        }
        if (sections.length !== 4 && sections.length !== 3) {
            return false;
        }
        if (!Board.isValidSFEN(sections[0])) {
            return false;
        }
        if (!isValidSFENColor(sections[1])) {
            return false;
        }
        if (!Hand.isValidSFEN(sections[2])) {
            return false;
        }
        if (sections.length === 4 && !/[0-9]+/.test(sections[3])) {
            return false;
        }
        return true;
    }
    /**
     * SFEN形式の文字列から局面を生成します。
     */
    static newBySFEN(sfen) {
        const position = new Position();
        return position.resetBySFEN(sfen) ? position : null;
    }
    isMovable(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const { direction, distance, ok } = vectorToDirectionAndDistance(dx, dy);
        if (!ok) {
            return false;
        }
        const piece = this._board.at(from);
        if (!piece) {
            return false;
        }
        switch (resolveMoveType(piece, direction)) {
            default:
                return false;
            case MoveType.SHORT:
                return distance === 1;
            case MoveType.LONG: {
                const d = directionToDeltaMap[direction];
                for (let square = from.neighbor(d.x, d.y); square.valid; square = square.neighbor(d.x, d.y)) {
                    if (square.equals(to)) {
                        return true;
                    }
                    if (this._board.at(square)) {
                        return false;
                    }
                }
                return false;
            }
        }
    }
    /**
     * 別のオブジェクトからコピーします。
     * @param position
     */
    copyFrom(position) {
        this._board.copyFrom(position._board);
        this._color = position.color;
        this._blackHand.copyFrom(position._blackHand);
        this._whiteHand.copyFrom(position._whiteHand);
    }
    /**
     * クローンを生成します。
     */
    clone() {
        const position = new Position();
        position.copyFrom(this);
        return position;
    }
}
export function countExistingPieces(position) {
    const result = {
        pawn: 0,
        lance: 0,
        knight: 0,
        silver: 0,
        gold: 0,
        bishop: 0,
        rook: 0,
        king: 0,
        promPawn: 0,
        promLance: 0,
        promKnight: 0,
        promSilver: 0,
        horse: 0,
        dragon: 0,
    };
    Square.all.forEach((square) => {
        const piece = position.board.at(square);
        if (piece) {
            result[piece.type] += 1;
        }
    });
    position.blackHand.forEach((pieceType, n) => {
        result[pieceType] += n;
    });
    position.whiteHand.forEach((pieceType, n) => {
        result[pieceType] += n;
    });
    return result;
}
export function countNotExistingPieces(position) {
    const existed = countExistingPieces(position);
    return {
        pawn: 18 - existed.pawn - existed.promPawn,
        lance: 4 - existed.lance - existed.promLance,
        knight: 4 - existed.knight - existed.promKnight,
        silver: 4 - existed.silver - existed.promSilver,
        gold: 4 - existed.gold,
        bishop: 2 - existed.bishop - existed.horse,
        rook: 2 - existed.rook - existed.dragon,
        king: 2 - existed.king,
        promPawn: 0,
        promLance: 0,
        promKnight: 0,
        promSilver: 0,
        horse: 0,
        dragon: 0,
    };
}
export var JishogiDeclarationRule;
(function (JishogiDeclarationRule) {
    JishogiDeclarationRule["GENERAL24"] = "general24";
    JishogiDeclarationRule["GENERAL27"] = "general27";
})(JishogiDeclarationRule || (JishogiDeclarationRule = {}));
export var JishogiDeclarationResult;
(function (JishogiDeclarationResult) {
    JishogiDeclarationResult["WIN"] = "win";
    JishogiDeclarationResult["LOSE"] = "lose";
    JishogiDeclarationResult["DRAW"] = "draw";
})(JishogiDeclarationResult || (JishogiDeclarationResult = {}));
function invadingPieces(board, color) {
    return board
        .listNonEmptySquares()
        .filter((square) => {
        if (!isPromotableRank(color, square.rank)) {
            return false;
        }
        const piece = board.at(square);
        return piece?.color === color && piece?.type !== PieceType.KING;
    })
        .map((square) => board.at(square));
}
/**
 * 時将棋指し直し判定の点数を計算します。
 * 入玉宣言法と異なり、敵陣に侵入していない駒も加点対象となります。
 * 時将棋指し直しは原則として対局者の合意によって成立し、ここで求められる点数はあくまで参考値です。
 * @param position
 * @param color 計算対象のプレイヤー
 * @returns
 */
export function countJishogiPoint(position, color) {
    let point = 0;
    Square.all.forEach((square) => {
        const piece = position.board.at(square);
        if (piece?.color === color && piece.type !== PieceType.KING) {
            const type = piece.unpromoted().type;
            point += type === PieceType.BISHOP || type === PieceType.ROOK ? 5 : 1;
        }
    });
    const hand = position.hand(color);
    point +=
        hand.count(PieceType.PAWN) +
            hand.count(PieceType.LANCE) +
            hand.count(PieceType.KNIGHT) +
            hand.count(PieceType.SILVER) +
            hand.count(PieceType.GOLD) +
            hand.count(PieceType.BISHOP) * 5 +
            hand.count(PieceType.ROOK) * 5;
    if (color === Color.WHITE) {
        // 駒落ちの場合は上手に落とした駒を加点する。
        const notExisting = countNotExistingPieces(position);
        point +=
            notExisting.pawn +
                notExisting.lance +
                notExisting.knight +
                notExisting.silver +
                notExisting.gold +
                notExisting.bishop * 5 +
                notExisting.rook * 5;
    }
    return point;
}
/**
 * 入玉宣言法に基づいて宣言する際の点数を計算します。
 * 敵陣に侵入している駒と持ち駒だけが対象となり、それ以外の駒は加点対象になりません。
 * @param position
 * @param color 宣言するプレイヤー
 */
export function countJishogiDeclarationPoint(position, color) {
    let point = 0;
    for (const piece of invadingPieces(position.board, color)) {
        const type = piece.unpromoted().type;
        point += type === PieceType.BISHOP || type === PieceType.ROOK ? 5 : 1;
    }
    const hand = position.hand(color);
    point +=
        hand.count(PieceType.PAWN) +
            hand.count(PieceType.LANCE) +
            hand.count(PieceType.KNIGHT) +
            hand.count(PieceType.SILVER) +
            hand.count(PieceType.GOLD) +
            hand.count(PieceType.BISHOP) * 5 +
            hand.count(PieceType.ROOK) * 5;
    if (color === Color.WHITE) {
        // 駒落ちの場合は上手に落とした駒を加点する。
        const notExisting = countNotExistingPieces(position);
        point +=
            notExisting.pawn +
                notExisting.lance +
                notExisting.knight +
                notExisting.silver +
                notExisting.gold +
                notExisting.bishop * 5 +
                notExisting.rook * 5;
    }
    return point;
}
/**
 * 入玉宣言法に基づいて宣言した場合の結果を判定します。
 * @param rule
 * @param position
 * @param color 宣言するプレイヤー
 */
export function judgeJishogiDeclaration(rule, position, color) {
    // 自分の手番か。
    if (position.color !== color) {
        return JishogiDeclarationResult.LOSE;
    }
    // 玉が敵陣に入っているか。
    const king = position.board.findKing(color);
    if (!king || !isPromotableRank(color, king.rank)) {
        return JishogiDeclarationResult.LOSE;
    }
    // 王手されていないか。
    if (position.board.isChecked(color)) {
        return JishogiDeclarationResult.LOSE;
    }
    // 敵陣に 10 枚以上駒が侵入しているか。
    if (invadingPieces(position.board, color).length < 10) {
        return JishogiDeclarationResult.LOSE;
    }
    // 点数を計算する。
    const point = countJishogiDeclarationPoint(position, color);
    // 24 点法
    if (rule === JishogiDeclarationRule.GENERAL24) {
        return point >= 31
            ? JishogiDeclarationResult.WIN // 31 点以上で勝ち
            : point >= 24
                ? JishogiDeclarationResult.DRAW // 24 点以上31点未満で引き分け
                : JishogiDeclarationResult.LOSE; // 24 点未満で負け
    }
    // 27 点法
    if (color === Color.BLACK) {
        // 先手は 28 点以上で勝ち
        // 足りなければ負け
        return point >= 28 ? JishogiDeclarationResult.WIN : JishogiDeclarationResult.LOSE;
    }
    else {
        // 後手は 27 点以上で勝ち
        // 足りなければ負け
        return point >= 27 ? JishogiDeclarationResult.WIN : JishogiDeclarationResult.LOSE;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9zaXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcG9zaXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBa0IsTUFBTSxTQUFTLENBQUM7QUFDaEQsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM3RixPQUFPLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM1QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ2xDLE9BQU8sRUFBRSxJQUFJLEVBQWlCLE1BQU0sUUFBUSxDQUFDO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzNDLE9BQU8sRUFDTCxTQUFTLEVBQ1QsbUJBQW1CLEVBQ25CLGlCQUFpQixFQUNqQixRQUFRLEVBQ1IsZUFBZSxFQUNmLDRCQUE0QixHQUM3QixNQUFNLGFBQWEsQ0FBQztBQUVyQiwrQ0FBK0M7QUFDL0MseURBQXlEO0FBQ3pELE1BQU0sQ0FBTixJQUFZLG1CQWVYO0FBZkQsV0FBWSxtQkFBbUI7SUFDN0IsNENBQXFCLENBQUE7SUFDckIsc0NBQWUsQ0FBQTtJQUNmLHVEQUFnQyxDQUFBO0lBQ2hDLGtFQUEyQyxDQUFBO0lBQzNDLHlEQUFrQyxDQUFBO0lBQ2xDLHFEQUE4QixDQUFBO0lBQzlCLGdFQUF5QyxDQUFBO0lBQ3pDLDJEQUFvQyxDQUFBO0lBQ3BDLDJEQUFvQyxDQUFBO0lBQ3BDLDJEQUFvQyxDQUFBO0lBQ3BDLDJEQUFvQyxDQUFBO0lBQ3BDLDZEQUFzQyxDQUFBO0lBQ3RDLGlEQUEwQixDQUFBO0lBQzFCLDhEQUF1QyxDQUFBO0FBQ3pDLENBQUMsRUFmVyxtQkFBbUIsS0FBbkIsbUJBQW1CLFFBZTlCO0FBRUQsTUFBTSxDQUFOLElBQVks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