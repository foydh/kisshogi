// KIF file format (.kif or .kifu)
// See http://kakinoki.o.oo7.jp/kif_format.html
import { appendLine } from "./helpers/string.mjs";
import { millisecondsToHHMMSS, millisecondsToMSS } from "./helpers/time.mjs";
import { Color } from "./color.mjs";
import { InvalidBoardError, InvalidDestinationError, InvalidHandPieceError, InvalidLineError, InvalidMoveError, InvalidMoveNumberError, } from "./errors.mjs";
import { Move, SpecialMoveType, anySpecialMove, isKnownSpecialMove, specialMove, } from "./move.mjs";
import { Piece } from "./piece.mjs";
import { InitialPositionSFEN, Position } from "./position.mjs";
import { Record, RecordMetadata, RecordMetadataKey, } from "./record.mjs";
import { Square } from "./square.mjs";
import { fileToMultiByteChar, formatMove, numberToKanji, parseMoves, pieceTypeToStringForBoard, pieceTypeToStringForMove, rankToKanji, stringToNumber, stringToPieceType, } from "./text.mjs";
export var KakinokiFormatType;
(function (KakinokiFormatType) {
    KakinokiFormatType["KIF"] = "KIF";
    KakinokiFormatType["KI2"] = "KI2";
})(KakinokiFormatType || (KakinokiFormatType = {}));
const metadataKeyMap = {
    先手: RecordMetadataKey.BLACK_NAME,
    後手: RecordMetadataKey.WHITE_NAME,
    下手: RecordMetadataKey.SHITATE_NAME,
    上手: RecordMetadataKey.UWATE_NAME,
    開始日時: RecordMetadataKey.START_DATETIME,
    終了日時: RecordMetadataKey.END_DATETIME,
    対局日: RecordMetadataKey.DATE,
    棋戦: RecordMetadataKey.TOURNAMENT,
    戦型: RecordMetadataKey.STRATEGY,
    表題: RecordMetadataKey.TITLE,
    持ち時間: RecordMetadataKey.TIME_LIMIT,
    秒読み: RecordMetadataKey.BYOYOMI,
    消費時間: RecordMetadataKey.TIME_SPENT,
    場所: RecordMetadataKey.PLACE,
    掲載: RecordMetadataKey.POSTED_ON,
    備考: RecordMetadataKey.NOTE,
    先手省略名: RecordMetadataKey.BLACK_SHORT_NAME,
    後手省略名: RecordMetadataKey.WHITE_SHORT_NAME,
    記録係: RecordMetadataKey.SCOREKEEPER,
    作品番号: RecordMetadataKey.OPUS_NO,
    作品名: RecordMetadataKey.OPUS_NAME,
    作者: RecordMetadataKey.AUTHOR,
    発表誌: RecordMetadataKey.PUBLISHED_BY,
    発表年月: RecordMetadataKey.PUBLISHED_AT,
    出典: RecordMetadataKey.SOURCE,
    手数: RecordMetadataKey.LENGTH,
    完全性: RecordMetadataKey.INTEGRITY,
    分類: RecordMetadataKey.CATEGORY,
    受賞: RecordMetadataKey.AWARD,
    // CSA 形式で規定されている項目
    先手持ち時間: RecordMetadataKey.BLACK_TIME_LIMIT,
    後手持ち時間: RecordMetadataKey.WHITE_TIME_LIMIT,
    最大手数: RecordMetadataKey.MAX_MOVES,
    持将棋: RecordMetadataKey.JISHOGI,
};
/**
 * 柿木形式のメタデータのキー名を RecordMetadataKey へ変換します。
 * @param key
 */
export function kakinokiToMetadataKey(key) {
    return metadataKeyMap[key];
}
const metadataNameMap = {
    [RecordMetadataKey.BLACK_NAME]: "先手",
    [RecordMetadataKey.WHITE_NAME]: "後手",
    [RecordMetadataKey.SHITATE_NAME]: "下手",
    [RecordMetadataKey.UWATE_NAME]: "上手",
    [RecordMetadataKey.START_DATETIME]: "開始日時",
    [RecordMetadataKey.END_DATETIME]: "終了日時",
    [RecordMetadataKey.DATE]: "対局日",
    [RecordMetadataKey.TOURNAMENT]: "棋戦",
    [RecordMetadataKey.STRATEGY]: "戦型",
    [RecordMetadataKey.TITLE]: "表題",
    [RecordMetadataKey.TIME_LIMIT]: "持ち時間",
    [RecordMetadataKey.BYOYOMI]: "秒読み",
    [RecordMetadataKey.TIME_SPENT]: "消費時間",
    [RecordMetadataKey.PLACE]: "場所",
    [RecordMetadataKey.POSTED_ON]: "掲載",
    [RecordMetadataKey.NOTE]: "備考",
    [RecordMetadataKey.BLACK_SHORT_NAME]: "先手省略名",
    [RecordMetadataKey.WHITE_SHORT_NAME]: "後手省略名",
    [RecordMetadataKey.SCOREKEEPER]: "記録係",
    [RecordMetadataKey.OPUS_NO]: "作品番号",
    [RecordMetadataKey.OPUS_NAME]: "作品名",
    [RecordMetadataKey.AUTHOR]: "作者",
    [RecordMetadataKey.PUBLISHED_BY]: "発表誌",
    [RecordMetadataKey.PUBLISHED_AT]: "発表年月",
    [RecordMetadataKey.SOURCE]: "出典",
    [RecordMetadataKey.LENGTH]: "手数",
    [RecordMetadataKey.INTEGRITY]: "完全性",
    [RecordMetadataKey.CATEGORY]: "分類",
    [RecordMetadataKey.AWARD]: "受賞",
    // CSA 形式で規定されている項目
    [RecordMetadataKey.BLACK_TIME_LIMIT]: "先手持ち時間",
    [RecordMetadataKey.WHITE_TIME_LIMIT]: "後手持ち時間",
    [RecordMetadataKey.MAX_MOVES]: "最大手数",
    [RecordMetadataKey.JISHOGI]: "持将棋",
};
/**
 * RecordMetadataKey を柿木形式のメタデータのキー名へ変換します。
 * @param key
 */
export function metadataKeyToKakinoki(key) {
    return metadataNameMap[key];
}
var LineType;
(function (LineType) {
    LineType[LineType["PROGRAM_COMMENT"] = 0] = "PROGRAM_COMMENT";
    LineType[LineType["METADATA"] = 1] = "METADATA";
    LineType[LineType["HANDICAP"] = 2] = "HANDICAP";
    LineType[LineType["BLACK_HAND"] = 3] = "BLACK_HAND";
    LineType[LineType["WHITE_HAND"] = 4] = "WHITE_HAND";
    LineType[LineType["BOARD"] = 5] = "BOARD";
    LineType[LineType["BLACK_TURN"] = 6] = "BLACK_TURN";
    LineType[LineType["WHITE_TURN"] = 7] = "WHITE_TURN";
    LineType[LineType["MOVE"] = 8] = "MOVE";
    LineType[LineType["MOVE2"] = 9] = "MOVE2";
    LineType[LineType["BRANCH"] = 10] = "BRANCH";
    LineType[LineType["COMMENT"] = 11] = "COMMENT";
    LineType[LineType["BOOKMARK"] = 12] = "BOOKMARK";
    LineType[LineType["END_OF_GAME"] = 13] = "END_OF_GAME";
    LineType[LineType["UNKNOWN"] = 14] = "UNKNOWN";
})(LineType || (LineType = {}));
const linePatterns = [
    {
        prefix: /^#/,
        type: LineType.PROGRAM_COMMENT,
        removePrefix: false,
        isPosition: false,
    },
    {
        prefix: /^手合割[：:]/,
        type: LineType.HANDICAP,
        removePrefix: true,
        isPosition: true,
    },
    {
        prefix: /^(先|下)手の持駒[：:]/,
        type: LineType.BLACK_HAND,
        removePrefix: true,
        isPosition: true,
    },
    {
        prefix: /^(後|上)手の持駒[：:]/,
        type: LineType.WHITE_HAND,
        removePrefix: true,
        isPosition: true,
    },
    {
        prefix: /^\|/,
        type: LineType.BOARD,
        removePrefix: false,
        isPosition: true,
    },
    {
        prefix: /^(先|下)手番/,
        type: LineType.BLACK_TURN,
        removePrefix: false,
        isPosition: true,
    },
    {
        prefix: /^(後|上)手番/,
        type: LineType.WHITE_TURN,
        removePrefix: false,
        isPosition: true,
    },
    {
        prefix: /^ *[0-9]+ +/,
        type: LineType.MOVE,
        removePrefix: false,
        isPosition: false,
    },
    {
        prefix: /^[ \u3000]*[▲△▼▽☗☖]/,
        type: LineType.MOVE2,
        removePrefix: false,
        isPosition: false,
    },
    {
        prefix: /^[ \u3000]*変化[：:][ \u3000]*/,
        type: LineType.BRANCH,
        removePrefix: true,
        isPosition: false,
    },
    {
        prefix: /^\*/,
        type: LineType.COMMENT,
        removePrefix: true,
        isPosition: false,
    },
    {
        prefix: /^&/,
        type: LineType.BOOKMARK,
        removePrefix: true,
        isPosition: false,
    },
    {
        prefix: /^まで、?([0-9]+手で)?/,
        type: LineType.END_OF_GAME,
        removePrefix: true,
        isPosition: false,
    },
];
function parseLine(line) {
    for (let i = 0; i < linePatterns.length; i++) {
        const pattern = linePatterns[i];
        const matched = line.match(pattern.prefix);
        if (matched) {
            const begin = pattern.removePrefix ? matched[0].length : 0;
            return {
                type: pattern.type,
                data: line.substring(begin),
                isPosition: pattern.isPosition,
                metadataKey: "",
            };
        }
    }
    const metadataPrefix = line.match(/^[^ ：:]+[：:]/);
    if (metadataPrefix) {
        const prefix = metadataPrefix[0];
        return {
            type: LineType.METADATA,
            data: line.substring(prefix.length),
            isPosition: false,
            metadataKey: prefix.substring(0, prefix.length - 1),
        };
    }
    return {
        type: LineType.UNKNOWN,
        data: line,
        isPosition: false,
        metadataKey: "",
    };
}
function readHandicap(position, data) {
    switch (data.trim()) {
        case "平手":
            position.resetBySFEN(InitialPositionSFEN.STANDARD);
            return;
        case "香落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_LANCE);
            return;
        case "右香落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_RIGHT_LANCE);
            return;
        case "角落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_BISHOP);
            return;
        case "飛車落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_ROOK);
            return;
        case "飛香落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_ROOK_LANCE);
            return;
        case "二枚落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_2PIECES);
            return;
        case "四枚落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_4PIECES);
            return;
        case "六枚落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_6PIECES);
            return;
        case "八枚落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_8PIECES);
            return;
        case "十枚落ち":
            position.resetBySFEN(InitialPositionSFEN.HANDICAP_10PIECES);
            return;
        case "その他":
            position.resetBySFEN(InitialPositionSFEN.EMPTY);
            return;
    }
    // マイナビ系のソフトウェアは「手合割：詰将棋」を使用する場合がある。
    // それを含め柿木将棋で規定していない値が使われるケースがしばしばあり、
    // それらに対して適切な処理を判断しようがなく、
    // エラーを返すわけにも行かないためここでは何もしない。
}
const stringToSpecialMoveType = {
    中断: SpecialMoveType.INTERRUPT,
    投了: SpecialMoveType.RESIGN,
    持将棋: SpecialMoveType.IMPASS,
    千日手: SpecialMoveType.REPETITION_DRAW,
    詰み: SpecialMoveType.MATE,
    詰: SpecialMoveType.MATE,
    不詰: SpecialMoveType.NO_MATE,
    切れ負け: SpecialMoveType.TIMEOUT,
    反則勝ち: SpecialMoveType.FOUL_WIN,
    反則負け: SpecialMoveType.FOUL_LOSE,
    入玉勝ち: SpecialMoveType.ENTERING_OF_KING,
    不戦勝: SpecialMoveType.WIN_BY_DEFAULT,
    不戦敗: SpecialMoveType.LOSE_BY_DEFAULT,
};
const moveRegExp = /^ *([0-9]+) +[▲△▼▽]?([１２３４５６７８９][一二三四五六七八九]|同\u3000*)(王|玉|飛|龍|竜|角|馬|金|銀|成銀|全|桂|成桂|圭|香|成香|杏|歩|と)\u3000*(成?)(打|\([1-9][1-9]\)) *([^ ].*|$)/;
const timeRegExp = /\( *([0-9]+):([0-9]+)\/[0-9: ]*\)/;
const specialMoveRegExp = /^ *([0-9]+) +([^ \u3000]+) *([^ ].*|$)/;
const branchRegExp = /^ *([0-9]+)/;
function readBoard(board, data) {
    if (data.length < 21) {
        return new InvalidBoardError(data);
    }
    const rankStr = data[20];
    const rank = stringToNumber(rankStr);
    if (!rank) {
        return new InvalidBoardError(data);
    }
    for (let x = 0; x < 9; x += 1) {
        const file = 9 - x;
        const square = new Square(file, rank);
        const index = x * 2 + 1;
        const pieceStr = data[index + 1];
        const pieceType = stringToPieceType(pieceStr);
        if (!pieceType) {
            board.remove(square);
            continue;
        }
        const color = data[index] !== "v" ? Color.BLACK : Color.WHITE;
        board.set(square, new Piece(color, pieceType));
    }
}
function readHand(hand, data) {
    // NOTE:
    //   スペースで区切られていないものでも Kifu for Windows や ShogiGUI は読み込める。
    //   See: https://github.com/sunfish-shogi/shogihome/issues/572
    const sections = data.split(/[ 　]/);
    for (const section of sections) {
        if (!section || section === "なし") {
            continue;
        }
        const pieceStr = section[0];
        const numberStr = section.substring(1);
        const pieceType = stringToPieceType(pieceStr);
        const n = stringToNumber(numberStr) || 1;
        if (!pieceType) {
            return new InvalidHandPieceError(section);
        }
        hand.add(pieceType, n);
    }
    return;
}
function readMoveTime(record, data) {
    const timeResult = timeRegExp.exec(data);
    if (timeResult) {
        const minutes = timeResult[1];
        const seconds = timeResult[2];
        const s = Number.parseInt(minutes) * 60 + Number.parseInt(seconds);
        record.current.setElapsedMs(s * 1e3);
    }
}
function readMove(record, data) {
    const result = readRegularMove(record, data);
    if (result instanceof Error) {
        return result;
    }
    else if (result) {
        return;
    }
    if (readSpecialMove(record, data)) {
        return;
    }
    return new InvalidMoveError(data);
}
function readRegularMove(record, data) {
    const result = moveRegExp.exec(data);
    if (!result) {
        return false;
    }
    const num = Number(result[1]);
    const toStr = result[2];
    const pieceTypeStr = result[3];
    const promStr = result[4];
    const fromStr = result[5];
    const time = result[6];
    if (num === 0) {
        return new InvalidMoveNumberError(data);
    }
    record.goto(num - 1);
    let to;
    let from;
    if (toStr.startsWith("同")) {
        if (!(record.current.move instanceof Move)) {
            return new InvalidDestinationError(data);
        }
        to = record.current.move.to;
    }
    else {
        const file = stringToNumber(toStr[0]);
        const rank = stringToNumber(toStr[1]);
        to = new Square(file, rank);
    }
    if (fromStr === "打") {
        from = stringToPieceType(pieceTypeStr);
    }
    else {
        const file = stringToNumber(fromStr[1]);
        const rank = stringToNumber(fromStr[2]);
        from = new Square(file, rank);
    }
    let move = record.position.createMove(from, to);
    if (!move) {
        return new InvalidMoveError(data);
    }
    if (promStr === "成") {
        move = move.withPromote();
    }
    record.append(move, {
        ignoreValidation: true,
    });
    readMoveTime(record, time);
    return true;
}
function readSpecialMove(record, data) {
    const result = specialMoveRegExp.exec(data);
    if (!result) {
        return false;
    }
    const num = Number(result[1]);
    const type = stringToSpecialMoveType[result[2]];
    const time = result[3];
    record.goto(num - 1);
    let move;
    if (type) {
        move = specialMove(type);
    }
    else {
        move = anySpecialMove(result[2]);
    }
    record.append(move, {
        ignoreValidation: true,
    });
    readMoveTime(record, time);
    return true;
}
function readMove2(record, data) {
    const lastMove = record.current.move instanceof Move ? record.current.move : undefined;
    const [moves, e] = parseMoves(record.position, data, lastMove);
    if (e) {
        return e;
    }
    for (const move of moves) {
        record.append(move, { ignoreValidation: true });
    }
}
function readBranch(record, data) {
    const result = branchRegExp.exec(data);
    if (!result) {
        return new InvalidMoveNumberError(data);
    }
    const num = Number(result[1]);
    if (num === 0 || num > record.current.ply + 1) {
        return new InvalidMoveNumberError(data);
    }
    record.goto(num - 1);
}
function readEndOfGame(record, data) {
    const clean = data.replaceAll(/[\s\u3000]/g, "");
    // NOTE: 末尾 "勝ち" は "時間切れにより...の勝ち" "反則勝ち" ともマッチするので最後に判定する必要がある。
    if (clean.startsWith("時間切れ")) {
        record.append(specialMove(SpecialMoveType.TIMEOUT));
    }
    else if (clean.endsWith("反則勝ち")) {
        record.append(specialMove(SpecialMoveType.FOUL_WIN));
    }
    else if (clean.endsWith("反則負け")) {
        record.append(specialMove(SpecialMoveType.FOUL_LOSE));
    }
    else if (clean.endsWith("入玉勝ち")) {
        record.append(specialMove(SpecialMoveType.ENTERING_OF_KING));
    }
    else if (clean.endsWith("勝ち")) {
        record.append(specialMove(SpecialMoveType.RESIGN));
    }
    else {
        const type = stringToSpecialMoveType[clean];
        if (type) {
            record.append(specialMove(type));
        }
        else {
            record.append(anySpecialMove(clean));
        }
    }
}
/**
 * KIF 形式の文字列を読み込みます。
 * @param data
 */
export function importKIF(data) {
    return importKakinoki(data, KakinokiFormatType.KIF);
}
/**
 * KI2 形式の文字列を読み込みます。
 * @param data
 */
export function importKI2(data) {
    return importKakinoki(data, KakinokiFormatType.KI2);
}
function importKakinoki(data, formatType) {
    const metadata = new RecordMetadata();
    const record = new Record();
    const lines = data.split(/\r?\n/);
    const position = new Position();
    let preMoveComment = "";
    let preMoveBookmark = "";
    let isMoveSection = false;
    const startMoveSectionIfNot = () => {
        if (isMoveSection) {
            return;
        }
        record.clear(position);
        record.first.comment = preMoveComment;
        record.first.bookmark = preMoveBookmark;
        isMoveSection = true;
    };
    for (const line of lines) {
        if (line === "") {
            continue;
        }
        const parsed = parseLine(line);
        if (isMoveSection && parsed.isPosition) {
            return new InvalidLineError(line);
        }
        let e;
        switch (parsed.type) {
            case LineType.METADATA: {
                const standardKey = metadataKeyMap[parsed.metadataKey];
                if (standardKey) {
                    metadata.setStandardMetadata(standardKey, parsed.data);
                }
                else {
                    metadata.setCustomMetadata(parsed.metadataKey, parsed.data);
                }
                break;
            }
            case LineType.HANDICAP:
                readHandicap(position, parsed.data);
                break;
            case LineType.BLACK_HAND:
                e = readHand(position.blackHand, parsed.data);
                break;
            case LineType.WHITE_HAND:
                e = readHand(position.whiteHand, parsed.data);
                break;
            case LineType.BOARD:
                e = readBoard(position.board, parsed.data);
                break;
            case LineType.BLACK_TURN:
                position.setColor(Color.BLACK);
                break;
            case LineType.WHITE_TURN:
                position.setColor(Color.WHITE);
                break;
            case LineType.MOVE:
                if (formatType !== KakinokiFormatType.KIF) {
                    return new InvalidLineError(line);
                }
                startMoveSectionIfNot();
                e = readMove(record, parsed.data);
                break;
            case LineType.MOVE2:
                if (formatType !== KakinokiFormatType.KI2) {
                    return new InvalidLineError(line);
                }
                startMoveSectionIfNot();
                e = readMove2(record, parsed.data);
                break;
            case LineType.BRANCH:
                // NOTE:
                //   KIF では指し手の先頭に手数が付与されるので必要ない。
                //   https://github.com/sunfish-shogi/shogihome/issues/570
                //   の不具合により、ヘッダー部に "変化：" で始まる行が存在する場合がある。
                //   指し手が始まるより前に "変化：" が出現しても無視しなければならない。
                if (isMoveSection && formatType === KakinokiFormatType.KI2) {
                    e = readBranch(record, parsed.data);
                }
                break;
            case LineType.COMMENT:
                if (isMoveSection) {
                    record.current.comment = appendLine(record.current.comment, parsed.data);
                }
                else {
                    preMoveComment = appendLine(preMoveComment, parsed.data);
                }
                break;
            case LineType.BOOKMARK:
                if (isMoveSection) {
                    record.current.bookmark = parsed.data;
                }
                else {
                    preMoveBookmark = parsed.data;
                }
                break;
            case LineType.END_OF_GAME:
                // NOTE:
                //   KI2 では "までn手で" で始まる行から終局理由を読み取らなければいけない。
                //   KIF では指し手の一つとしても記載されるので必要ない。
                if (formatType === KakinokiFormatType.KI2) {
                    startMoveSectionIfNot();
                    readEndOfGame(record, parsed.data);
                }
                break;
            case LineType.PROGRAM_COMMENT:
                break;
            case LineType.UNKNOWN:
                break;
        }
        if (e) {
            return e;
        }
    }
    startMoveSectionIfNot();
    record.goto(0);
    record.resetAllBranchSelection();
    record.metadata = metadata;
    return record;
}
const specialMoveToString = {
    [SpecialMoveType.START]: "",
    [SpecialMoveType.RESIGN]: "投了",
    [SpecialMoveType.INTERRUPT]: "中断",
    [SpecialMoveType.MAX_MOVES]: "持将棋",
    [SpecialMoveType.IMPASS]: "持将棋",
    [SpecialMoveType.DRAW]: "持将棋",
    [SpecialMoveType.REPETITION_DRAW]: "千日手",
    [SpecialMoveType.MATE]: "詰み",
    [SpecialMoveType.NO_MATE]: "不詰",
    [SpecialMoveType.TIMEOUT]: "切れ負け",
    [SpecialMoveType.FOUL_WIN]: "反則勝ち",
    [SpecialMoveType.FOUL_LOSE]: "反則負け",
    [SpecialMoveType.ENTERING_OF_KING]: "入玉勝ち",
    [SpecialMoveType.WIN_BY_DEFAULT]: "不戦勝",
    [SpecialMoveType.LOSE_BY_DEFAULT]: "不戦敗",
    [SpecialMoveType.TRY]: "トライ",
};
function formatMetadata(metadata, options) {
    let ret = "";
    const returnCode = options?.returnCode || "\n";
    for (const key of metadata.standardMetadataKeys) {
        ret += metadataNameMap[key] + "：" + metadata.getStandardMetadata(key) + returnCode;
    }
    for (const key of metadata.customMetadataKeys) {
        ret += key + "：" + metadata.getCustomMetadata(key) + returnCode;
    }
    return ret;
}
function formatPosition(position, options) {
    const returnCode = options?.returnCode || "\n";
    switch (position.sfen) {
        case InitialPositionSFEN.STANDARD:
            return "手合割：平手" + returnCode;
        case InitialPositionSFEN.HANDICAP_LANCE:
            return "手合割：香落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_RIGHT_LANCE:
            return "手合割：右香落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_BISHOP:
            return "手合割：角落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_ROOK:
            return "手合割：飛車落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_ROOK_LANCE:
            return "手合割：飛香落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_2PIECES:
            return "手合割：二枚落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_4PIECES:
            return "手合割：四枚落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_6PIECES:
            return "手合割：六枚落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_8PIECES:
            return "手合割：八枚落ち" + returnCode;
        case InitialPositionSFEN.HANDICAP_10PIECES:
            return "手合割：十枚落ち" + returnCode;
    }
    return formatBOD(position, options);
}
function formatBOD(position, options) {
    const returnCode = options?.returnCode || "\n";
    let ret = "";
    ret += "後手の持駒：" + formatHand(position.whiteHand) + returnCode;
    ret += "  ９ ８ ７ ６ ５ ４ ３ ２ １" + returnCode;
    ret += "+---------------------------+" + returnCode;
    for (let y = 0; y < 9; y++) {
        ret += "|";
        for (let x = 0; x < 9; x++) {
            const square = Square.newByXY(x, y);
            const piece = position.board.at(square);
            if (!piece) {
                ret += " ・";
            }
            else if (piece.color === Color.BLACK) {
                ret += " " + pieceTypeToStringForBoard(piece.type);
            }
            else {
                ret += "v" + pieceTypeToStringForBoard(piece.type);
            }
        }
        ret += "|" + rankToKanji(y + 1) + returnCode;
    }
    ret += "+---------------------------+" + returnCode;
    ret += "先手の持駒：" + formatHand(position.blackHand) + returnCode;
    if (position.color === Color.BLACK) {
        ret += "先手番" + returnCode;
    }
    else {
        ret += "後手番" + returnCode;
    }
    return ret;
}
/**
 * KIF 形式の指し手を出力します。
 * @param move 対象の指し手
 * @param prev 直前の指し手 ("同"の判定に使用)
 */
export function formatKIFMove(move, options) {
    let ret = "";
    if (options?.prev && move.to.equals(options.prev.to)) {
        ret += "同\u3000";
    }
    else {
        ret += fileToMultiByteChar(move.to.file);
        ret += rankToKanji(move.to.rank);
    }
    ret += pieceTypeToStringForMove(move.pieceType);
    if (move.promote) {
        ret += "成";
    }
    if (move.from instanceof Square) {
        ret += "(" + move.from.file + move.from.rank + ")";
        ret += ret.length === 7 && options?.padding ? "  " : "";
    }
    else {
        ret += "打";
        ret += options?.padding ? "    " : "";
    }
    return ret;
}
function formatHand(hand) {
    let ret = "";
    hand.forEach((pieceType, n) => {
        if (n >= 1) {
            ret += pieceTypeToStringForBoard(pieceType);
            if (n >= 2) {
                ret += numberToKanji(n);
            }
            ret += "　";
        }
    });
    if (ret === "") {
        ret = "なし";
    }
    return ret;
}
/**
 * KIF形式の文字列を出力します。
 * @param record
 * @param options
 */
export function exportKIF(record, options) {
    let ret = "";
    const returnCode = options?.returnCode || "\n";
    if (options?.comment) {
        for (const line of options.comment.split("\n")) {
            ret += "#" + line + returnCode;
        }
    }
    ret += formatMetadata(record.metadata, options);
    ret += formatPosition(record.initialPosition, options);
    ret += "手数----指手---------消費時間--" + returnCode;
    record.forEach((node) => {
        if (node.ply !== 0) {
            if (!node.isFirstBranch) {
                ret += returnCode;
                ret += "変化：" + node.ply + "手" + returnCode;
            }
            ret += String(node.ply).padStart(4, " ") + " ";
            if (node.move instanceof Move) {
                const prev = node.prev?.move instanceof Move ? node.prev.move : undefined;
                ret += formatKIFMove(node.move, { prev, padding: true });
            }
            else if (isKnownSpecialMove(node.move)) {
                const s = specialMoveToString[node.move.type];
                ret += s + " ".repeat(Math.max(12 - s.length * 2, 0));
            }
            else {
                ret += node.move.name + " ".repeat(Math.max(12 - node.move.name.length * 2, 0));
            }
            const elapsed = millisecondsToMSS(node.elapsedMs);
            const totalElapsed = millisecondsToHHMMSS(node.totalElapsedMs);
            ret += ` (${elapsed}/${totalElapsed})`;
            if (node.branch) {
                // Kifu for Windows にならい、後続の分岐が存在する場合は行末に "+" を付ける。
                ret += "+";
            }
            ret += returnCode;
        }
        if (node.comment.length !== 0) {
            const comment = node.comment.endsWith("\n") ? node.comment.slice(0, -1) : node.comment;
            ret += "*" + comment.replaceAll("\n", returnCode + "*") + returnCode;
        }
        if (node.bookmark.length !== 0) {
            ret += "&" + node.bookmark + returnCode;
        }
    });
    return ret;
}
/**
 * KI2形式の文字列を出力します。
 * @param record
 * @param options
 */
export function exportKI2(record, options) {
    let ret = "";
    let moveCountInLine = 0;
    let lastMoveLength = 0;
    const returnCode = options?.returnCode ? options.returnCode : "\n";
    ret += formatMetadata(record.metadata, options);
    ret += formatPosition(record.initialPosition, options);
    record.forEach((node) => {
        if (node.prev) {
            if (!node.isFirstBranch) {
                if (!ret.endsWith(returnCode)) {
                    ret += returnCode;
                }
                ret += returnCode;
                ret += "変化：" + node.ply + "手" + returnCode;
            }
            if (node.move instanceof Move) {
                const pos = Position.newBySFEN(node.prev.sfen);
                if (!pos) {
                    throw new Error("Invalid SFEN");
                }
                const str = formatMove(pos, node.move, {
                    lastMove: node.prev?.move instanceof Move ? node.prev.move : undefined,
                    compatible: true,
                });
                if (ret.endsWith(returnCode)) {
                    moveCountInLine = 0;
                }
                else {
                    ret += " ".repeat(Math.max(12 - lastMoveLength * 2, 0));
                }
                ret += str;
                lastMoveLength = str.length;
                moveCountInLine++;
                if (moveCountInLine >= 6) {
                    ret += returnCode;
                }
            }
            else {
                if (!ret.endsWith(returnCode)) {
                    ret += returnCode;
                }
                ret += `まで${node.ply - 1}手で`;
                if (isKnownSpecialMove(node.move)) {
                    const [next, last] = node.nextColor === Color.BLACK ? ["先手", "後手"] : ["後手", "先手"];
                    switch (node.move.type) {
                        case SpecialMoveType.RESIGN:
                            ret += `${last}の勝ち`;
                            break;
                        case SpecialMoveType.TIMEOUT:
                            ret += `時間切れにより${last}の勝ち`;
                            break;
                        case SpecialMoveType.ENTERING_OF_KING:
                            ret += `${next}の入玉勝ち`;
                            break;
                        case SpecialMoveType.FOUL_WIN:
                            ret += `${next}の反則勝ち`;
                            break;
                        case SpecialMoveType.FOUL_LOSE:
                            ret += `${next}の反則負け`;
                            break;
                        default:
                            ret += specialMoveToString[node.move.type];
                            break;
                    }
                }
                else {
                    ret += node.move.name;
                }
                ret += returnCode;
            }
        }
        if (node.comment.length !== 0) {
            if (!ret.endsWith(returnCode)) {
                ret += returnCode;
            }
            const comment = node.comment.endsWith("\n") ? node.comment.slice(0, -1) : node.comment;
            ret += "*" + comment.replaceAll("\n", returnCode + "*") + returnCode;
        }
        if (node.bookmark.length !== 0) {
            if (!ret.endsWith(returnCode)) {
                ret += returnCode;
            }
            ret += "&" + node.bookmark + returnCode;
        }
    });
    return ret;
}
export function exportBOD(record, options) {
    let ret = "";
    const returnCode = options?.returnCode || "\n";
    ret += formatBOD(record.position, options);
    const ply = record.current.ply;
    const lastMove = record.current.move instanceof Move ? record.current.move : undefined;
    const lastMoveStr = lastMove ? formatKIFMove(lastMove) : "";
    ret += `手数＝${ply}  ${lastMoveStr}  まで` + returnCode;
    return ret;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FraW5va2kuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMva2FraW5va2kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsa0NBQWtDO0FBQ2xDLCtDQUErQztBQUUvQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUNoQyxPQUFPLEVBQ0wsaUJBQWlCLEVBQ2pCLHVCQUF1QixFQUN2QixxQkFBcUIsRUFDckIsZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixzQkFBc0IsR0FDdkIsTUFBTSxVQUFVLENBQUM7QUFFbEIsT0FBTyxFQUNMLElBQUksRUFFSixlQUFlLEVBQ2YsY0FBYyxFQUNkLGtCQUFrQixFQUNsQixXQUFXLEdBQ1osTUFBTSxRQUFRLENBQUM7QUFDaEIsT0FBTyxFQUFFLEtBQUssRUFBYSxNQUFNLFNBQVMsQ0FBQztBQUMzQyxPQUFPLEVBQXFCLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxNQUFNLFlBQVksQ0FBQztBQUM5RSxPQUFPLEVBR0wsTUFBTSxFQUNOLGNBQWMsRUFDZCxpQkFBaUIsR0FDbEIsTUFBTSxVQUFVLENBQUM7QUFDbEIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNsQyxPQUFPLEVBQ0wsbUJBQW1CLEVBQ25CLFVBQVUsRUFDVixhQUFhLEVBQ2IsVUFBVSxFQUNWLHlCQUF5QixFQUN6Qix3QkFBd0IsRUFDeEIsV0FBVyxFQUNYLGNBQWMsRUFDZCxpQkFBaUIsR0FDbEIsTUFBTSxRQUFRLENBQUM7QUFFaEIsTUFBTSxDQUFOLElBQVksa0JBR1g7QUFIRCxXQUFZLGtCQUFrQjtJQUM1QixpQ0FBVyxDQUFBO0lBQ1gsaUNBQVcsQ0FBQTtBQUNiLENBQUMsRUFIVyxrQkFBa0Is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