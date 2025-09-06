import { BaseDriver } from "./BaseDriver.js";
export class SQLiteDriver extends BaseDriver {
    static sqlite;
    static loadSQLite() {
        if (!this.sqlite) {
            this.sqlite = import("../../../libs/sqlite3_wasm.cjs");
        }
        return this.sqlite;
    }
    db;
    async open(options) {
        let sqlite = await SQLiteDriver.loadSQLite();
        this.db = new sqlite.default.Database(options.file);
    }
    async close() {
        this.db.close();
    }
    async exec(sql) {
        try {
            this.db.exec(sql);
        }
        catch (ex) {
            return Promise.reject("sqlite exec() error: " + sql + " [] " + ex.toString());
        }
    }
    async run(sql, values) {
        try {
            return this.db.run(sql, values);
        }
        catch (ex) {
            return Promise.reject("sqlite run() error: " + sql + " [] " + ex.toString());
        }
    }
    async all(sql, values) {
        try {
            return this.db.all(sql, values);
        }
        catch (ex) {
            return Promise.reject("sqlite all() error: " + sql + " [] " + ex.toString());
        }
    }
    async get(sql, values) {
        try {
            return this.db.get(sql, values);
        }
        catch (ex) {
            return Promise.reject("sqlite get() error: " + sql + " [] " + ex.toString());
        }
    }
}
//# sourceMappingURL=SQLiteDriver.js.map