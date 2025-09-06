import { faucetConfig, resolveRelativePath } from '../config/FaucetConfig.js';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetSessionStatus } from '../session/FaucetSession.js';
import { ClaimTxStatus } from '../eth/EthClaimManager.js';
import { WorkerDriver } from './driver/WorkerDriver.js';
import { FaucetWorkers } from '../common/FaucetWorker.js';
import { MySQLDriver } from "./driver/MySQLDriver.js";
import { SQL } from "./SQL.js";
export var FaucetDbDriver;
(function (FaucetDbDriver) {
    FaucetDbDriver["SQLITE"] = "sqlite";
    FaucetDbDriver["MYSQL"] = "mysql";
})(FaucetDbDriver || (FaucetDbDriver = {}));
export class FaucetDatabase {
    initialized;
    cleanupTimer;
    db;
    dbWorker;
    moduleDBs = {};
    async initialize() {
        if (this.initialized)
            return;
        this.initialized = true;
        await this.initDatabase();
        this.cleanupTimer = setInterval(() => {
            this.cleanStore();
        }, (1000 * 60 * 60 * 2));
    }
    dispose() {
        if (!this.initialized)
            return;
        this.initialized = false;
        clearInterval(this.cleanupTimer);
    }
    async initDatabase() {
        switch (faucetConfig.database.driver) {
            case "sqlite":
                this.dbWorker = ServiceManager.GetService(FaucetWorkers).createWorker("database");
                this.db = new WorkerDriver(this.dbWorker);
                await this.db.open(Object.assign({}, faucetConfig.database, {
                    file: resolveRelativePath(faucetConfig.database.file),
                }));
                break;
            case "mysql":
                this.db = new MySQLDriver();
                await this.db.open(Object.assign({}, faucetConfig.database));
                break;
            default:
                throw "unknown database driver: " + faucetConfig.database.driver;
        }
        await this.upgradeSchema();
    }
    async closeDatabase() {
        await this.db.close();
        if (this.dbWorker) {
            this.dbWorker.terminate();
            this.dbWorker = null;
        }
    }
    async createModuleDb(dbClass, module) {
        let modName = module.getModuleName();
        let modDb;
        if (!(modDb = this.moduleDBs[modName])) {
            modDb = this.moduleDBs[modName] = new dbClass(module, this);
            await modDb.initSchema();
        }
        return modDb;
    }
    disposeModuleDb(moduleDb) {
        if (this.moduleDBs[moduleDb.getModuleName()] === moduleDb)
            delete this.moduleDBs[moduleDb.getModuleName()];
    }
    getDatabase() {
        return this.db;
    }
    async upgradeIfNeeded(module, latestVersion, upgrade) {
        let schemaVersion = 0;
        let res = await this.db.get("SELECT Version FROM SchemaVersion WHERE Module = ?", [module]);
        if (res)
            schemaVersion = res.Version;
        else
            await this.db.run("INSERT INTO SchemaVersion (Module, Version) VALUES (?, ?)", [module, 0]);
        let upgradedVersion = schemaVersion;
        if (schemaVersion != latestVersion) {
            upgradedVersion = await upgrade(schemaVersion);
        }
        if (upgradedVersion != schemaVersion) {
            await this.db.run("UPDATE SchemaVersion SET Version = ? WHERE Module = ?", [upgradedVersion, module]);
        }
    }
    async upgradeSchema() {
        let schemaVersion = 0;
        await this.db.run(SQL.driverSql({
            [FaucetDbDriver.SQLITE]: `
        CREATE TABLE IF NOT EXISTS SchemaVersion (
          Module TEXT NULL UNIQUE,
          Version INTEGER NOT NULL,
          PRIMARY KEY(Module)
        )`,
            [FaucetDbDriver.MYSQL]: `
        CREATE TABLE IF NOT EXISTS SchemaVersion (
          Module VARCHAR(50) NULL,
          Version INT(11) NOT NULL
        )`,
        }));
        let res = await this.db.get("SELECT Version FROM SchemaVersion WHERE Module IS NULL");
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Current FaucetStore schema version: " + (res ? res.Version : "uninitialized"));
        if (res)
            schemaVersion = res.Version;
        else
            await this.db.run("INSERT INTO SchemaVersion (Module, Version) VALUES (NULL, ?)", [0]);
        let oldVersion = schemaVersion;
        switch (schemaVersion) {
            case 0: // upgrade to version 1
                schemaVersion = 1;
                await this.db.exec(SQL.driverSql({
                    [FaucetDbDriver.SQLITE]: `
            CREATE TABLE KeyValueStore (
              Key	TEXT NOT NULL UNIQUE,
              Value	TEXT NOT NULL,
              PRIMARY KEY(Key)
            );`,
                    [FaucetDbDriver.MYSQL]: `
            CREATE TABLE KeyValueStore (
              \`Key\`	VARCHAR(250) NOT NULL,
              Value	TEXT NOT NULL,
              PRIMARY KEY(\`Key\`)
            );`,
                }));
                await this.db.exec(SQL.driverSql({
                    [FaucetDbDriver.SQLITE]: `
            CREATE TABLE Sessions (
              SessionId TEXT NOT NULL UNIQUE,
              Status TEXT NOT NULL,
              StartTime INTEGER NOT NULL,
              TargetAddr TEXT NOT NULL,
              DropAmount TEXT NOT NULL,
              RemoteIP TEXT NOT NULL,
              Tasks TEXT NOT NULL,
              Data TEXT NOT NULL,
              ClaimData TEXT NULL,
              PRIMARY KEY(SessionId)
            );`,
                    [FaucetDbDriver.MYSQL]: `
            CREATE TABLE Sessions (
              SessionId CHAR(36) NOT NULL,
              Status VARCHAR(30) NOT NULL,
              StartTime INT(11) NOT NULL,
              TargetAddr CHAR(42) NOT NULL,
              DropAmount VARCHAR(50) NOT NULL,
              RemoteIP VARCHAR(40) NOT NULL,
              Tasks TEXT NOT NULL,
              Data TEXT NOT NULL,
              ClaimData TEXT NULL,
              PRIMARY KEY(SessionId)
            );`,
                }));
                await this.db.exec(SQL.driverSql({
                    [FaucetDbDriver.SQLITE]: `CREATE INDEX SessionsTimeIdx ON Sessions (StartTime	ASC);`,
                    [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX SessionsTimeIdx (StartTime);`,
                }));
                await this.db.exec(SQL.driverSql({
                    [FaucetDbDriver.SQLITE]: `CREATE INDEX SessionsStatusIdx ON Sessions (Status	ASC);`,
                    [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX SessionsStatusIdx (Status);`,
                }));
                await this.db.exec(SQL.driverSql({
                    [FaucetDbDriver.SQLITE]: `CREATE INDEX SessionsTargetAddrIdx ON Sessions (TargetAddr	ASC, StartTime	ASC);`,
                    [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX SessionsTargetAddrIdx (TargetAddr, StartTime);`,
                }));
                await this.db.exec(SQL.driverSql({
                    [FaucetDbDriver.SQLITE]: `CREATE INDEX SessionsRemoteIPIdx ON Sessions (RemoteIP	ASC, StartTime	ASC);`,
                    [FaucetDbDriver.MYSQL]: `ALTER TABLE Sessions ADD INDEX SessionsRemoteIPIdx (RemoteIP, StartTime);`,
                }));
            /*
            case 1: // upgrade to version 2
              schemaVersion = 2;
              this.db.exec(`
                
              `);
            */
        }
        if (schemaVersion !== oldVersion) {
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Upgraded FaucetStore schema from version " + oldVersion + " to version " + schemaVersion);
            await this.db.run("UPDATE SchemaVersion SET Version = ? WHERE Module IS NULL", [schemaVersion]);
        }
    }
    now() {
        return Math.floor((new Date()).getTime() / 1000);
    }
    cleanStore() {
        let now = this.now();
        this.db.run("DELETE FROM Sessions WHERE StartTime < ?", [now - faucetConfig.sessionCleanup]);
        Object.values(this.moduleDBs).forEach((modDb) => {
            modDb.cleanStore();
        });
    }
    async dropAllTables() {
        // for tests only! this drops the whole DB.
        let tables = await this.db.all(SQL.driverSql({
            [FaucetDbDriver.SQLITE]: "SELECT name FROM sqlite_schema WHERE type ='table' AND name NOT LIKE 'sqlite_%'",
            [FaucetDbDriver.MYSQL]: "SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()",
        }));
        let dropPromises = tables.map((table) => {
            return this.db.run("DROP TABLE " + table.name);
        });
        await Promise.all(dropPromises);
    }
    async getKeyValueEntry(key) {
        let row = await this.db.get("SELECT " + SQL.field("Value") + " FROM KeyValueStore WHERE " + SQL.field("Key") + " = ?", [key]);
        return row?.Value;
    }
    async setKeyValueEntry(key, value) {
        await this.db.run(SQL.driverSql({
            [FaucetDbDriver.SQLITE]: "INSERT OR REPLACE INTO KeyValueStore (Key,Value) VALUES (?,?)",
            [FaucetDbDriver.MYSQL]: "REPLACE INTO KeyValueStore (`Key`,Value) VALUES (?,?)",
        }), [
            key,
            value,
        ]);
    }
    async deleteKeyValueEntry(key) {
        await this.db.run("DELETE FROM KeyValueStore WHERE " + SQL.field("Key") + " = ?", [key]);
    }
    selectSessions(whereSql, whereArgs, skipData) {
        let sql = [
            "FROM Sessions WHERE ",
            whereSql
        ].join("");
        return this.selectSessionsSql(sql, whereArgs, skipData);
    }
    async selectSessionsSql(selectSql, args, skipData) {
        let fields = ["SessionId", "Status", "StartTime", "TargetAddr", "DropAmount", "RemoteIP", "Tasks"];
        if (!skipData)
            fields.push("Data", "ClaimData");
        let sql = [
            "SELECT ",
            fields.map((f) => "Sessions." + f).join(","),
            " ",
            selectSql
        ].join("");
        let rows = await this.db.all(sql, args);
        if (rows.length === 0)
            return [];
        return rows.map((row) => {
            return {
                sessionId: row.SessionId,
                status: row.Status,
                startTime: row.StartTime,
                targetAddr: row.TargetAddr,
                dropAmount: row.DropAmount,
                remoteIP: row.RemoteIP,
                tasks: JSON.parse(row.Tasks),
                data: skipData ? undefined : JSON.parse(row.Data),
                claim: skipData ? undefined : (row.ClaimData ? JSON.parse(row.ClaimData) : null),
            };
        });
    }
    getSessions(states) {
        return this.selectSessions("Status IN (" + states.map(() => "?").join(",") + ")", states);
    }
    async getAllSessions(timeLimit) {
        let now = Math.floor(new Date().getTime() / 1000);
        return this.selectSessions("Status NOT IN ('finished', 'failed') OR StartTime > ?", [now - timeLimit]);
    }
    async getTimedOutSessions(timeout) {
        let now = Math.floor(new Date().getTime() / 1000);
        return this.selectSessions("Status NOT IN ('finished', 'failed') AND StartTime <= ?", [now - timeout]);
    }
    async getFinishedSessions(targetAddr, remoteIP, timeout, skipData) {
        let now = Math.floor(new Date().getTime() / 1000);
        let whereSql = [];
        let whereArgs = [];
        if (targetAddr) {
            whereSql.push("TargetAddr = ?");
            whereArgs.push(targetAddr);
        }
        if (remoteIP) {
            whereSql.push("RemoteIP LIKE ?");
            whereArgs.push(remoteIP);
        }
        if (whereSql.length === 0)
            throw "invalid query";
        whereArgs.push(now - timeout);
        return this.selectSessions("(" + whereSql.join(" OR ") + ") AND StartTime > ? AND Status IN ('claimable','claiming','finished')", whereArgs, skipData);
    }
    async getSession(sessionId) {
        let row = await this.db.get("SELECT SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data,ClaimData FROM Sessions WHERE SessionId = ?", [sessionId]);
        if (!row)
            return null;
        return {
            sessionId: row.SessionId,
            status: row.Status,
            startTime: row.StartTime,
            targetAddr: row.TargetAddr,
            dropAmount: row.DropAmount,
            remoteIP: row.RemoteIP,
            tasks: JSON.parse(row.Tasks),
            data: JSON.parse(row.Data),
            claim: row.ClaimData ? JSON.parse(row.ClaimData) : null,
        };
    }
    async updateSession(sessionData) {
        await this.db.run(SQL.driverSql({
            [FaucetDbDriver.SQLITE]: "INSERT OR REPLACE INTO Sessions (SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data,ClaimData) VALUES (?,?,?,?,?,?,?,?,?)",
            [FaucetDbDriver.MYSQL]: "REPLACE INTO Sessions (SessionId,Status,StartTime,TargetAddr,DropAmount,RemoteIP,Tasks,Data,ClaimData) VALUES (?,?,?,?,?,?,?,?,?)",
        }), [
            sessionData.sessionId,
            sessionData.status,
            sessionData.startTime,
            sessionData.targetAddr,
            sessionData.dropAmount,
            sessionData.remoteIP,
            JSON.stringify(sessionData.tasks),
            JSON.stringify(sessionData.data),
            sessionData.claim ? JSON.stringify(sessionData.claim) : null,
        ]);
    }
    async updateClaimData(sessionId, claimData) {
        let status;
        switch (claimData.claimStatus) {
            case ClaimTxStatus.CONFIRMED:
                status = FaucetSessionStatus.FINISHED;
                break;
            case ClaimTxStatus.FAILED:
                status = FaucetSessionStatus.FAILED;
                break;
            default:
                status = FaucetSessionStatus.CLAIMING;
                break;
        }
        await this.db.run("UPDATE Sessions SET Status = ?, ClaimData = ? WHERE Status = 'claiming' AND SessionId = ?", [
            status,
            JSON.stringify(claimData),
            sessionId
        ]);
    }
    async getClaimableAmount() {
        let row = await this.db.get("SELECT SUM(CAST(DropAmount AS FLOAT)) AS TotalAmount FROM Sessions WHERE Status = 'claimable'");
        if (!row || !row.TotalAmount)
            return 0n;
        return BigInt(row.TotalAmount);
    }
}
//# sourceMappingURL=FaucetDatabase.js.map