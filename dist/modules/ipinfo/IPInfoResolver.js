import { FetchUtil } from '../../utils/FetchUtil.js';
export class IPInfoResolver {
    ipInfoDb;
    ipInfoApi;
    ipInfoCache = {};
    ipInfoCacheCleanupTimer;
    ipInfoCacheCleanupInterval = 20 * 1000;
    ipInfoCacheCleanupTimeout = 6 * 60 * 60;
    constructor(ipInfoDb, api) {
        this.ipInfoDb = ipInfoDb;
        this.ipInfoApi = api;
        this.ipInfoCacheCleanupTimer = setInterval(() => {
            this.cleanIpInfoCache();
        }, this.ipInfoCacheCleanupInterval);
    }
    dispose() {
        clearInterval(this.ipInfoCacheCleanupTimer);
    }
    setApi(api) {
        this.ipInfoApi = api;
    }
    async getIpInfo(ipAddr) {
        let cachedIpInfo = await this.ipInfoDb.getIPInfo(ipAddr);
        if (cachedIpInfo)
            return cachedIpInfo;
        if (this.ipInfoCache.hasOwnProperty(ipAddr))
            return await this.ipInfoCache[ipAddr][1];
        let ipApiUrl = this.ipInfoApi.replace(/{ip}/, ipAddr);
        let promise = FetchUtil.fetchWithTimeout(ipApiUrl, null, 20000)
            .then((rsp) => rsp.json())
            .then((rsp) => {
            if (!rsp || !rsp.status)
                throw "invalid ip info response";
            let ipInfo = {
                status: rsp.status,
            };
            if (rsp.status === "success") {
                ipInfo.country = rsp.country;
                ipInfo.countryCode = rsp.countryCode;
                ipInfo.region = rsp.regionName;
                ipInfo.regionCode = rsp.region;
                ipInfo.city = rsp.city;
                ipInfo.cityCode = rsp.zip;
                ipInfo.locLat = rsp.lat;
                ipInfo.locLon = rsp.lon;
                ipInfo.zone = rsp.timezone;
                ipInfo.isp = rsp.isp;
                ipInfo.org = rsp.org;
                ipInfo.as = rsp.as;
                ipInfo.proxy = rsp.proxy;
                ipInfo.hosting = rsp.hosting;
                this.ipInfoDb.setIPInfo(ipAddr, ipInfo);
            }
            return ipInfo;
        }, (err) => {
            return {
                status: "error" + (err ? ": " + err.toString() : ""),
            };
        });
        this.ipInfoCache[ipAddr] = [
            Math.floor((new Date()).getTime() / 1000),
            promise,
        ];
        return await promise;
    }
    cleanIpInfoCache() {
        let now = Math.floor((new Date()).getTime() / 1000);
        Object.keys(this.ipInfoCache).forEach((ipAddr) => {
            if (now - this.ipInfoCache[ipAddr][0] > this.ipInfoCacheCleanupTimeout) {
                delete this.ipInfoCache[ipAddr];
            }
        });
    }
}
//# sourceMappingURL=IPInfoResolver.js.map