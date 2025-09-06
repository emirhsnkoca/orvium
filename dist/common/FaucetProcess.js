import * as fs from 'fs';
import { TypedEmitter } from 'tiny-typed-emitter';
import { FaucetDatabase } from '../db/FaucetDatabase.js';
import { renderDate } from '../utils/DateUtils.js';
import { strPadRight } from '../utils/StringUtils.js';
import { faucetConfig, loadFaucetConfig, resolveRelativePath } from '../config/FaucetConfig.js';
import { ServiceManager } from './ServiceManager.js';
import { SessionManager } from '../session/SessionManager.js';
export var FaucetLogLevel;
(function (FaucetLogLevel) {
    FaucetLogLevel["ERROR"] = "ERROR";
    FaucetLogLevel["WARNING"] = "WARNING";
    FaucetLogLevel["INFO"] = "INFO";
    FaucetLogLevel["HIDDEN"] = "HIDDEN";
})(FaucetLogLevel || (FaucetLogLevel = {}));
export class FaucetProcess extends TypedEmitter {
    initialized;
    hideLogOutput;
    eventHandlers = {
        "uncaughtException": (err, origin) => {
            this.emitLog(FaucetLogLevel.ERROR, `### Caught unhandled exception: ${err}\r\n` + `  Exception origin: ${origin}\r\n` + `  Stack Trace: ${err.stack}\r\n`);
            this.shutdown(1);
        },
        "unhandledRejection": (reason, promise) => {
            let stack;
            try {
                throw new Error();
            }
            catch (ex) {
                stack = ex.stack;
            }
            this.emitLog(FaucetLogLevel.ERROR, `### Caught unhandled rejection: ${reason}\r\n` + `  Stack Trace: ${reason && reason.stack ? reason.stack : stack}\r\n`);
        },
        "SIGUSR1": () => {
            this.emitLog(FaucetLogLevel.INFO, `# Received SIGURS1 signal - reloading faucet config`);
            loadFaucetConfig();
            this.emit("reload");
        },
        "SIGINT": () => {
            // CTRL+C
            this.emitLog(FaucetLogLevel.INFO, `# Received SIGINT signal - shutdown faucet`);
            this.shutdown(0);
        },
        "SIGQUIT": () => {
            // Keyboard quit
            this.emitLog(FaucetLogLevel.INFO, `# Received SIGQUIT signal - shutdown faucet`);
            this.shutdown(0);
        },
        "SIGTERM": () => {
            // `kill` command
            this.emitLog(FaucetLogLevel.INFO, `# Received SIGTERM signal - shutdown faucet`);
            this.shutdown(0);
        },
    };
    initialize() {
        if (this.initialized)
            return;
        this.initialized = true;
        if (faucetConfig.faucetPidFile) {
            fs.writeFileSync(faucetConfig.faucetPidFile, process.pid.toString());
        }
        Object.keys(this.eventHandlers).forEach((evtName) => {
            process.on(evtName, this.eventHandlers[evtName]);
        });
    }
    dispose() {
        if (!this.initialized)
            return;
        this.initialized = false;
        Object.keys(this.eventHandlers).forEach((evtName) => {
            process.off(evtName, this.eventHandlers[evtName]);
        });
    }
    async shutdown(code) {
        try {
            await ServiceManager.GetService(SessionManager).saveAllSessions();
            let dbsvc = ServiceManager.GetService(FaucetDatabase);
            await ServiceManager.DisposeAllServices();
            await dbsvc.closeDatabase();
        }
        catch (ex) { }
        process.exit(code);
    }
    emitLog(level, message, data) {
        if (level === FaucetLogLevel.HIDDEN)
            return;
        let logLine = renderDate(new Date(), true, true) + "  " + strPadRight(level, 7, " ") + "  " + message;
        if (faucetConfig?.faucetLogFile) {
            let logFile = resolveRelativePath(faucetConfig.faucetLogFile);
            fs.appendFileSync(logFile, logLine + "\r\n");
        }
        if (!this.hideLogOutput)
            console.log(logLine);
    }
}
//# sourceMappingURL=FaucetProcess.js.map