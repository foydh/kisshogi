import { Position } from "./position.mjs";
export var RecordFormatType;
(function (RecordFormatType) {
    RecordFormatType[RecordFormatType["USI"] = 0] = "USI";
    RecordFormatType[RecordFormatType["SFEN"] = 1] = "SFEN";
    RecordFormatType[RecordFormatType["KIF"] = 2] = "KIF";
    RecordFormatType[RecordFormatType["KI2"] = 3] = "KI2";
    RecordFormatType[RecordFormatType["CSA"] = 4] = "CSA";
    RecordFormatType[RecordFormatType["JKF"] = 5] = "JKF";
    RecordFormatType[RecordFormatType["USEN"] = 6] = "USEN";
})(RecordFormatType || (RecordFormatType = {}));
/**
 * 文字列から棋譜形式を推定します。
 * 一部の文字の並びや出現頻度による簡易的な判定であり、判定結果のフォーマットに準拠していることを保証するものではありません。
 * @param data
 */
export function detectRecordFormat(data) {
    // USI
    if (data === "position startpos" ||
        data === "startpos" ||
        data.startsWith("position sfen ") ||
        data.startsWith("position startpos ") ||
        data.startsWith("sfen ") ||
        data.startsWith("startpos ") ||
        data.startsWith("moves ")) {
        return RecordFormatType.USI;
    }
    // SFEN
    if (Position.isValidSFEN(data)) {
        return RecordFormatType.SFEN;
    }
    // JKF
    if (/^[\s\r\n]*{/.test(data) && /}[\s\r\n]*$/.test(data)) {
        return RecordFormatType.JKF;
    }
    // USEN
    if (/^[-_.A-Za-z0-9]*~[0-9]*\.[0-9A-Za-z]*\.[a-z]?(~|$)/.test(data)) {
        return RecordFormatType.USEN;
    }
    // KIF vs KI2 vs CSA: 行頭の文字の出現頻度を比較する。
    const pattKIF = /(^|\n)[ \u3000]*[#0-9開終棋手戦表持秒記消場掲備先後作発出完分受]/g;
    const pattKI2 = /(^|\n)[ \u3000]*[#▲△▼▽☗☖開終棋手戦表持秒記消場掲備先後作発出完分受]/g;
    const pattCSA = /(^|,|\n)[-+$%'VNPT]/g;
    const matchedKIF = data.match(pattKIF);
    const matchedKI2 = data.match(pattKI2);
    const matchedCSA = data.match(pattCSA);
    const evalKIF = matchedKIF?.length || 0;
    const evalKI2 = matchedKI2?.length || 0;
    const evalCSA = matchedCSA?.length || 0;
    return evalKIF >= evalCSA && evalKIF >= evalKI2
        ? RecordFormatType.KIF
        : evalKI2 >= evalCSA
            ? RecordFormatType.KI2
            : RecordFormatType.CSA;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2RldGVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBRXRDLE1BQU0sQ0FBTixJQUFZLGdCQVFYO0FBUkQsV0FBWSxnQkFBZ0I7SUFDMUIscURBQUcsQ0FBQTtJQUNILHVEQUFJLENBQUE7SUFDSixxREFBRyxDQUFBO0lBQ0gscURBQUcsQ0FBQTtJQUNILHFEQUFHLENBQUE7SUFDSCxxREFBRyxDQUFBO0lBQ0gsdURBQUksQ0FBQTtBQUNOLENBQUMsRUFSVyxnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBUTNCO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxJQUFZO0lBQzdDLE1BQU07SUFDTixJQUNFLElBQUksS0FBSyxtQkFBbUI7UUFDNUIsSUFBSSxLQUFLLFVBQVU7UUFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUNqQyxJQUFJLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDO1FBQ3JDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDO1FBQzVCLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQ3pCLENBQUM7UUFDRCxPQUFPLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztJQUM5QixDQUFDO0lBRUQsT0FBTztJQUNQLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQy9CLE9BQU8sZ0JBQWdCLENBQUMsSUFBSSxDQUFDO0lBQy9CLENBQUM7SUFFRCxNQUFNO0lBQ04sSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUN6RCxPQUFPLGdCQUFnQixDQUFDLEdBQUcsQ0FBQztJQUM5QixDQUFDO0lBRUQsT0FBTztJQUNQLElBQUksb0RBQW9ELENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDcEUsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7SUFDL0IsQ0FBQztJQUVELHNDQUFzQztJQUN0QyxNQUFNLE9BQU8sR0FBRyw4Q0FBOEMsQ0FBQztJQUMvRCxNQUFNLE9BQU8sR0FBRyxpREFBaUQsQ0FBQztJQUNsRSxNQUFNLE9BQU8sR0FBRyxzQkFBc0IsQ0FBQztJQUN2QyxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN2QyxNQUFNLE9BQU8sR0FBRyxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQztJQUN4QyxNQUFNLE9BQU8sR0FBRyxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQztJQUN4QyxNQUFNLE9BQU8sR0FBRyxVQUFVLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQztJQUN4QyxPQUFPLE9BQU8sSUFBSSxPQUFPLElBQUksT0FBTyxJQUFJLE9BQU87UUFDN0MsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUc7UUFDdEIsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPO1lBQ2xCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHO1lBQ3RCLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUM7QUFDN0IsQ0FBQyJ9