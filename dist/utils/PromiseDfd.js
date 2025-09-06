export class PromiseDfd {
    promise;
    resolve;
    reject;
    constructor() {
        let promiseFns;
        this.promise = new Promise((resolve, reject) => {
            promiseFns = {
                resolve: resolve,
                reject: reject
            };
        });
        this.resolve = promiseFns.resolve;
        this.reject = promiseFns.reject;
    }
}
//# sourceMappingURL=PromiseDfd.js.map