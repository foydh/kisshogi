export var Color;
(function (Color) {
    /** 先手 */
    Color["BLACK"] = "black";
    /** 後手 */
    Color["WHITE"] = "white";
})(Color || (Color = {}));
/**
 * 反対の手番を返します。
 * @param color
 */
export function reverseColor(color) {
    return color === Color.BLACK ? Color.WHITE : Color.BLACK;
}
/**
 * SFEN形式の手番を取得します。
 * @param color
 */
export function colorToSFEN(color) {
    return color === Color.BLACK ? "b" : "w";
}
/**
 * 指定した文字列が正しいSFENの手番かどうかを判定します。
 * @param sfen
 */
export function isValidSFENColor(sfen) {
    return sfen === "b" || sfen === "w";
}
/**
 * SFEN形式の手番を読み取ります。
 * @param sfen
 */
export function parseSFENColor(sfen) {
    return sfen === "b" ? Color.BLACK : Color.WHITE;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29sb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFOLElBQVksS0FLWDtBQUxELFdBQVksS0FBSztJQUNmLFNBQVM7SUFDVCx3QkFBZSxDQUFBO0lBQ2YsU0FBUztJQUNULHdCQUFlLENBQUE7QUFDakIsQ0FBQyxFQUxXLEtBQUssS0FBTCxLQUFLLFFBS2hCO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxLQUFZO0lBQ3ZDLE9BQU8sS0FBSyxLQUFLLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7QUFDM0QsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQUMsS0FBWTtJQUN0QyxPQUFPLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUMzQyxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGdCQUFnQixDQUFDLElBQVk7SUFDM0MsT0FBTyxJQUFJLEtBQUssR0FBRyxJQUFJLElBQUksS0FBSyxHQUFHLENBQUM7QUFDdEMsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxjQUFjLENBQUMsSUFBWTtJQUN6QyxPQUFPLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7QUFDbEQsQ0FBQyJ9