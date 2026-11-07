/**
 * 文字列に新しい行を連結します。末尾に改行が無い場合だけ改行を追加します。
 * @param base
 * @param newLine
 */
export function appendLine(base, newLine) {
    return (base ? appendReturnIfNotExists(base) : "") + appendReturnIfNotExists(newLine);
}
/**
 * 文字列の末尾に改行がなければ追加します。
 * @param str
 */
export function appendReturnIfNotExists(str) {
    return str + (str.endsWith("\n") ? "" : "\n");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2hlbHBlcnMvc3RyaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsVUFBVSxDQUFDLElBQVksRUFBRSxPQUFlO0lBQ3RELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4RixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLHVCQUF1QixDQUFDLEdBQVc7SUFDakQsT0FBTyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2hELENBQUMifQ==