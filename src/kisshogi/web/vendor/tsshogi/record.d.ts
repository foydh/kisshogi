import { Color } from "./color";
import { Move, SpecialMove, SpecialMoveType } from "./move";
import { DoMoveOption, ImmutablePosition } from "./position";
export declare enum RecordMetadataKey {
    TITLE = "title",// 表題
    BLACK_NAME = "blackName",// 先手
    WHITE_NAME = "whiteName",// 後手
    SHITATE_NAME = "shitateName",// 下手
    UWATE_NAME = "uwateName",// 上手
    BLACK_SHORT_NAME = "blackShortName",// 先手省略名
    WHITE_SHORT_NAME = "whiteShortName",// 後手省略名
    START_DATETIME = "startDatetime",// 開始日時
    END_DATETIME = "endDatetime",// 終了日時
    DATE = "date",// 対局日
    TOURNAMENT = "tournament",// 棋戦
    STRATEGY = "strategy",// 戦型
    TIME_LIMIT = "timeLimit",// 持ち時間
    BLACK_TIME_LIMIT = "blackTimeLimit",// 先手の持ち時間 (CSA V3)
    WHITE_TIME_LIMIT = "whiteTimeLimit",// 後手の持ち時間 (CSA V3)
    BYOYOMI = "byoyomi",// 秒読み
    TIME_SPENT = "timeSpent",// 消費時間
    MAX_MOVES = "maxMoves",// 最大手数 (CSA V3)
    JISHOGI = "jishogi",// 持将棋規定 (CSA V3)
    PLACE = "place",// 場所
    POSTED_ON = "postedOn",// 掲載
    NOTE = "note",// 備考
    SCOREKEEPER = "scorekeeper",// 記録係
    OPUS_NO = "opusNo",// 作品番号
    OPUS_NAME = "opusName",// 作品名
    AUTHOR = "author",// 作者
    PUBLISHED_BY = "publishedBy",// 発表誌
    PUBLISHED_AT = "publishedAt",// 発表年月
    SOURCE = "source",// 出典
    LENGTH = "length",// 手数
    INTEGRITY = "integrity",// 完全性
    CATEGORY = "category",// 分類
    AWARD = "award"
}
/**
 * 棋譜メタデータ(読み取り専用)
 */
export interface ImmutableRecordMetadata {
    /**
     * 定義済みのメタデータのキーの一覧を取得します。
     */
    get standardMetadataKeys(): IterableIterator<RecordMetadataKey>;
    /**
     * 定義済みのメタデータを取得します。
     * @param key
     */
    getStandardMetadata(key: RecordMetadataKey): string | undefined;
    /**
     * カスタムメタデータのキーの一覧を取得します。
     */
    get customMetadataKeys(): IterableIterator<string>;
    /**
     * カスタムメタデータを取得します。
     * @param key
     */
    getCustomMetadata(key: string): string | undefined;
}
/**
 * 先手の対局者名をフルネーム優先で取得します。
 * @param metadata
 */
export declare function getBlackPlayerName(metadata: ImmutableRecordMetadata): string | undefined;
/**
 * 後手の対局者名をフルネーム優先で取得します。
 * @param metadata
 */
export declare function getWhitePlayerName(metadata: ImmutableRecordMetadata): string | undefined;
/**
 * 先手の対局者名を省略名優先で取得します。
 * @param metadata
 */
export declare function getBlackPlayerNamePreferShort(metadata: ImmutableRecordMetadata): string | undefined;
/**
 * 後手の対局者名を省略名優先で取得します。
 * @param metadata
 */
export declare function getWhitePlayerNamePreferShort(metadata: ImmutableRecordMetadata): string | undefined;
/**
 * 棋譜メタデータ
 */
export declare class RecordMetadata {
    private standard;
    private custom;
    /**
     * 定義済みのメタデータのキーの一覧を取得します。
     */
    get standardMetadataKeys(): IterableIterator<RecordMetadataKey>;
    /**
     * 定義済みのメタデータを取得します。
     * @param key
     */
    getStandardMetadata(key: RecordMetadataKey): string | undefined;
    /**
     * 定義済みのメタデータを設定します。
     * @param key
     * @param value
     */
    setStandardMetadata(key: RecordMetadataKey, value: string): void;
    /**
     * カスタムメタデータのキーの一覧を取得します。
     */
    get customMetadataKeys(): IterableIterator<string>;
    /**
     * カスタムメタデータを取得します。
     * @param key
     */
    getCustomMetadata(key: string): string | undefined;
    /**
     * カスタムメタデータを設定します。
     * @param key
     * @param value
     */
    setCustomMetadata(key: string, value: string): void;
}
/**
 * 棋譜を構成するノード(読み取り専用)
 */
export interface ImmutableNode {
    readonly ply: number;
    readonly prev: ImmutableNode | null;
    readonly next: ImmutableNode | null;
    readonly branch: ImmutableNode | null;
    readonly branchIndex: number;
    readonly activeBranch: boolean;
    readonly nextColor: Color;
    readonly move: Move | SpecialMove;
    readonly isCheck: boolean;
    readonly comment: string;
    readonly customData: unknown;
    readonly sfen: string;
    readonly displayText: string;
    readonly timeText: string;
    readonly hasBranch: boolean;
    readonly isFirstBranch: boolean;
    readonly isLastMove: boolean;
    readonly elapsedMs: number;
    readonly totalElapsedMs: number;
    readonly bookmark: string;
}
/**
 * 棋譜を構成するノード
 */
export interface Node extends ImmutableNode {
    readonly prev: Node | null;
    readonly next: Node | null;
    readonly branch: Node | null;
    comment: string;
    bookmark: string;
    customData: unknown;
    setElapsedMs(elapsedMs: number): void;
}
export type USIFormatOptions = {
    /** 平手の場合に "startpos" を使用するかを指定します。デフォルトは true です。 */
    startpos?: boolean;
    /** 投了 "resign" を出力に含めるかどうかを表します。デフォルトは false です。 */
    resign?: boolean;
    /** 千日手 "rep_draw" を出力に含めるかどうかを表します。デフォルトは false です。 */
    repDraw?: boolean;
    /** 引き分け "draw" を出力に含めるかどうかを表します。デフォルトは false です。 */
    draw?: boolean;
    /** 時間切れ "timeout" を出力に含めるかどうかを表します。デフォルトは false です。 */
    timeout?: boolean;
    /** 中断 "break" を出力に含めるかどうかを表します。デフォルトは false です。 */
    break?: boolean;
    /** 宣言勝ち "win" を出力に含めるかどうかを表します。デフォルトは false です。 */
    win?: boolean;
    /** 全ての指し手を含めるかどうかを指定します。 false の場合は現在の局面までの指し手のみが含まれます。デフォルトは false です。 */
    allMoves?: boolean;
};
/**
 * 棋譜(読み取り専用)
 */
export interface ImmutableRecord {
    readonly metadata: ImmutableRecordMetadata;
    readonly initialPosition: ImmutablePosition;
    readonly position: ImmutablePosition;
    readonly first: ImmutableNode;
    readonly current: ImmutableNode;
    readonly moves: Array<ImmutableNode>;
    readonly movesBefore: Array<ImmutableNode>;
    readonly length: number;
    readonly branchBegin: ImmutableNode;
    readonly repetition: boolean;
    getRepetitionCount(position: ImmutablePosition): number;
    readonly perpetualCheck: Color | null;
    readonly usi: string;
    getUSI(opts?: USIFormatOptions): string;
    readonly sfen: string;
    readonly usen: [string, number];
    readonly bookmarks: string[];
    forEach(handler: (node: ImmutableNode) => void): void;
    getSubtree(): ImmutableRecord;
    on(event: "changePosition", handler: () => void): void;
}
type OnChangePositionHandler = () => void;
type OnClearHandler = (position: ImmutablePosition) => void;
type OnAddNodeHandler = (node: ImmutableNode) => void;
type OnRemoveNodeHandler = (node: ImmutableNode) => void;
/**
 * 棋譜
 */
export declare class Record implements ImmutableRecord {
    metadata: RecordMetadata;
    private _initialPosition;
    private _position;
    private _first;
    private _current;
    private repetitionCounts;
    private repetitionStart;
    private onChangePosition;
    private onClear;
    private onAddNode;
    private onRemoveNode;
    constructor(position?: ImmutablePosition);
    /**
     * 初期局面を返します。
     */
    get initialPosition(): ImmutablePosition;
    /**
     * 現在の局面を返します。
     */
    get position(): ImmutablePosition;
    /**
     * 初期局面のノードを返します。
     * このノードには必ず SpecialMoveType.START が設定されます。
     * first.next が1手目に該当します。
     */
    get first(): Node;
    /**
     * 現在の局面のノードを返します。
     */
    get current(): Node;
    /**
     * アクティブな経路の指し手の一覧を返します。
     */
    get moves(): Array<Node>;
    /**
     * 現在の局面までの指し手の一覧を返します。
     */
    get movesBefore(): Array<Node>;
    private get _movesBefore();
    /**
     * アクティブな経路の総手数を返します。
     */
    get length(): number;
    /**
     * 最初の兄弟ノードを返します。
     */
    get branchBegin(): Node;
    /**
     * 指定した局面で棋譜を初期化します。
     * @param position
     */
    clear(position?: ImmutablePosition): void;
    /**
     * 1手前に戻ります。
     */
    goBack(): boolean;
    private _goBack;
    /**
     * 1手先に進みます。
     */
    goForward(): boolean;
    private _goForward;
    /**
     * アクティブな経路上で指定した手数まで移動します。
     * @param ply
     */
    goto(ply: number): void;
    gotoNode(node: ImmutableNode): boolean;
    private _goto;
    /**
     * 全ての分岐選択を初期化して最初のノードをアクティブにします。
     */
    resetAllBranchSelection(): void;
    /**
     * インデクスを指定して兄弟ノードを選択します。
     * @param index
     */
    switchBranchByIndex(index: number): boolean;
    _switchBranchByIndex(index: number): boolean;
    /**
     * 指し手を追加して1手先に進みます。
     * 現在のノードが特殊な指し手(ex. 投了)の場合は前のノードに戻ってから追加します。
     * 既に同じ指し手が存在する場合はそのノードへ移動します。
     */
    append(move: Move | SpecialMove | SpecialMoveType, opt?: DoMoveOption): boolean;
    private _append;
    /**
     * 次の兄弟ノードと順序を入れ替えます。
     */
    swapWithNextBranch(): boolean;
    /**
     * 前の兄弟ノードと順序を入れ替えます。
     */
    swapWithPreviousBranch(): boolean;
    private static swapWithPreviousBranch;
    /**
     * 現在の指し手を削除します。
     */
    removeCurrentMove(): boolean;
    /**
     * 後続の手を全て削除します。
     */
    removeNextMove(): boolean;
    private onRemoveSubTree;
    /**
     * 棋譜をマージします。
     * 経過時間やコメント、しおりが両方にある場合は自分の側を優先します。
     * 初期局面が異なる場合はマージできません。
     * @param record
     */
    merge(record: ImmutableRecord): boolean;
    /**
     * 棋譜を現在の局面からのサブツリーとしてマージします。
     * 経過時間やコメント、しおりが両方にある場合は自分の側を優先します。
     * 開始局面が一致していなくてもマージできますが、指し手が挿入不能な場合その子ノードは無視されます。
     * @param record
     */
    mergeIntoCurrentPosition(record: ImmutableRecord, option?: DoMoveOption): {
        successCount: number;
        skipCount: number;
    };
    /**
     * 指定したしおりがある局面まで移動します。
     * @param bookmark
     */
    jumpToBookmark(bookmark: string): boolean;
    private incrementRepetition;
    private decrementRepetition;
    /**
     * 千日手かどうかを判定します。
     * 現在の局面が4回目以上の同一局面である場合に true を返します。
     */
    get repetition(): boolean;
    /**
     * 現在の局面まで(Record.current着手後を含む)に指定された局面が何回現れたかを返します。
     * @param position
     */
    getRepetitionCount(position: ImmutablePosition): number;
    /**
     * 連続王手の千日手かどうかを判定します。
     * 現在の局面が4回目以上の同一局面であり、かつ同一局面が最初に出現したときから一方の王手が連続している場合に true を返します。
     */
    get perpetualCheck(): Color | null;
    /**
     * getUSI をオプション無しで呼び出した場合と同じ値を返します。
     */
    get usi(): string;
    /**
     * USI形式の文字列を返します。
     * @param opts
     */
    getUSI(opts?: USIFormatOptions): string;
    /**
     * 現在の局面のSFEN形式の文字列を返します。
     */
    get sfen(): string;
    /**
     * USEN (Url Safe sfen-Extended Notation) 形式の文字列を返します。
     * https://www.slideshare.net/slideshow/scalajs-web/92707205#15
     * @returns [usen, branchIndex]
     */
    get usen(): [string, number];
    /**
     * しおりの一覧を返します。
     */
    get bookmarks(): string[];
    forEach(handler: (node: Node) => void): void;
    private _forEach;
    private find;
    getSubtree(): Record;
    on(event: "changePosition", handler: OnChangePositionHandler): void;
    on(event: "clear", handler: OnClearHandler): void;
    on(event: "addNode", handler: OnAddNodeHandler): void;
    on(event: "removeNode", handler: OnRemoveNodeHandler): void;
    /**
     * USI形式の文字列から棋譜を読み込みます。
     * @param data
     */
    static newByUSI(data: string): Record | Error;
    private static newByUSIFromSFEN;
    private static newByUSIFromMoves;
    /**
     * USEN (Url Safe sfen-Extended Notation) 形式の文字列から棋譜を読み込みます。
     * https://www.slideshare.net/slideshow/scalajs-web/92707205#15
     */
    static newByUSEN(usen: string, branchIndex?: number, ply?: number): Record | Error;
}
/**
 * USI形式の文字列から次の手番を取得します。
 * @param usi
 */
export declare function getNextColorFromUSI(usi: string): Color;
export {};
