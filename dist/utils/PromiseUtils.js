export function sleepPromise(delay) {
    return new Promise((resolve) => {
        setTimeout(resolve, delay);
    });
}
export function timeoutPromise(promise, timeout, rejectReason) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            reject(rejectReason || "promise timeout");
        }, timeout);
        promise.then(resolve, reject);
    });
}
//# sourceMappingURL=PromiseUtils.js.map