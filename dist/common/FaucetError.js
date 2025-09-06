export class FaucetError extends Error {
    code;
    data;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
    toString() {
        return "[" + this.code + "] " + super.toString();
    }
    getCode() {
        return this.code;
    }
}
//# sourceMappingURL=FaucetError.js.map