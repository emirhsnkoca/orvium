import mysql from "mysql2";
import { BaseDriver } from "./BaseDriver.js";
export class MySQLDriver extends BaseDriver {
    pool;
    db;
    async open(options) {
        this.pool = mysql.createPool({
            connectionLimit: options.poolLimit || 5,
            host: options.host,
            port: options.port || 3306,
            user: options.username,
            password: options.password,
            database: options.database,
        });
    }
    async close() {
        await new Promise((resolve) => this.pool.end(() => resolve()));
    }
    async exec(sql) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err)
                    return reject("mysql exec() error: could not acquire connection: " + err.toString());
                connection.query(sql, (error, results) => {
                    if (error)
                        reject("mysql exec() error [" + sql + "]: " + error.toString());
                    else
                        resolve();
                    connection.release();
                });
            });
        });
    }
    async run(sql, values) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err)
                    return reject("mysql run() error: could not acquire connection: " + err.toString());
                connection.query(sql, values, (error, results) => {
                    if (error)
                        reject("mysql run() error [" + sql + "]: " + error.toString());
                    else {
                        resolve({
                            changes: results.affectedRows,
                            lastInsertRowid: results.insertId,
                        });
                    }
                    connection.release();
                });
            });
        });
    }
    async all(sql, values) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err)
                    return reject("mysql all() error: could not acquire connection: " + err.toString());
                connection.query(sql, values, (error, results) => {
                    if (error)
                        reject("mysql all() error [" + sql + "]: " + error.toString());
                    else {
                        resolve(results);
                    }
                    connection.release();
                });
            });
        });
    }
    async get(sql, values) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection((err, connection) => {
                if (err)
                    return reject("mysql get() error: could not acquire connection: " + err.toString());
                connection.query(sql, values, (error, results) => {
                    if (error)
                        reject("mysql get() error [" + sql + "]: " + error.toString());
                    else {
                        resolve(results.length > 0 ? results[0] : null);
                    }
                    connection.release();
                });
            });
        });
    }
}
//# sourceMappingURL=MySQLDriver.js.map