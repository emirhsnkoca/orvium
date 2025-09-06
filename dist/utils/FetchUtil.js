import { default as nodeFetch } from 'node-fetch';
export class FetchUtil {
    static fetch(url, init) {
        if (init)
            return nodeFetch(url, init);
        else
            return nodeFetch(url);
    }
    static fetchWithTimeout(url, init, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Request timed out'));
            }, timeout);
            FetchUtil.fetch(url, init).then((res) => {
                clearTimeout(timeoutId);
                resolve(res);
            }).catch((err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
        });
    }
}
//# sourceMappingURL=FetchUtil.js.map