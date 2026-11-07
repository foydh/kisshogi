/**
 * ミリ秒をHH:MM:SS形式に変換します。秒未満は切り捨てられます。
 * @param ms
 */
export declare function millisecondsToHHMMSS(ms: number): string;
/**
 * ミリ秒をM:SS形式に変換します。分の十の位はスペースでパディングされます。秒未満は切り捨てられます。
 * @param ms
 */
export declare function millisecondsToMSS(ms: number): string;
/**
 * 秒をHH:MM:SS形式に変換します。
 * @param seconds
 */
export declare function secondsToHHMMSS(seconds: number): string;
/**
 * 秒をM:SS形式に変換します。分の十の位はスペースでパディングされます。
 * @param seconds
 */
export declare function secondsToMSS(seconds: number): string;
