import * as fs from 'fs';
import * as path from 'path';
import { createServer } from 'http';
import { Server as StaticServer } from '@brettz9/node-static';
import { WebSocketServer } from 'ws';
import { faucetConfig } from '../config/FaucetConfig.js';
import { encode } from 'html-entities';
import { FaucetWebApi } from './FaucetWebApi.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess.js';
export class FaucetHttpResponse {
    code;
    reason;
    body;
    headers;
    constructor(code, reason, body, headers) {
        this.code = code;
        this.reason = reason;
        this.body = body;
        this.headers = headers || {};
    }
}
const MAX_BODY_SIZE = 1024 * 1024 * 10; // 10MB
export class FaucetHttpServer {
    initialized;
    httpServer;
    wssServer;
    wssEndpoints = {};
    staticServer;
    cachedSeoIndex;
    initialize() {
        if (this.initialized)
            return;
        this.initialized = true;
        this.httpServer = createServer();
        this.httpServer.on("request", (req, rsp) => this.onHttpRequest(req, rsp));
        this.httpServer.on("upgrade", (req, sock, head) => this.onHttpUpgrade(req, sock, head));
        this.httpServer.listen(faucetConfig.serverPort);
        this.wssServer = new WebSocketServer({
            noServer: true
        });
        this.staticServer = new StaticServer(faucetConfig.staticPath, {
            serverInfo: Buffer.from("pow-faucet/" + faucetConfig.faucetVersion)
        });
        if (faucetConfig.buildSeoIndex) {
            this.buildSeoIndex();
            ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
                this.buildSeoIndex();
            });
        }
    }
    getListenPort() {
        let addr = this.httpServer.address();
        if (typeof addr === "object")
            return addr.port;
        else
            return faucetConfig.serverPort;
    }
    addWssEndpoint(key, pattern, wssHandler) {
        this.wssEndpoints[key] = {
            pattern: pattern,
            wssHandler: wssHandler,
        };
    }
    addRawEndpoint(key, pattern, rawHandler) {
        this.wssEndpoints[key] = {
            pattern: pattern,
            rawHandler: rawHandler
        };
    }
    removeWssEndpoint(key) {
        delete this.wssEndpoints[key];
    }
    onHttpRequest(req, rsp) {
        if (req.method === "GET" || req.method === "POST" || req.method === "OPTIONS") {
            let bodyParts = [];
            let bodySize = 0;
            req.on("data", (chunk) => {
                bodyParts.push(chunk);
                bodySize += chunk.length;
                if (bodySize > MAX_BODY_SIZE) {
                    req.destroy(new Error("body too big"));
                }
            });
            req.on("end", () => {
                if ((req.url + "").match(/^\/api\//i)) {
                    let body = req.method === "POST" ? Buffer.concat(bodyParts) : null;
                    if (req.method === "OPTIONS") {
                        this.sendApiResponse(req, rsp, 200, "OK", {}, null);
                    }
                    else {
                        ServiceManager.GetService(FaucetWebApi).onApiRequest(req, body).then((res) => {
                            if (res && typeof res === "object" && res instanceof FaucetHttpResponse)
                                this.sendApiResponse(req, rsp, res.code, res.reason, res.headers, res.body);
                            else
                                this.sendApiResponse(req, rsp, 200, "OK", { 'Content-Type': 'application/json' }, JSON.stringify(res));
                        }).catch((err) => {
                            if (err && typeof err === "object" && err instanceof FaucetHttpResponse)
                                this.sendApiResponse(req, rsp, err.code, err.reason, err.headers, err.body);
                            else
                                this.sendApiResponse(req, rsp, 500, "Internal Server Error", {}, err ? err.toString() : "");
                        });
                    }
                }
                else if (req.method === "OPTIONS") {
                    this.sendApiResponse(req, rsp, 200, "OK", {}, null);
                }
                else {
                    switch (req.url) {
                        case "/":
                        case "/index.html":
                            if (faucetConfig.buildSeoIndex && this.cachedSeoIndex) {
                                rsp.writeHead(200, { 'Content-Type': 'text/html' });
                                rsp.end(this.cachedSeoIndex);
                            }
                            else
                                this.staticServer.serveFile("/index.html", 200, {}, req, rsp);
                            break;
                        default:
                            let pathname = decodeURI(new URL(req.url, 'http://localhost').pathname);
                            this.staticServer.servePath(pathname, 200, this.getCorsHeaders(req), req, rsp, function () { });
                            break;
                    }
                }
            });
        }
        req.resume();
    }
    sendApiResponse(req, rsp, code, reason, headers, body) {
        Object.assign(headers, this.getCorsHeaders(req));
        rsp.writeHead(code, reason, headers);
        rsp.end(body);
    }
    getCorsHeaders(req) {
        let headers = {};
        let corsAllowOrigin = faucetConfig.corsAllowOrigin || [];
        if (corsAllowOrigin.length > 0) {
            let rspAllowOrigin;
            for (let i = 0; i < corsAllowOrigin.length; i++) {
                let allowOrigin = corsAllowOrigin[i];
                if (allowOrigin == "*" || allowOrigin == req.headers.origin) {
                    rspAllowOrigin = allowOrigin;
                    break;
                }
            }
            if (rspAllowOrigin) {
                headers["Access-Control-Allow-Origin"] = rspAllowOrigin;
                headers["Access-Control-Allow-Methods"] = "GET, POST";
                headers["Access-Control-Allow-Headers"] = "Content-Type";
            }
        }
        return headers;
    }
    onHttpUpgrade(req, socket, head) {
        let wssEndpoint;
        let allEndpoints = Object.values(this.wssEndpoints);
        for (let i = 0; i < allEndpoints.length; i++) {
            if (allEndpoints[i].pattern.test(req.url)) {
                wssEndpoint = allEndpoints[i];
                break;
            }
        }
        if (!wssEndpoint) {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }
        let remoteAddr = ServiceManager.GetService(FaucetWebApi).getRemoteAddr(req);
        if (wssEndpoint.wssHandler) {
            this.wssServer.handleUpgrade(req, socket, head, (ws) => {
                wssEndpoint.wssHandler(req, ws, remoteAddr);
            });
        }
        else if (wssEndpoint.rawHandler) {
            wssEndpoint.rawHandler(req, socket, head, remoteAddr);
        }
        else {
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
        }
    }
    buildSeoIndex() {
        let indexFile = path.join(faucetConfig.staticPath, "index.html");
        if (!fs.existsSync(indexFile))
            return;
        let clientVersion;
        try {
            let clientFile = path.join(faucetConfig.staticPath, "js", "powfaucet.js");
            let clientSrc = fs.readFileSync(clientFile, "utf8");
            let match = /@pow-faucet-client: ({[^}]+})/.exec(clientSrc);
            if (match)
                clientVersion = JSON.parse(match[1]);
        }
        catch (ex) { }
        let indexHtml = fs.readFileSync(indexFile, "utf8");
        let seoHtml = [
            '<div class="faucet-title">',
            '<h1 class="center">' + encode(faucetConfig.faucetTitle) + '</h1>',
            '</div>',
            '<div class="pow-header center">',
            '<div class="pow-status-container">',
            '<div class="pow-faucet-home">',
            faucetConfig.faucetImage ? '<img src="' + faucetConfig.faucetImage + '" className="image" />' : '',
            '</div>',
            '</div>',
            '</div>',
        ].join("");
        let seoMeta = "";
        if (faucetConfig.buildSeoMeta) {
            seoMeta = Object.keys(faucetConfig.buildSeoMeta).filter((metaName) => faucetConfig.buildSeoMeta.hasOwnProperty(metaName)).map((metaName) => {
                return '<meta name="' + metaName + '" content="' + faucetConfig.buildSeoMeta[metaName] + '">';
            }).join("");
        }
        indexHtml = indexHtml.replace(/<title>.*?<\/title>/, '<title>' + encode(faucetConfig.faucetTitle) + '</title>');
        indexHtml = indexHtml.replace(/<!-- pow-faucet-content -->/, seoHtml);
        indexHtml = indexHtml.replace(/<!-- pow-faucet-header -->/, seoMeta);
        indexHtml = indexHtml.replace(/<!-- pow-faucet-footer -->/, ServiceManager.GetService(FaucetWebApi).getFaucetHomeHtml());
        if (clientVersion) {
            indexHtml = indexHtml.replace(/"\/js\/powfaucet\.js"/, '"/js/powfaucet.js?' + clientVersion.build + '"');
            indexHtml = indexHtml.replace(/"\/css\/powfaucet\.css"/, '"/css/powfaucet.css?' + clientVersion.build + '"');
        }
        this.cachedSeoIndex = indexHtml;
        try {
            let seoFile = path.join(faucetConfig.staticPath, "index.seo.html");
            fs.writeFileSync(seoFile, indexHtml);
        }
        catch (ex) {
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Could not write seo index to disk, because static folder is not writable. Serving seo index from memory.");
        }
    }
}
//# sourceMappingURL=FaucetHttpServer.js.map