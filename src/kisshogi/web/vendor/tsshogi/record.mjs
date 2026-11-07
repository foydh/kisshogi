import { millisecondsToHHMMSS, millisecondsToMSS } from "./helpers/time.mjs";
import { Color, reverseColor } from "./color.mjs";
import { InvalidMoveError, InvalidUSIError } from "./errors.mjs";
import { Move, SpecialMoveType, areSameMoves, parseUSIMove, specialMove, } from "./move.mjs";
import { InitialPositionSFEN, Position } from "./position.mjs";
import { formatMove, formatSpecialMove } from "./text.mjs";
import { PieceType } from "./piece.mjs";
import { Square } from "./square.mjs";
const usenHandTable = {
    [PieceType.PAWN]: 81 + 10,
    [PieceType.LANCE]: 81 + 11,
    [PieceType.KNIGHT]: 81 + 12,
    [PieceType.SILVER]: 81 + 13,
    [PieceType.GOLD]: 81 + 9,
    [PieceType.BISHOP]: 81 + 14,
    [PieceType.ROOK]: 81 + 15,
    [PieceType.KING]: 81 + 8,
    [PieceType.PROM_PAWN]: 81 + 2,
    [PieceType.PROM_LANCE]: 81 + 3,
    [PieceType.PROM_KNIGHT]: 81 + 4,
    [PieceType.PROM_SILVER]: 81 + 5,
    [PieceType.HORSE]: 81 + 6,
    [PieceType.DRAGON]: 81 + 7,
};
const usenHandReverseTable = {
    [81 + 10]: PieceType.PAWN,
    [81 + 11]: PieceType.LANCE,
    [81 + 12]: PieceType.KNIGHT,
    [81 + 13]: PieceType.SILVER,
    [81 + 9]: PieceType.GOLD,
    [81 + 14]: PieceType.BISHOP,
    [81 + 15]: PieceType.ROOK,
    [81 + 8]: PieceType.KING,
    [81 + 2]: PieceType.PROM_PAWN,
    [81 + 3]: PieceType.PROM_LANCE,
    [81 + 4]: PieceType.PROM_KNIGHT,
    [81 + 5]: PieceType.PROM_SILVER,
    [81 + 6]: PieceType.HORSE,
    [81 + 7]: PieceType.DRAGON,
};
export var RecordMetadataKey;
(function (RecordMetadataKey) {
    RecordMetadataKey["TITLE"] = "title";
    RecordMetadataKey["BLACK_NAME"] = "blackName";
    RecordMetadataKey["WHITE_NAME"] = "whiteName";
    RecordMetadataKey["SHITATE_NAME"] = "shitateName";
    RecordMetadataKey["UWATE_NAME"] = "uwateName";
    RecordMetadataKey["BLACK_SHORT_NAME"] = "blackShortName";
    RecordMetadataKey["WHITE_SHORT_NAME"] = "whiteShortName";
    RecordMetadataKey["START_DATETIME"] = "startDatetime";
    RecordMetadataKey["END_DATETIME"] = "endDatetime";
    RecordMetadataKey["DATE"] = "date";
    RecordMetadataKey["TOURNAMENT"] = "tournament";
    RecordMetadataKey["STRATEGY"] = "strategy";
    RecordMetadataKey["TIME_LIMIT"] = "timeLimit";
    RecordMetadataKey["BLACK_TIME_LIMIT"] = "blackTimeLimit";
    RecordMetadataKey["WHITE_TIME_LIMIT"] = "whiteTimeLimit";
    RecordMetadataKey["BYOYOMI"] = "byoyomi";
    RecordMetadataKey["TIME_SPENT"] = "timeSpent";
    RecordMetadataKey["MAX_MOVES"] = "maxMoves";
    RecordMetadataKey["JISHOGI"] = "jishogi";
    RecordMetadataKey["PLACE"] = "place";
    RecordMetadataKey["POSTED_ON"] = "postedOn";
    RecordMetadataKey["NOTE"] = "note";
    RecordMetadataKey["SCOREKEEPER"] = "scorekeeper";
    // 詰将棋に関する項目
    RecordMetadataKey["OPUS_NO"] = "opusNo";
    RecordMetadataKey["OPUS_NAME"] = "opusName";
    RecordMetadataKey["AUTHOR"] = "author";
    RecordMetadataKey["PUBLISHED_BY"] = "publishedBy";
    RecordMetadataKey["PUBLISHED_AT"] = "publishedAt";
    RecordMetadataKey["SOURCE"] = "source";
    RecordMetadataKey["LENGTH"] = "length";
    RecordMetadataKey["INTEGRITY"] = "integrity";
    RecordMetadataKey["CATEGORY"] = "category";
    RecordMetadataKey["AWARD"] = "award";
})(RecordMetadataKey || (RecordMetadataKey = {}));
/**
 * 先手の対局者名をフルネーム優先で取得します。
 * @param metadata
 */
export function getBlackPlayerName(metadata) {
    return (metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.BLACK_SHORT_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.SHITATE_NAME));
}
/**
 * 後手の対局者名をフルネーム優先で取得します。
 * @param metadata
 */
export function getWhitePlayerName(metadata) {
    return (metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.WHITE_SHORT_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.UWATE_NAME));
}
/**
 * 先手の対局者名を省略名優先で取得します。
 * @param metadata
 */
export function getBlackPlayerNamePreferShort(metadata) {
    return (metadata.getStandardMetadata(RecordMetadataKey.BLACK_SHORT_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.BLACK_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.SHITATE_NAME));
}
/**
 * 後手の対局者名を省略名優先で取得します。
 * @param metadata
 */
export function getWhitePlayerNamePreferShort(metadata) {
    return (metadata.getStandardMetadata(RecordMetadataKey.WHITE_SHORT_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.WHITE_NAME) ||
        metadata.getStandardMetadata(RecordMetadataKey.UWATE_NAME));
}
/**
 * 棋譜メタデータ
 */
export class RecordMetadata {
    standard = new Map();
    custom = new Map();
    /**
     * 定義済みのメタデータのキーの一覧を取得します。
     */
    get standardMetadataKeys() {
        return this.standard.keys();
    }
    /**
     * 定義済みのメタデータを取得します。
     * @param key
     */
    getStandardMetadata(key) {
        return this.standard.get(key);
    }
    /**
     * 定義済みのメタデータを設定します。
     * @param key
     * @param value
     */
    setStandardMetadata(key, value) {
        if (value) {
            this.standard.set(key, value);
        }
        else {
            this.standard.delete(key);
        }
    }
    /**
     * カスタムメタデータのキーの一覧を取得します。
     */
    get customMetadataKeys() {
        return this.custom.keys();
    }
    /**
     * カスタムメタデータを取得します。
     * @param key
     */
    getCustomMetadata(key) {
        return this.custom.get(key);
    }
    /**
     * カスタムメタデータを設定します。
     * @param key
     * @param value
     */
    setCustomMetadata(key, value) {
        if (value) {
            this.custom.set(key, value);
        }
        else {
            this.custom.delete(key);
        }
    }
}
function copyNodeMetadata(source, target) {
    target.comment = source.comment;
    target.bookmark = source.bookmark;
    target.customData = source.customData;
    target.setElapsedMs(source.elapsedMs);
}
class NodeImpl {
    ply;
    prev;
    branchIndex;
    activeBranch;
    nextColor;
    move;
    isCheck;
    displayText;
    sfen;
    next = null;
    branch = null;
    comment = "";
    customData;
    elapsedMs = 0;
    totalElapsedMs = 0;
    bookmark = "";
    constructor(ply, prev, branchIndex, activeBranch, nextColor, move, isCheck, displayText, sfen) {
        this.ply = ply;
        this.prev = prev;
        this.branchIndex = branchIndex;
        this.activeBranch = activeBranch;
        this.nextColor = nextColor;
        this.move = move;
        this.isCheck = isCheck;
        this.displayText = displayText;
        this.sfen = sfen;
    }
    get timeText() {
        const elapsed = millisecondsToMSS(this.elapsedMs);
        const totalElapsed = millisecondsToHHMMSS(this.totalElapsedMs);
        return `${elapsed} / ${totalElapsed}`;
    }
    get hasBranch() {
        return !!this.prev && !!this.prev.next && !!this.prev.next.branch;
    }
    get isFirstBranch() {
        return !this.prev || this.prev.next === this;
    }
    get isLastMove() {
        if (!this.next) {
            return true;
        }
        for (let p = this.next; p; p = p.branch) {
            if (p.move instanceof Move) {
                return false;
            }
        }
        return true;
    }
    updateTotalElapsedMs() {
        this.totalElapsedMs = this.elapsedMs;
        if (this.prev && this.prev.prev) {
            this.totalElapsedMs += this.prev.prev.totalElapsedMs;
        }
    }
    setElapsedMs(elapsedMs) {
        this.elapsedMs = elapsedMs;
        this.updateTotalElapsedMs();
        let p = this.next;
        const stack = [];
        while (p) {
            p.updateTotalElapsedMs();
            if (p.branch) {
                stack.push(p.branch);
            }
            if (p.next) {
                p = p.next;
            }
            else {
                p = stack.pop() || null;
            }
        }
    }
    static newRootEntry(position) {
        return new NodeImpl(0, // ply
        null, // prev
        0, // branchIndex
        true, // activeBranch
        position.color, // color
        specialMove(SpecialMoveType.START), // move
        false, // isCheck
        "開始局面", // displayText
        position.sfen);
    }
}
/**
 * 棋譜
 */
export class Record {
    metadata;
    _initialPosition;
    _position;
    _first;
    _current;
    repetitionCounts = {};
    repetitionStart = {};
    onChangePosition = () => {
        /* noop */
    };
    onClear = () => {
        /* noop */
    };
    onAddNode = () => {
        /* noop */
    };
    onRemoveNode = () => {
        /* noop */
    };
    constructor(position) {
        this.metadata = new RecordMetadata();
        this._initialPosition = position ? position.clone() : new Position();
        this._position = this.initialPosition.clone();
        this._first = NodeImpl.newRootEntry(this._initialPosition);
        this._current = this._first;
        this.incrementRepetition();
    }
    /**
     * 初期局面を返します。
     */
    get initialPosition() {
        return this._initialPosition;
    }
    /**
     * 現在の局面を返します。
     */
    get position() {
        return this._position;
    }
    /**
     * 初期局面のノードを返します。
     * このノードには必ず SpecialMoveType.START が設定されます。
     * first.next が1手目に該当します。
     */
    get first() {
        return this._first;
    }
    /**
     * 現在の局面のノードを返します。
     */
    get current() {
        return this._current;
    }
    /**
     * アクティブな経路の指し手の一覧を返します。
     */
    get moves() {
        const moves = this.movesBefore;
        for (let p = this._current.next; p; p = p.next) {
            while (!p.activeBranch) {
                p = p.branch;
            }
            moves.push(p);
        }
        return moves;
    }
    /**
     * 現在の局面までの指し手の一覧を返します。
     */
    get movesBefore() {
        return this._movesBefore;
    }
    get _movesBefore() {
        const moves = new Array();
        moves.unshift(this._current);
        for (let p = this._current.prev; p; p = p.prev) {
            moves.unshift(p);
        }
        return moves;
    }
    /**
     * アクティブな経路の総手数を返します。
     */
    get length() {
        let len = this._current.ply;
        for (let p = this._current.next; p; p = p.next) {
            while (!p.activeBranch) {
                p = p.branch;
            }
            len = p.ply;
        }
        return len;
    }
    /**
     * 最初の兄弟ノードを返します。
     */
    get branchBegin() {
        return this._current.prev ? this._current.prev.next : this._current;
    }
    /**
     * 指定した局面で棋譜を初期化します。
     * @param position
     */
    clear(position) {
        this.metadata = new RecordMetadata();
        if (position) {
            this._initialPosition = position.clone();
        }
        this._position = this.initialPosition.clone();
        this._first = NodeImpl.newRootEntry(this._initialPosition);
        this._current = this._first;
        this.repetitionCounts = {};
        this.repetitionStart = {};
        this.incrementRepetition();
        this.onClear(this._initialPosition);
        this.onChangePosition();
    }
    /**
     * 1手前に戻ります。
     */
    goBack() {
        if (this._goBack()) {
            this.onChangePosition();
            return true;
        }
        return false;
    }
    _goBack() {
        if (this._current.prev) {
            if (this._current.move instanceof Move) {
                this.decrementRepetition();
                this._position.undoMove(this._current.move);
            }
            this._current = this._current.prev;
            return true;
        }
        return false;
    }
    /**
     * 1手先に進みます。
     */
    goForward() {
        if (this._goForward()) {
            this.onChangePosition();
            return true;
        }
        return false;
    }
    _goForward() {
        if (this._current.next) {
            this._current = this._current.next;
            while (!this._current.activeBranch) {
                this._current = this._current.branch;
            }
            if (this._current.move instanceof Move) {
                this._position.doMove(this._current.move, {
                    ignoreValidation: true,
                });
                this.incrementRepetition();
            }
            return true;
        }
        return false;
    }
    /**
     * アクティブな経路上で指定した手数まで移動します。
     * @param ply
     */
    goto(ply) {
        const orgPly = this._current.ply;
        this._goto(ply);
        if (orgPly !== this._current.ply) {
            this.onChangePosition();
        }
    }
    gotoNode(node) {
        const variation = [];
        let first = node;
        for (let p = node; p.prev; p = p.prev) {
            variation.unshift(p);
            first = p.prev;
        }
        if (this.first !== first) {
            return false;
        }
        const orgNode = this._current;
        this._goto(0);
        for (const p of variation) {
            this._goForward();
            this._switchBranchByIndex(p.branchIndex);
        }
        if (orgNode !== this._current) {
            this.onChangePosition();
        }
        return true;
    }
    _goto(ply) {
        while (ply < this._current.ply) {
            if (!this._goBack()) {
                break;
            }
        }
        while (ply > this._current.ply) {
            if (!this._goForward()) {
                break;
            }
        }
    }
    /**
     * 全ての分岐選択を初期化して最初のノードをアクティブにします。
     */
    resetAllBranchSelection() {
        let confluence = this._current;
        for (let node = this._current; node.prev; node = node.prev) {
            if (!node.isFirstBranch) {
                confluence = node.prev;
            }
        }
        this._forEach((node) => {
            node.activeBranch = node.isFirstBranch;
        });
        if (this._current !== confluence) {
            while (this._current !== confluence) {
                this._goBack();
            }
            this.onChangePosition();
        }
    }
    /**
     * インデクスを指定して兄弟ノードを選択します。
     * @param index
     */
    switchBranchByIndex(index) {
        if (this.current.branchIndex === index) {
            return true;
        }
        if (!this._switchBranchByIndex(index)) {
            return false;
        }
        this.onChangePosition();
        return true;
    }
    _switchBranchByIndex(index) {
        if (this.current.branchIndex === index) {
            return true;
        }
        if (!this._current.prev) {
            return false;
        }
        let ok = false;
        for (let p = this._current.prev.next; p; p = p.branch) {
            if (p.branchIndex === index) {
                p.activeBranch = true;
                if (this._current.move instanceof Move) {
                    this.decrementRepetition();
                    this._position.undoMove(this._current.move);
                }
                this._current = p;
                if (this._current.move instanceof Move) {
                    this._position.doMove(this._current.move, {
                        ignoreValidation: true,
                    });
                    this.incrementRepetition();
                }
                ok = true;
            }
            else {
                p.activeBranch = false;
            }
        }
        if (!ok) {
            this._current.activeBranch = true;
        }
        return ok;
    }
    /**
     * 指し手を追加して1手先に進みます。
     * 現在のノードが特殊な指し手(ex. 投了)の場合は前のノードに戻ってから追加します。
     * 既に同じ指し手が存在する場合はそのノードへ移動します。
     */
    append(move, opt) {
        if (this._append(move, opt)) {
            this.onChangePosition();
            return true;
        }
        return false;
    }
    _append(move, opt) {
        // convert SpecialMoveType to SpecialMove
        if (typeof move === "string") {
            move = specialMove(move);
        }
        // 指し手を表す文字列を取得する。
        const lastMove = this.current.move instanceof Move ? this.current.move : undefined;
        const displayText = move instanceof Move
            ? formatMove(this.position, move, { lastMove })
            : formatSpecialMove(move, this.current.nextColor);
        // 局面を動かす。
        let isCheck = false;
        if (move instanceof Move) {
            if (!this._position.doMove(move, opt)) {
                return false;
            }
            isCheck = this.position.checked;
        }
        // 特殊な指し手のノードの場合は前のノードに戻る。
        if (this._current !== this.first && !(this._current.move instanceof Move)) {
            this._goBack();
        }
        if (move instanceof Move) {
            this.incrementRepetition(this._current.ply + 1);
        }
        // 最終ノードの場合は単に新しいノードを追加する。
        if (!this._current.next) {
            this._current.next = new NodeImpl(this._current.ply + 1, // number
            this._current, // prev
            0, // branchIndex
            true, // activeBranch
            this.position.color, // nextColor
            move, isCheck, displayText, this.position.sfen);
            this._current = this._current.next;
            this._current.setElapsedMs(0);
            this.onAddNode(this._current);
            return true;
        }
        // 既存の兄弟ノードから選択を解除する。
        let p;
        for (p = this._current.next; p; p = p.branch) {
            p.activeBranch = false;
        }
        // 同じ指し手が既に存在する場合はそのノードへ移動して終わる。
        let lastBranch = this._current.next;
        for (p = this._current.next; p; p = p.branch) {
            if (areSameMoves(move, p.move)) {
                this._current = p;
                this._current.activeBranch = true;
                return true;
            }
            lastBranch = p;
        }
        // 兄弟ノードを追加する。
        this._current = new NodeImpl(this._current.ply + 1, // number
        this._current, // prev
        lastBranch.branchIndex + 1, // branchIndex
        true, // activeBranch
        this.position.color, // nextColor
        move, isCheck, displayText, this.position.sfen);
        this._current.setElapsedMs(0);
        lastBranch.branch = this._current;
        this.onAddNode(this._current);
        return true;
    }
    /**
     * 次の兄弟ノードと順序を入れ替えます。
     */
    swapWithNextBranch() {
        if (!this._current.branch) {
            return false;
        }
        return Record.swapWithPreviousBranch(this._current.branch);
    }
    /**
     * 前の兄弟ノードと順序を入れ替えます。
     */
    swapWithPreviousBranch() {
        return Record.swapWithPreviousBranch(this._current);
    }
    static swapWithPreviousBranch(target) {
        const prev = target.prev;
        if (!prev || !prev.next || prev.next == target) {
            return false;
        }
        if (prev.next.branch === target) {
            const pair = prev.next;
            pair.branch = target.branch;
            target.branch = pair;
            prev.next = target;
            [target.branchIndex, pair.branchIndex] = [pair.branchIndex, target.branchIndex];
            return true;
        }
        for (let p = prev.next; p.branch; p = p.branch) {
            if (p.branch.branch === target) {
                const pair = p.branch;
                pair.branch = target.branch;
                target.branch = pair;
                p.branch = target;
                [target.branchIndex, pair.branchIndex] = [pair.branchIndex, target.branchIndex];
                return true;
            }
        }
        return false;
    }
    /**
     * 現在の指し手を削除します。
     */
    removeCurrentMove() {
        const target = this._current;
        if (!this.goBack()) {
            return this.removeNextMove();
        }
        this.onRemoveSubTree(target);
        if (this._current.next === target) {
            this._current.next = target.branch;
        }
        else {
            for (let p = this._current.next; p; p = p.branch) {
                if (p.branch === target) {
                    p.branch = target.branch;
                    break;
                }
            }
        }
        let branchIndex = 0;
        for (let p = this._current.next; p; p = p.branch) {
            p.branchIndex = branchIndex;
            branchIndex += 1;
        }
        if (this._current.next) {
            this._current.next.activeBranch = true;
        }
        this.onChangePosition();
        return true;
    }
    /**
     * 後続の手を全て削除します。
     */
    removeNextMove() {
        if (this._current.next) {
            for (let p = this.current.next; p; p = p.branch) {
                this.onRemoveSubTree(p);
            }
            this._current.next = null;
            return true;
        }
        return false;
    }
    onRemoveSubTree(root) {
        let p = root;
        while (p) {
            if (p.next) {
                p = p.next;
                continue;
            }
            this.onRemoveNode(p);
            if (p === root) {
                return;
            }
            while (!p.branch) {
                if (!p.prev) {
                    return;
                }
                p = p.prev;
                this.onRemoveNode(p);
                if (p === root) {
                    return;
                }
            }
            p = p.branch;
        }
    }
    /**
     * 棋譜をマージします。
     * 経過時間やコメント、しおりが両方にある場合は自分の側を優先します。
     * 初期局面が異なる場合はマージできません。
     * @param record
     */
    merge(record) {
        // 初期局面が異なる場合はマージできない。
        if (this.initialPosition.sfen !== record.initialPosition.sfen) {
            return false;
        }
        // 元居た局面までのパスを記憶する。
        const path = this.movesBefore;
        // 開始局面に戻してマージを実行する。
        this._goto(0);
        this.mergeIntoCurrentPosition(record);
        // 元居た局面まで戻す。
        for (let i = 1; i < path.length; i++) {
            this._append(path[i].move, { ignoreValidation: true });
        }
        return true;
    }
    /**
     * 棋譜を現在の局面からのサブツリーとしてマージします。
     * 経過時間やコメント、しおりが両方にある場合は自分の側を優先します。
     * 開始局面が一致していなくてもマージできますが、指し手が挿入不能な場合その子ノードは無視されます。
     * @param record
     */
    mergeIntoCurrentPosition(record, option) {
        const begin = this._current.ply;
        let errorPly = null;
        let successCount = 0;
        let skipCount = 0;
        // 指し手をマージする。
        record.forEach((node) => {
            if (node.ply === 0) {
                return;
            }
            const ply = begin + node.ply - 1;
            if (errorPly !== null && ply > errorPly) {
                skipCount++;
                return;
            }
            this._goto(ply);
            if (!this._append(node.move, option)) {
                errorPly = ply;
                skipCount++;
                return;
            }
            errorPly = null;
            successCount++;
            if (node.elapsedMs && !this.current.elapsedMs) {
                this.current.setElapsedMs(node.elapsedMs);
            }
            if (node.comment && !this.current.comment) {
                this.current.comment = node.comment;
            }
            if (node.bookmark && !this.current.bookmark) {
                this.current.bookmark = node.bookmark;
            }
            if (node.customData && !this.current.customData) {
                this.current.customData = node.customData;
            }
        });
        // 元居た局面まで戻す。
        this._goto(begin);
        return { successCount, skipCount };
    }
    /**
     * 指定したしおりがある局面まで移動します。
     * @param bookmark
     */
    jumpToBookmark(bookmark) {
        // 既に該当する局面にいる場合は何もしない。
        if (this._current.bookmark === bookmark) {
            return true;
        }
        // 一致するブックマークを探す。
        const node = this.find((node) => node.bookmark === bookmark);
        if (!node) {
            return false;
        }
        // ブックマークのある局面までの経路を配列に書き出す。
        const route = [];
        for (let p = node; p; p = p.prev) {
            route[p.ply] = p;
        }
        // 合流するところまで局面を戻す。
        while (this._current !== route[this._current.ply]) {
            this.goBack();
        }
        // ブックマークのある局面まで指し手を進める。
        while (route.length > this._current.ply + 1) {
            this.append(route[this._current.ply + 1].move);
        }
        this.onChangePosition();
        return true;
    }
    incrementRepetition(ply) {
        const sfen = this.position.sfen;
        if (this.repetitionCounts[sfen]) {
            this.repetitionCounts[sfen] += 1;
        }
        else {
            this.repetitionCounts[sfen] = 1;
            this.repetitionStart[sfen] = ply ?? this.current.ply;
        }
    }
    decrementRepetition() {
        const sfen = this.position.sfen;
        this.repetitionCounts[sfen] -= 1;
        if (this.repetitionCounts[sfen] === 0) {
            delete this.repetitionCounts[sfen];
            delete this.repetitionStart[sfen];
        }
    }
    /**
     * 千日手かどうかを判定します。
     * 現在の局面が4回目以上の同一局面である場合に true を返します。
     */
    get repetition() {
        return this.repetitionCounts[this.position.sfen] >= 4;
    }
    /**
     * 現在の局面まで(Record.current着手後を含む)に指定された局面が何回現れたかを返します。
     * @param position
     */
    getRepetitionCount(position) {
        return this.repetitionCounts[position.sfen] || 0;
    }
    /**
     * 連続王手の千日手かどうかを判定します。
     * 現在の局面が4回目以上の同一局面であり、かつ同一局面が最初に出現したときから一方の王手が連続している場合に true を返します。
     */
    get perpetualCheck() {
        if (!this.repetition) {
            return null;
        }
        const sfen = this.position.sfen;
        const since = this.repetitionStart[sfen];
        let black = true;
        let white = true;
        let color = this.position.color;
        for (let p = this.current; p && p.ply >= since; p = p.prev) {
            color = reverseColor(color);
            if (p.isCheck) {
                continue;
            }
            if (color === Color.BLACK) {
                black = false;
            }
            else {
                white = false;
            }
        }
        return black ? Color.BLACK : white ? Color.WHITE : null;
    }
    /**
     * getUSI をオプション無しで呼び出した場合と同じ値を返します。
     */
    get usi() {
        return this.getUSI();
    }
    /**
     * USI形式の文字列を返します。
     * @param opts
     */
    getUSI(opts) {
        const sfen = this.initialPosition.sfen;
        const useStartpos = opts?.startpos !== false && sfen === InitialPositionSFEN.STANDARD;
        const position = "position " + (useStartpos ? "startpos" : "sfen " + this.initialPosition.sfen);
        const moves = [];
        for (let p = this.first;; p = p.next) {
            while (!p.activeBranch) {
                p = p.branch;
            }
            if (p.move instanceof Move) {
                moves.push(p.move.usi);
            }
            else if (opts?.resign && p.move.type === SpecialMoveType.RESIGN) {
                moves.push("resign");
            }
            else if (opts?.repDraw && p.move.type === SpecialMoveType.REPETITION_DRAW) {
                moves.push("rep_draw");
            }
            else if (opts?.draw && p.move.type === SpecialMoveType.DRAW) {
                moves.push("draw");
            }
            else if (opts?.timeout && p.move.type === SpecialMoveType.TIMEOUT) {
                moves.push("timeout");
            }
            else if (opts?.break && p.move.type === SpecialMoveType.INTERRUPT) {
                moves.push("break");
            }
            else if (opts?.win && p.move.type === SpecialMoveType.ENTERING_OF_KING) {
                moves.push("win");
            }
            if (!p.next || (!opts?.allMoves && p === this.current)) {
                break;
            }
        }
        if (moves.length === 0) {
            return position;
        }
        return [position, "moves"].concat(moves).join(" ");
    }
    /**
     * 現在の局面のSFEN形式の文字列を返します。
     */
    get sfen() {
        return this.position.getSFEN(this._current.ply + 1);
    }
    /**
     * USEN (Url Safe sfen-Extended Notation) 形式の文字列を返します。
     * https://www.slideshare.net/slideshow/scalajs-web/92707205#15
     * @returns [usen, branchIndex]
     */
    get usen() {
        const sfen = this.initialPosition.sfen;
        let usen = sfen === InitialPositionSFEN.STANDARD
            ? ""
            : sfen.replace(/ 1$/, "").replace(/\//g, "_").replace(/ /g, ".").replace(/\+/g, "z");
        let moves = "0.";
        let special = "";
        let lastPly = 0;
        let bi = 0;
        let branchIndex = 0;
        this.forEach((node) => {
            if (node.ply === 0) {
                // root node
                return;
            }
            const move = node.move;
            if (lastPly + 1 !== node.ply) {
                usen += `~${moves}.${special}`;
                moves = `${node.ply - 1}.`;
                bi++;
            }
            if (this.current === node) {
                branchIndex = bi;
            }
            if (!(move instanceof Move)) {
                switch (move.type) {
                    case SpecialMoveType.RESIGN:
                        special = "r";
                        break;
                    case SpecialMoveType.TIMEOUT:
                        special = "t";
                        break;
                    case SpecialMoveType.MAX_MOVES:
                    case SpecialMoveType.IMPASS:
                    case SpecialMoveType.DRAW:
                        special = "j";
                        break;
                    default:
                        // 未定義のものは全て中断として扱う。
                        special = "p";
                        break;
                }
                return;
            }
            const from = move.from instanceof Square
                ? (move.from.rank - 1) * 9 + (move.from.file - 1)
                : usenHandTable[move.from];
            const to = (move.to.rank - 1) * 9 + (move.to.file - 1);
            const m = (from * 81 + to) * 2 + (move.promote ? 1 : 0);
            moves += m.toString(36).padStart(3, "0");
            lastPly = node.ply;
        });
        usen += `~${moves}.${special}`;
        return [usen, branchIndex];
    }
    /**
     * しおりの一覧を返します。
     */
    get bookmarks() {
        const bookmarks = [];
        const existed = {};
        this.forEach((node) => {
            if (node.bookmark && !existed[node.bookmark]) {
                bookmarks.push(node.bookmark);
                existed[node.bookmark] = true;
            }
        });
        return bookmarks;
    }
    // 深さ優先で全てのノードを訪問します。
    forEach(handler) {
        this._forEach(handler);
    }
    _forEach(handler) {
        this.find((node) => {
            handler(node);
            return false;
        });
    }
    find(handler) {
        let p = this._first;
        while (true) {
            if (handler(p)) {
                return p;
            }
            if (p.next) {
                p = p.next;
                continue;
            }
            while (!p.branch) {
                if (!p.prev) {
                    return null;
                }
                p = p.prev;
            }
            p = p.branch;
        }
    }
    getSubtree() {
        // Create a new Record instance with the initial position.
        const subtree = new Record(this.position);
        // Copy the metadata from the current record to the subtree.
        for (const key of Object.values(RecordMetadataKey)) {
            const value = this.metadata.getStandardMetadata(key);
            if (value) {
                subtree.metadata.setStandardMetadata(key, value);
            }
        }
        for (const key of this.metadata.customMetadataKeys) {
            const value = this.metadata.getCustomMetadata(key);
            if (value) {
                subtree.metadata.setCustomMetadata(key, value);
            }
        }
        // Copy the nodes from the current record to the subtree.
        let p = this.current;
        copyNodeMetadata(p, subtree.current);
        if (!p.next) {
            return subtree;
        }
        p = p.next;
        while (true) {
            subtree.append(p.move, { ignoreValidation: true });
            copyNodeMetadata(p, subtree.current);
            if (p.next) {
                p = p.next;
                continue;
            }
            while (!p.branch) {
                if (!p.prev || p.prev === this.current) {
                    subtree.goto(0);
                    return subtree;
                }
                subtree.goBack();
                p = p.prev;
            }
            subtree.goBack();
            p = p.branch;
        }
    }
    on(event, handler) {
        switch (event) {
            case "changePosition":
                this.onChangePosition = handler;
                break;
            case "clear":
                this.onClear = handler;
                break;
            case "addNode":
                this.onAddNode = handler;
                break;
            case "removeNode":
                this.onRemoveNode = handler;
                break;
        }
    }
    /**
     * USI形式の文字列から棋譜を読み込みます。
     * @param data
     */
    static newByUSI(data) {
        const positionStartpos = "position startpos";
        const startpos = "startpos";
        const prefixPositionStartpos = "position startpos ";
        const prefixPositionSFEN = "position sfen ";
        const prefixStartpos = "startpos ";
        const prefixSFEN = "sfen ";
        const prefixMoves = "moves ";
        if (data === positionStartpos || data === startpos) {
            return new Record();
        }
        else if (data.startsWith(prefixPositionStartpos)) {
            return Record.newByUSIFromMoves(data.slice(prefixPositionStartpos.length));
        }
        else if (data.startsWith(prefixPositionSFEN)) {
            return Record.newByUSIFromSFEN(data.slice(prefixPositionSFEN.length));
        }
        else if (data.startsWith(prefixStartpos)) {
            return Record.newByUSIFromMoves(data.slice(prefixStartpos.length));
        }
        else if (data.startsWith(prefixSFEN)) {
            return Record.newByUSIFromSFEN(data.slice(prefixSFEN.length));
        }
        else if (data.startsWith(prefixMoves)) {
            return Record.newByUSIFromMoves(data);
        }
        else {
            return new InvalidUSIError(data);
        }
    }
    static newByUSIFromSFEN(data) {
        const sections = data.split(" ");
        if (sections.length < 3) {
            return new InvalidUSIError(data);
        }
        const movesIndex = sections.length === 3 || sections[3] === "moves" ? 3 : 4;
        const position = Position.newBySFEN(sections.slice(0, movesIndex).join(" "));
        if (!position) {
            return new InvalidUSIError(data);
        }
        return Record.newByUSIFromMoves(sections.slice(movesIndex).join(" "), position);
    }
    static newByUSIFromMoves(data, position) {
        const record = new Record(position);
        if (data.length === 0) {
            return record;
        }
        const sections = data.split(" ");
        if (sections[0] !== "moves") {
            return new InvalidUSIError(data);
        }
        for (let i = 1; i < sections.length; i++) {
            if (sections[i] === "resign") {
                record.append(SpecialMoveType.RESIGN);
                break;
            }
            else if (sections[i] === "rep_draw") {
                record.append(SpecialMoveType.REPETITION_DRAW);
                break;
            }
            else if (sections[i] === "draw") {
                record.append(SpecialMoveType.DRAW);
                break;
            }
            else if (sections[i] === "timeout") {
                record.append(SpecialMoveType.TIMEOUT);
                break;
            }
            else if (sections[i] === "break") {
                record.append(SpecialMoveType.INTERRUPT);
                break;
            }
            else if (sections[i] === "win") {
                record.append(SpecialMoveType.ENTERING_OF_KING);
                break;
            }
            const parsed = parseUSIMove(sections[i]);
            if (!parsed) {
                break;
            }
            let move = record.position.createMove(parsed.from, parsed.to);
            if (!move) {
                return new InvalidMoveError(sections[i]);
            }
            if (parsed.promote) {
                move = move.withPromote();
            }
            record.append(move, { ignoreValidation: true });
        }
        return record;
    }
    /**
     * USEN (Url Safe sfen-Extended Notation) 形式の文字列から棋譜を読み込みます。
     * https://www.slideshare.net/slideshow/scalajs-web/92707205#15
     */
    static newByUSEN(usen, branchIndex, ply) {
        const sections = usen.split("~");
        if (sections.length < 2) {
            return new Error("USEN must have at least 2 sections.");
        }
        const sfen = sections[0].replace(/_/g, "/").replace(/\./g, " ").replace(/z/g, "+");
        const position = sfen === "" ? new Position() : Position.newBySFEN(sfen + " 1");
        if (!position) {
            return new Error("Invalid SFEN in USEN.");
        }
        const record = new Record(position);
        let activeNode = record.first;
        for (let si = 1; si < sections.length; si++) {
            const [n, moves, special] = sections[si].split(".");
            if (!/[0-9]+/.test(n)) {
                return new Error("Invalid USEN ply format.");
            }
            record.goto(parseInt(n));
            for (let i = 0; i < moves.length; i += 3) {
                const m = parseInt(moves.slice(i, i + 3), 36);
                const f = Math.floor(m / 162);
                const from = f < 81 ? new Square((f % 9) + 1, Math.floor(f / 9) + 1) : usenHandReverseTable[f];
                const t = Math.floor((m % 162) / 2);
                const to = new Square((t % 9) + 1, Math.floor(t / 9) + 1);
                const promote = m % 2 === 1;
                const move = record.position.createMove(from, to);
                if (!move) {
                    return new Error("Invalid move in USEN.");
                }
                record.append(promote ? move.withPromote() : move, { ignoreValidation: true });
                if (si - 1 === branchIndex && record.current.ply === ply) {
                    activeNode = record.current;
                }
            }
            if (special === "r") {
                record.append(specialMove(SpecialMoveType.RESIGN));
            }
            else if (special === "t") {
                record.append(specialMove(SpecialMoveType.TIMEOUT));
            }
            else if (special === "j") {
                record.append(specialMove(SpecialMoveType.IMPASS));
            }
            else if (special === "p") {
                record.append(specialMove(SpecialMoveType.INTERRUPT));
            }
            if (si - 1 === branchIndex && record.current.ply === ply) {
                activeNode = record.current;
            }
        }
        if (activeNode === record.first) {
            record.goto(0);
        }
        else {
            const route = [];
            for (let p = activeNode; p; p = p.prev) {
                route[p.ply] = p;
            }
            while (record._current !== route[record._current.ply]) {
                record.goBack();
            }
            while (route.length > record._current.ply + 1) {
                record.append(route[record._current.ply + 1].move);
            }
        }
        return record;
    }
}
/**
 * USI形式の文字列から次の手番を取得します。
 * @param usi
 */
export function getNextColorFromUSI(usi) {
    const sections = usi.trim().split(" ");
    const baseColor = sections[1] === "startpos" || sections[3] === "b" ? Color.BLACK : Color.WHITE;
    const firstMoveIndex = sections[1] === "startpos"
        ? sections[2] === "moves"
            ? 3
            : 2
        : sections[6] === "moves"
            ? 7
            : 6;
    return (sections.length - firstMoveIndex) % 2 === 0 ? baseColor : reverseColor(baseColor);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3JkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JlY29yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzdELE9BQU8sRUFDTCxJQUFJLEVBRUosZUFBZSxFQUNmLFlBQVksRUFDWixZQUFZLEVBQ1osV0FBVyxHQUNaLE1BQU0sUUFBUSxDQUFDO0FBQ2hCLE9BQU8sRUFBbUMsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUNwQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRWxDLE1BQU0sYUFBYSxHQUFHO0lBQ3BCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0lBQzFCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0lBQzNCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0lBQzNCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO0lBQ3hCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0lBQzNCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO0lBQ3hCLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO0lBQzdCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO0lBQzlCLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO0lBQy9CLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO0lBQy9CLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO0lBQ3pCLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDO0NBQzNCLENBQUM7QUFFRixNQUFNLG9CQUFvQixHQUFHO0lBQzNCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJO0lBQ3pCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxLQUFLO0lBQzFCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxNQUFNO0lBQzNCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxNQUFNO0lBQzNCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJO0lBQ3hCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxNQUFNO0lBQzNCLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJO0lBQ3pCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxJQUFJO0lBQ3hCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxTQUFTO0lBQzdCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFNB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