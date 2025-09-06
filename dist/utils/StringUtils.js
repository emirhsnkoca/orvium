export function strPadLeft(str, len, pad) {
    str = str.toString();
    while (str.length < len)
        str = pad + str;
    return str;
}
export function strPadRight(str, len, pad) {
    str = str.toString();
    while (str.length < len)
        str += pad;
    return str;
}
export function strFormatPlaceholder(format, ..._) {
    var args = arguments;
    return format.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined'
            ? args[number]
            : match;
    });
}
;
//# sourceMappingURL=StringUtils.js.map