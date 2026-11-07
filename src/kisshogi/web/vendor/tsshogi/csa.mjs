// CSA file format (.csa)
// See http://www2.computer-shogi.org/protocol/record_v22.html
import { appendLine } from "./helpers/string.mjs";
import { InvalidLineError, InvalidMoveError, InvalidPieceNameError, InvalidTurnError, PieceNotExistsError, } from "./errors.mjs";
import { Color } from "./color.mjs";
import { anySpecialMove, Move, specialMove, SpecialMoveType } from "./move.mjs";
import { Piece, PieceType, promotedPieceType } from "./piece.mjs";
import { Position, countNotExistingPieces, InitialPositionSFEN, } from "./position.mjs";
import { Record, RecordMetadata, RecordMetadataKey, getBlackPlayerName, getWhitePlayerName, } from "./record.mjs";
import { Square } from "./square.mjs";
var LineType;
(function (LineType) {
    LineType[LineType["VERSION"] = 0] = "VERSION";
    LineType[LineType["EXTENDED_COMMENT"] = 1] = "EXTENDED_COMMENT";
    LineType[LineType["COMMENT"] = 2] = "COMMENT";
    LineType[LineType["BLACK_NAME"] = 3] = "BLACK_NAME";
    LineType[LineType["WHITE_NAME"] = 4] = "WHITE_NAME";
    LineType[LineType["METADATA"] = 5] = "METADATA";
    LineType[LineType["POSITION"] = 6] = "POSITION";
    LineType[LineType["RANK"] = 7] = "RANK";
    LineType[LineType["PIECES"] = 8] = "PIECES";
    LineType[LineType["FIRST_TURN"] = 9] = "FIRST_TURN";
    LineType[LineType["MOVE"] = 10] = "MOVE";
    LineType[LineType["SPECIAL_MOVE"] = 11] = "SPECIAL_MOVE";
    LineType[LineType["ELAPSED"] = 12] = "ELAPSED";
})(LineType || (LineType = {}));
var SectionType;
(function (SectionType) {
    SectionType[SectionType["HEADER"] = 0] = "HEADER";
    SectionType[SectionType["MOVE"] = 1] = "MOVE";
    SectionType[SectionType["NEUTRAL"] = 2] = "NEUTRAL";
})(SectionType || (SectionType = {}));
const linePatterns = [
    {
        pattern: /^V/,
        type: LineType.VERSION,
        sectionType: SectionType.HEADER,
    },
    {
        pattern: /^'\*(.+)$/,
        type: LineType.EXTENDED_COMMENT,
        sectionType: SectionType.NEUTRAL,
    },
    {
        pattern: /^'(.+)$/,
        type: LineType.COMMENT,
        sectionType: SectionType.NEUTRAL,
    },
    {
        pattern: /^N\+(.+)$/,
        type: LineType.BLACK_NAME,
        sectionType: SectionType.HEADER,
    },
    {
        pattern: /^N-(.+)$/,
        type: LineType.WHITE_NAME,
        sectionType: SectionType.HEADER,
    },
    {
        pattern: /^\$([^:]+):(.+)$/,
        type: LineType.METADATA,
        sectionType: SectionType.HEADER,
    },
    {
        pattern: /^PI([1-9]{2}[A-Z]{2})*$/,
        type: LineType.POSITION,
        sectionType: SectionType.HEADER,
    },
    {
        pattern: /^P[1-9]( \* ?|[-+][A-Z][A-Z]){9}$/,
        type: LineType.RANK,
        sectionType: SectionType.HEADER,
    },
    {
        pattern: /^P[-+]([0-9]{2}[A-Z]{2})*/,
        type: LineType.PIECES,
        sectionType: SectionType.HEADER,
    },
    {
        pattern: /^[-+]$/,
        type: LineType.FIRST_TURN,
        sectionType: SectionType.HEADER,
    },
    {
        pattern: /^[-+][0-9]{4}[A-Z]{2}/,
        type: LineType.MOVE,
        sectionType: SectionType.MOVE,
    },
    {
        pattern: /^%[-+A-Z_]+/,
        type: LineType.SPECIAL_MOVE,
        sectionType: SectionType.MOVE,
    },
    {
        pattern: /^T([0-9]+(?:\.[0-9]*)?)/,
        type: LineType.ELAPSED,
        sectionType: SectionType.MOVE,
    },
];
function parseLine(line) {
    const results = [];
    const lines = /^['N$]/.test(line) ? [line] : line.split(",");
    for (const line of lines) {
        for (let i = 0; i < linePatterns.length; i++) {
            const matched = linePatterns[i].pattern.exec(line);
            if (matched) {
                results.push({
                    type: linePatterns[i].type,
                    line: line,
                    args: matched.slice(1),
                    sectionType: linePatterns[i].sectionType,
                });
                break;
            }
        }
    }
    return results;
}
const csaNameToRecordMetadataKey = {
    EVENT: RecordMetadataKey.TITLE,
    SITE: RecordMetadataKey.PLACE,
    START_TIME: RecordMetadataKey.START_DATETIME,
    END_TIME: RecordMetadataKey.END_DATETIME,
    TIME_LIMIT: RecordMetadataKey.TIME_LIMIT,
    TIME: RecordMetadataKey.TIME_LIMIT,
    "TIME+": RecordMetadataKey.BLACK_TIME_LIMIT,
    "TIME-": RecordMetadataKey.WHITE_TIME_LIMIT,
    OPENING: RecordMetadataKey.STRATEGY,
    MAX_MOVES: RecordMetadataKey.MAX_MOVES,
    JISHOGI: RecordMetadataKey.JISHOGI,
    NOTE: RecordMetadataKey.NOTE,
};
const csaNameToPieceType = {
    FU: PieceType.PAWN,
    KY: PieceType.LANCE,
    KE: PieceType.KNIGHT,
    GI: PieceType.SILVER,
    KI: PieceType.GOLD,
    KA: PieceType.BISHOP,
    HI: PieceType.ROOK,
    OU: PieceType.KING,
    TO: PieceType.PROM_PAWN,
    NY: PieceType.PROM_LANCE,
    NK: PieceType.PROM_KNIGHT,
    NG: PieceType.PROM_SILVER,
    UM: PieceType.HORSE,
    RY: PieceType.DRAGON,
};
function parsePosition(line, position) {
    position.resetBySFEN(InitialPositionSFEN.STANDARD);
    for (let i = 2; i + 4 <= line.length; i += 4) {
        const file = Number(line[i]);
        const rank = Number(line[i + 1]);
        position.board.remove(new Square(file, rank));
    }
}
function parseRank(line, position) {
    const rank = Number(line[1]);
    let begin = 2;
    for (let x = 0; x < 9; x += 1) {
        const file = 9 - x;
        const section = line.slice(begin, begin + 3);
        // 次のマス目は通常3文字先になる。
        // ただし " *  * " のように空きマスが続いた時にメールやHTML上で連続する空白がまとめられて " * * " となることがある。
        // これはCSAの仕様といては正しいデータではないが、現実に存在するので配慮する。
        // 3文字先へ進めるが、次の文字が "*" であれば1文字戻る。
        begin += 3;
        if (line[begin] === "*") {
            begin -= 1;
        }
        if (section[0] === " ") {
            continue;
        }
        const color = section[0] === "+" ? Color.BLACK : Color.WHITE;
        const pieceType = csaNameToPieceType[section.slice(1)];
        if (!pieceType) {
            return new InvalidPieceNameError(section);
        }
        position.board.set(new Square(file, rank), new Piece(color, pieceType));
    }
}
function parsePieces(line, position) {
    const color = line[1] === "+" ? Color.BLACK : Color.WHITE;
    for (let begin = 2; begin + 4 <= line.length; begin += 4) {
        const section = line.slice(begin, begin + 4);
        if (section === "00AL") {
            const counts = countNotExistingPieces(position);
            if (color === Color.BLACK) {
                position.blackHand.forEach((pieceType) => {
                    position.blackHand.add(pieceType, counts[pieceType]);
                });
            }
            else {
                position.whiteHand.forEach((pieceType) => {
                    position.whiteHand.add(pieceType, counts[pieceType]);
                });
            }
            return;
        }
        const file = Number(section[0]);
        const rank = Number(section[1]);
        const pieceType = csaNameToPieceType[section.slice(2)];
        if (!pieceType) {
            return new InvalidPieceNameError(section);
        }
        if (file !== 0 && rank !== 0) {
            position.board.set(new Square(file, rank), new Piece(color, pieceType));
        }
        else if (color === Color.BLACK) {
            position.blackHand.add(pieceType, 1);
        }
        else {
            position.whiteHand.add(pieceType, 1);
        }
    }
}
function parseMove(line, position) {
    const color = line[0] === "+" ? Color.BLACK : Color.WHITE;
    if (color != position.color) {
        return new InvalidTurnError(line);
    }
    const fromFile = Number(line[1]);
    const fromRank = Number(line[2]);
    const toFile = Number(line[3]);
    const toRank = Number(line[4]);
    const pieceType = csaNameToPieceType[line.slice(5, 7)];
    if (!pieceType) {
        return new InvalidPieceNameError(line);
    }
    const from = fromFile === 0 && fromRank === 0 ? pieceType : new Square(fromFile, fromRank);
    const to = new Square(toFile, toRank);
    let move = position.createMove(from, to);
    if (!move) {
        return new InvalidMoveError(line);
    }
    if (from instanceof Square) {
        const basePiece = position.board.at(from);
        if (!basePiece) {
            return new PieceNotExistsError(line);
        }
        if (basePiece.type !== pieceType) {
            if (basePiece.promoted().type === pieceType) {
                move = move.withPromote();
            }
            else {
                return new PieceNotExistsError(line);
            }
        }
    }
    return move;
}
/**
 * CSA形式の特殊な指し手の名前をSpecialMoveTypeに変換します。
 * @param name 先頭の % 記号を含めない名前をしていします。
 * @param color 手番を指定します。 +ILLEGAL_ACTION や -ILLEGAL_ACTION の読み取りに使用します。
 */
export function getSpecialMoveByName(name, color) {
    switch (name) {
        case "CHUDAN":
            return specialMove(SpecialMoveType.INTERRUPT);
        case "TORYO":
            return specialMove(SpecialMoveType.RESIGN);
        case "MAX_MOVES":
            return specialMove(SpecialMoveType.MAX_MOVES);
        case "JISHOGI":
            return specialMove(SpecialMoveType.IMPASS);
        case "HIKIWAKE":
            return specialMove(SpecialMoveType.DRAW);
        case "SENNICHITE":
            return specialMove(SpecialMoveType.REPETITION_DRAW);
        case "TSUMI":
            return specialMove(SpecialMoveType.MATE);
        case "FUZUMI":
            return specialMove(SpecialMoveType.NO_MATE);
        case "TIME_UP":
            return specialMove(SpecialMoveType.TIMEOUT);
        case "ILLEGAL_MOVE":
            return specialMove(SpecialMoveType.FOUL_LOSE);
        case "+ILLEGAL_ACTION":
            return specialMove(color == Color.BLACK ? SpecialMoveType.FOUL_LOSE : SpecialMoveType.FOUL_WIN);
        case "-ILLEGAL_ACTION":
            return specialMove(color == Color.WHITE ? SpecialMoveType.FOUL_LOSE : SpecialMoveType.FOUL_WIN);
        case "KACHI":
            return specialMove(SpecialMoveType.ENTERING_OF_KING);
    }
    return anySpecialMove(name);
}
/**
 * CSA形式の指し手を読み取ります。
 * @param position
 * @param line
 */
export function parseCSAMove(position, line) {
    return parseMove(line, position);
}
/**
 * CSA形式の棋譜を読み取ります。
 * @param data
 */
export function importCSA(data) {
    const metadata = new RecordMetadata();
    const record = new Record();
    const position = new Position();
    position.resetBySFEN(InitialPositionSFEN.EMPTY);
    let preMoveComment = "";
    let inMoveSection = false;
    const lines = data.replace(/\r?\n\/(\r?\n[\s\S]*)?$/, "").split(/\r?\n/);
    for (const line of lines) {
        for (const parsed of parseLine(line)) {
            if (parsed.sectionType === SectionType.MOVE && !inMoveSection) {
                return new InvalidLineError(parsed.line);
            }
            // NOTE:
            //   WCSC の棋譜中継ではファイルの末尾に $END_TIME が書かれる。
            //   V2.2 の仕様上は認められないはずだが、エラーにすると実用上困るので無視する。
            if (parsed.sectionType === SectionType.HEADER && inMoveSection) {
                continue;
            }
            switch (parsed.type) {
                case LineType.VERSION:
                    break;
                case LineType.EXTENDED_COMMENT:
                    if (inMoveSection) {
                        record.current.comment = appendLine(record.current.comment, parsed.args[0]);
                    }
                    else {
                        preMoveComment = appendLine(preMoveComment, parsed.args[0]);
                    }
                    break;
                case LineType.COMMENT:
                    break;
                case LineType.BLACK_NAME:
                    metadata.setStandardMetadata(RecordMetadataKey.BLACK_NAME, parsed.args[0]);
                    break;
                case LineType.WHITE_NAME:
                    metadata.setStandardMetadata(RecordMetadataKey.WHITE_NAME, parsed.args[0]);
                    break;
                case LineType.METADATA: {
                    const key = csaNameToRecordMetadataKey[parsed.args[0]];
                    if (key) {
                        metadata.setStandardMetadata(key, parsed.args[1]);
                    }
                    else {
                        metadata.setCustomMetadata(parsed.args[0], parsed.args[1]);
                    }
                    break;
                }
                case LineType.POSITION:
                    parsePosition(parsed.line, position);
                    break;
                case LineType.RANK: {
                    const error = parseRank(parsed.line, position);
                    if (error) {
                        return error;
                    }
                    break;
                }
                case LineType.PIECES: {
                    const error = parsePieces(parsed.line, position);
                    if (error) {
                        return error;
                    }
                    break;
                }
                case LineType.FIRST_TURN:
                    if (parsed.line[0] === "+") {
                        position.setColor(Color.BLACK);
                    }
                    else {
                        position.setColor(Color.WHITE);
                    }
                    record.clear(position);
                    record.first.comment = preMoveComment;
                    inMoveSection = true;
                    break;
                case LineType.MOVE: {
                    const moveOrError = parseMove(parsed.line, record.position);
                    if (moveOrError instanceof Error) {
                        return moveOrError;
                    }
                    record.append(moveOrError, { ignoreValidation: true });
                    break;
                }
                case LineType.SPECIAL_MOVE: {
                    const specialMove = getSpecialMoveByName(parsed.line.slice(1), record.position.color);
                    record.append(specialMove, { ignoreValidation: true });
                    break;
                }
                case LineType.ELAPSED:
                    record.current.setElapsedMs(Number(parsed.args[0]) * 1e3);
                    break;
            }
        }
    }
    if (!inMoveSection) {
        record.clear(position);
        record.first.comment = preMoveComment;
    }
    record.goto(0);
    record.resetAllBranchSelection();
    record.metadata = metadata;
    return record;
}
const timeRegExpV2 = /^[0-9]+:[0-9]{2}\+[0-9]+$/;
const timeRegExpV3 = /^[0-9.]+\+[0-9.]+\+[0-9.]+$/;
function formatMetadata(metadata, options) {
    let ret = "";
    const returnCode = options?.returnCode || "\n";
    const blackName = getBlackPlayerName(metadata);
    if (blackName) {
        ret += "N+" + blackName + returnCode;
    }
    const whiteName = getWhitePlayerName(metadata);
    if (whiteName) {
        ret += "N-" + whiteName + returnCode;
    }
    const event = metadata.getStandardMetadata(RecordMetadataKey.TOURNAMENT) ||
        metadata.getStandardMetadata(RecordMetadataKey.TITLE) ||
        metadata.getStandardMetadata(RecordMetadataKey.OPUS_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.PUBLISHED_BY);
    if (event) {
        ret += "$EVENT:" + event + returnCode;
    }
    const site = metadata.getStandardMetadata(RecordMetadataKey.PLACE);
    if (site) {
        ret += "$SITE:" + site + returnCode;
    }
    const startTime = metadata.getStandardMetadata(RecordMetadataKey.START_DATETIME) ||
        metadata.getStandardMetadata(RecordMetadataKey.DATE);
    if (startTime) {
        // 年月日 YYYY/MM/DD (10文字) については KIF 形式と共通
        ret += "$START_TIME:" + startTime.slice(10) + returnCode;
    }
    const endTime = metadata.getStandardMetadata(RecordMetadataKey.DATE);
    if (endTime) {
        ret += "$END_TIME:" + endTime.slice(10) + returnCode;
    }
    const opening = metadata.getStandardMetadata(RecordMetadataKey.STRATEGY);
    if (opening) {
        ret += "$OPENING:" + opening + returnCode;
    }
    const timeLimit = metadata.getStandardMetadata(RecordMetadataKey.TIME_LIMIT);
    if (timeLimit && timeRegExpV2.test(timeLimit)) {
        ret += "$TIME_LIMIT:" + timeLimit + returnCode;
    }
    else if (timeLimit && timeRegExpV3.test(timeLimit)) {
        ret += "$TIME:" + timeLimit + returnCode;
    }
    const blackTimeLimit = metadata.getStandardMetadata(RecordMetadataKey.BLACK_TIME_LIMIT);
    if (blackTimeLimit && timeRegExpV3.test(blackTimeLimit)) {
        ret += "$TIME+:" + blackTimeLimit + returnCode;
    }
    const whiteTimeLimit = metadata.getStandardMetadata(RecordMetadataKey.WHITE_TIME_LIMIT);
    if (whiteTimeLimit && timeRegExpV3.test(whiteTimeLimit)) {
        ret += "$TIME-:" + whiteTimeLimit + returnCode;
    }
    const maxMoves = metadata.getStandardMetadata(RecordMetadataKey.MAX_MOVES);
    if (maxMoves) {
        ret += "$MAX_MOVES:" + maxMoves + returnCode;
    }
    const jishogi = metadata.getStandardMetadata(RecordMetadataKey.JISHOGI);
    if (jishogi) {
        ret += "$JISHOGI:" + jishogi + returnCode;
    }
    const note = metadata.getStandardMetadata(RecordMetadataKey.NOTE);
    if (note) {
        ret += "$NOTE:" + note + returnCode;
    }
    return ret;
}
const pieceTypeToString = {
    king: "OU",
    rook: "HI",
    dragon: "RY",
    bishop: "KA",
    horse: "UM",
    gold: "KI",
    silver: "GI",
    promSilver: "NG",
    knight: "KE",
    promKnight: "NK",
    lance: "KY",
    promLance: "NY",
    pawn: "FU",
    promPawn: "TO",
};
function formatHand(hand) {
    let ret = "";
    hand.forEach((pieceType, n) => {
        for (let i = 0; i < n; i++) {
            ret += "00" + pieceTypeToString[pieceType];
        }
    });
    return ret;
}
const sfenToPCommand = {
    [InitialPositionSFEN.STANDARD]: ["PI", "+"],
    [InitialPositionSFEN.HANDICAP_LANCE]: ["PI11KY", "-"],
    [InitialPositionSFEN.HANDICAP_RIGHT_LANCE]: ["PI91KY", "-"],
    [InitialPositionSFEN.HANDICAP_BISHOP]: ["PI22KA", "-"],
    [InitialPositionSFEN.HANDICAP_ROOK]: ["PI82HI", "-"],
    [InitialPositionSFEN.HANDICAP_ROOK_LANCE]: ["PI82HI11KY", "-"],
    [InitialPositionSFEN.HANDICAP_2PIECES]: ["PI82HI22KA", "-"],
    [InitialPositionSFEN.HANDICAP_4PIECES]: ["PI82HI22KA11KY91KY", "-"],
    [InitialPositionSFEN.HANDICAP_6PIECES]: ["PI82HI22KA21KE81KE11KY91KY", "-"],
    [InitialPositionSFEN.HANDICAP_8PIECES]: ["PI82HI22KA31GI71GI21KE81KE11KY91KY", "-"],
    [InitialPositionSFEN.HANDICAP_10PIECES]: ["PI82HI22KA41KI61KI31GI71GI21KE81KE11KY91KY", "-"],
};
function formatPosition(position, options) {
    const returnCode = options?.returnCode || "\n";
    const p = sfenToPCommand[position.sfen];
    if (p) {
        return p[0] + returnCode + p[1] + returnCode;
    }
    let ret = "";
    for (let rank = 1; rank <= 9; rank += 1) {
        ret += "P" + rank;
        for (let file = 9; file >= 1; file -= 1) {
            const piece = position.board.at(new Square(file, rank));
            if (!piece) {
                ret += " * ";
            }
            else if (piece.color === Color.BLACK) {
                ret += "+" + pieceTypeToString[piece.type];
            }
            else {
                ret += "-" + pieceTypeToString[piece.type];
            }
        }
        ret += returnCode;
    }
    ret += "P+" + formatHand(position.blackHand) + returnCode;
    ret += "P-" + formatHand(position.whiteHand) + returnCode;
    ret += (position.color === Color.BLACK ? "+" : "-") + returnCode;
    return ret;
}
function formatSquare(square) {
    return square instanceof Square ? `${square.file}${square.rank}` : "00";
}
/**
 * 特殊な指し手のCSA形式文字列を取得します。
 * 先頭の % は含みません。
 * @param move
 * @param color 手番を指定します。 +ILLEGAL_ACTION や -ILLEGAL_ACTION の出力に使用します。
 */
export function getCSASpecialMoveName(move, color) {
    switch (move.type) {
        case SpecialMoveType.INTERRUPT:
            return "CHUDAN";
        case SpecialMoveType.RESIGN:
            return "TORYO";
        case SpecialMoveType.MAX_MOVES:
            return "MAX_MOVES";
        case SpecialMoveType.IMPASS:
            return "JISHOGI";
        case SpecialMoveType.DRAW:
            return "HIKIWAKE";
        case SpecialMoveType.REPETITION_DRAW:
            return "SENNICHITE";
        case SpecialMoveType.MATE:
            return "TSUMI";
        case SpecialMoveType.NO_MATE:
            return "FUZUMI";
        case SpecialMoveType.TIMEOUT:
            return "TIME_UP";
        case SpecialMoveType.FOUL_LOSE:
            return "ILLEGAL_MOVE";
        case SpecialMoveType.FOUL_WIN:
            return color == Color.BLACK ? "-ILLEGAL_ACTION" : "+ILLEGAL_ACTION";
        case SpecialMoveType.ENTERING_OF_KING:
            return "KACHI";
    }
}
/**
 * CSA形式の指し手を出力します。
 * @param move
 */
export function formatCSAMove(move) {
    return ((move.color === Color.BLACK ? "+" : "-") +
        formatSquare(move.from) +
        formatSquare(move.to) +
        pieceTypeToString[move.promote ? promotedPieceType(move.pieceType) : move.pieceType]);
}
/**
 * CSA形式の棋譜を出力します。
 * @param record
 * @param options
 */
export function exportCSA(record, options) {
    const returnCode = options?.returnCode || "\n";
    let ret = "";
    if (options?.v3) {
        ret += "'CSA encoding=" + (options.v3.encoding || "UTF-8") + returnCode;
    }
    if (options?.comment) {
        for (const line of options.comment.split("\n")) {
            ret += "'" + line + returnCode;
        }
    }
    ret += (options?.v3 ? "V3.0" : "V2.2") + returnCode;
    ret += formatMetadata(record.metadata, options);
    ret += formatPosition(record.initialPosition, options);
    record.moves.forEach((node) => {
        if (node.ply !== 0) {
            let move;
            if (node.move instanceof Move) {
                move = formatCSAMove(node.move);
            }
            else {
                const name = getCSASpecialMoveName(node.move, node.nextColor);
                if (name) {
                    move = "%" + name;
                }
            }
            if (move) {
                ret += move + returnCode;
                if (options?.v3?.milliseconds && node.elapsedMs % 1e3 !== 0) {
                    ret += "T" + node.elapsedMs / 1e3 + returnCode;
                }
                else {
                    ret += "T" + Math.floor(node.elapsedMs / 1e3) + returnCode;
                }
            }
        }
        if (node.comment) {
            const comment = node.comment.endsWith("\n") ? node.comment.slice(0, -1) : node.comment;
            comment.split("\n").forEach((line) => {
                ret += "'*" + line + returnCode;
            });
        }
    });
    return ret;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NzYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx5QkFBeUI7QUFDekIsOERBQThEO0FBRTlELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUM5QyxPQUFPLEVBQ0wsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixxQkFBcUIsRUFDckIsZ0JBQWdCLEVBQ2hCLG1CQUFtQixHQUNwQixNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRWhDLE9BQU8sRUFBRSxjQUFjLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBZSxlQUFlLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDekYsT0FBTyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDOUQsT0FBTyxFQUNMLFFBQVEsRUFDUixzQkFBc0IsRUFFdEIsbUJBQW1CLEdBQ3BCLE1BQU0sWUFBWSxDQUFDO0FBQ3BCLE9BQU8sRUFHTCxNQUFNLEVBQ04sY0FBYyxFQUNkLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsa0JBQWtCLEdBQ25CLE1BQU0sVUFBVSxDQUFDO0FBQ2xCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbEMsSUFBSyxRQWNKO0FBZEQsV0FBSyxRQUFRO0lBQ1gsNkNBQU8sQ0FBQTtJQUNQLCtEQUFnQixDQUFBO0lBQ2hCLDZDQUFPLENBQUE7SUFDUCxtREFBVSxDQUFBO0lBQ1YsbURBQVUsQ0FBQTtJQUNWLCtDQUFRLENBQUE7SUFDUiwrQ0FBUSxDQUFBO0lBQ1IsdUNBQUksQ0FBQTtJQUNKLDJDQUFNLENBQUE7SUFDTixtREFBVSxDQUFBO0lBQ1Ysd0NBQUksQ0FBQTtJQUNKLHdEQUFZLENBQUE7SUFDWiw4Q0FBTyxDQUFBO0FBQ1QsQ0FBQyxFQWRJLFFBQVEsS0FB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