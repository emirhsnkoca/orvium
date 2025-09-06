import { faucetConfig } from "../config/FaucetConfig.js";
import { FaucetDbDriver } from "./FaucetDatabase.js";
export class SQL {
    static driverSql(sqlMap, driver) {
        return sqlMap[driver || faucetConfig.database.driver];
    }
    static field(name, driver) {
        switch (driver || faucetConfig.database.driver) {
            case FaucetDbDriver.MYSQL: return "`" + name + "`";
            default: return name;
        }
    }
}
//# sourceMappingURL=SQL.js.map