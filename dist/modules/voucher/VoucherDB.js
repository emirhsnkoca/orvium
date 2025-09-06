import { FaucetDbDriver } from '../../db/FaucetDatabase.js';
import { FaucetModuleDB } from '../../db/FaucetModuleDB.js';
import { SQL } from '../../db/SQL.js';
export class VoucherDB extends FaucetModuleDB {
    latestSchemaVersion = 1;
    async upgradeSchema(version) {
        switch (version) {
            case 0:
                version = 1;
                await this.db.exec(SQL.driverSql({
                    [FaucetDbDriver.SQLITE]: `
            CREATE TABLE "Vouchers" (
              "Code" TEXT NOT NULL UNIQUE,
              "DropAmount" TEXT NOT NULL,
              "SessionId" TEXT NULL,
              "TargetAddr" TEXT NULL,
              "StartTime" INTEGER NULL,
              PRIMARY KEY("Code")
            );`,
                    [FaucetDbDriver.MYSQL]: `
            CREATE TABLE Vouchers (
              Code VARCHAR(50) NOT NULL,
              DropAmount VARCHAR(50) NOT NULL,
              SessionId CHAR(36) NULL,
              TargetAddr CHAR(42) NULL,
              StartTime INT(11) NULL,
              PRIMARY KEY(Code)
            );`,
                }));
        }
        return version;
    }
    async getVoucher(code) {
        let sql = [
            "SELECT Code, DropAmount, SessionId, TargetAddr, StartTime",
            "FROM Vouchers",
            "WHERE Code = ?",
        ].join(" ");
        let rows = await this.db.all(sql, [code]);
        let vouchers = rows.map((row) => {
            return {
                code: row.Code,
                dropAmount: row.DropAmount,
                sessionId: row.SessionId,
                targetAddr: row.TargetAddr,
                startTime: row.StartTime,
            };
        });
        if (vouchers.length === 0)
            return null;
        return vouchers[0];
    }
    async updateVoucher(code, sessionId, startTime, oldSessionId) {
        let sql = "UPDATE Vouchers SET SessionId = ?, StartTime = ? WHERE Code = ?";
        let args = [
            sessionId,
            startTime,
            code,
        ];
        if (oldSessionId) {
            sql += " AND SessionId = ?";
            args.push(oldSessionId);
        }
        else {
            sql += " AND SessionId IS NULL";
        }
        let res = await this.db.run(sql, args);
        return res.changes > 0;
    }
    async updateVoucherTarget(code, sessionId, targetAddr) {
        let sql = "UPDATE Vouchers SET TargetAddr = ? WHERE Code = ? AND SessionId = ?";
        let args = [
            targetAddr,
            code,
            sessionId,
        ];
        await this.db.run(sql, args);
    }
}
//# sourceMappingURL=VoucherDB.js.map