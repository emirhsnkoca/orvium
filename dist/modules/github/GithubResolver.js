import { FetchUtil } from '../../utils/FetchUtil.js';
import { faucetConfig } from "../../config/FaucetConfig.js";
import { decryptStr, encryptStr } from "../../utils/CryptoUtils.js";
export class GithubResolver {
    module;
    constructor(module) {
        this.module = module;
    }
    now() {
        return Math.floor((new Date()).getTime() / 1000);
    }
    async createAuthInfo(authCode) {
        // get access token
        let accessToken;
        try {
            let tokenReqData = new URLSearchParams();
            tokenReqData.append("client_id", this.module.getModuleConfig().appClientId);
            tokenReqData.append("client_secret", this.module.getModuleConfig().appSecret);
            tokenReqData.append("code", authCode);
            let tokenRsp = await FetchUtil.fetchWithTimeout("https://github.com/login/oauth/access_token", {
                method: 'POST',
                body: tokenReqData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }, 10000).then((rsp) => rsp.text());
            let tokenRspData = new URLSearchParams(tokenRsp);
            if (tokenRspData.has("access_token"))
                accessToken = tokenRspData.get("access_token");
            else
                throw "could not fetch access token" + (tokenReqData.has("error") ? ": [" + tokenReqData.get("error") + "] " + tokenReqData.get("error_description") : "");
        }
        catch (ex) {
            throw "error while fetching access token: " + ex.toString();
        }
        let userInfo = await this.fetchProfileInfo(accessToken);
        let now = Math.floor(new Date().getTime() / 1000);
        let faucetToken = this.generateFaucetToken(accessToken, userInfo.uid, now);
        return {
            time: now,
            uid: userInfo.uid,
            user: userInfo.user,
            url: userInfo.url,
            avatar: userInfo.avatar,
            token: faucetToken,
        };
    }
    getTokenPassphrase() {
        return faucetConfig.faucetSecret + "-" + this.module.getModuleName() + "-authtoken";
    }
    generateFaucetToken(accessToken, userId, time) {
        return encryptStr([
            this.module.getModuleName(),
            time.toString(),
            userId.toString(),
            accessToken,
        ].join("\n"), this.getTokenPassphrase());
    }
    parseFaucetToken(faucetToken) {
        let tokenData = decryptStr(faucetToken, this.getTokenPassphrase())?.split("\n") || [];
        if (tokenData.length !== 4)
            return null;
        if (tokenData[0] !== this.module.getModuleName())
            return null;
        return [tokenData[3], parseInt(tokenData[2]), parseInt(tokenData[1])];
    }
    async fetchProfileInfo(accessToken) {
        let userData = await FetchUtil.fetchWithTimeout("https://api.github.com/user", {
            method: 'GET',
            headers: { 'Authorization': 'token ' + accessToken }
        }, 10000).then((rsp) => rsp.json());
        return {
            uid: userData.id,
            user: userData.name,
            api: userData.url,
            url: userData.html_url,
            avatar: userData.avatar_url,
            repos: userData.public_repos,
            followers: userData.followers,
            created: Math.floor(new Date(userData.created_at).getTime() / 1000),
        };
    }
    async getGithubInfo(token, opts) {
        // parse token
        let tokenData = this.parseFaucetToken(token);
        if (!tokenData)
            throw "invalid github token";
        if (tokenData[2] + this.module.getModuleConfig().authTimeout < this.now())
            throw "github token expired";
        let accessToken = tokenData[0];
        let userId = tokenData[1];
        let cachedGithubInfo = await this.module.getGithubDb().getGithubInfo(userId);
        if (cachedGithubInfo && // check if all optional fields are loaded in the cached info
            (!opts.loadOwnRepo || cachedGithubInfo.loaded.indexOf("ownrepos") !== -1)) {
            return cachedGithubInfo;
        }
        let userInfo = await this.fetchProfileInfo(accessToken);
        let promises = [];
        let githubInfo = {
            time: this.now(),
            uid: userInfo.uid,
            user: userInfo.user,
            loaded: [],
            info: {
                createTime: userInfo.created,
                repoCount: userInfo.repos,
                followers: userInfo.followers,
            }
        };
        if (opts.loadOwnRepo) {
            githubInfo.loaded.push("ownrepos");
            promises.push(this.loadOwnRepoInfo(githubInfo, accessToken));
        }
        await Promise.all(promises);
        await this.module.getGithubDb().setGithubInfo(userId, githubInfo, this.module.getModuleConfig().cacheTime);
        return githubInfo;
    }
    async loadOwnRepoInfo(githubInfo, accessToken) {
        let graphQuery = `{
      viewer {
        repositories(
          first: 100
          isFork: false
          privacy: PUBLIC
          ownerAffiliations: OWNER
        ) {
          edges {
            node {
              id
              name
              forkCount
              stargazerCount
              url
            }
          }
        }
      }
    }`;
        let graphData = await FetchUtil.fetchWithTimeout("https://api.github.com/graphql", {
            method: 'POST',
            body: JSON.stringify({
                query: graphQuery,
            }),
            headers: {
                'Authorization': 'token ' + accessToken,
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }, 15000).then((rsp) => rsp.json());
        githubInfo.info.ownRepoCount = 0;
        githubInfo.info.ownRepoStars = 0;
        githubInfo.info.ownRepoForks = 0;
        let repositories = graphData.data.viewer.repositories.edges;
        for (let i = 0; i < repositories.length; i++) {
            githubInfo.info.ownRepoCount++;
            githubInfo.info.ownRepoStars += repositories[i].node.stargazerCount;
            githubInfo.info.ownRepoForks += repositories[i].node.forkCount;
        }
    }
}
//# sourceMappingURL=GithubResolver.js.map