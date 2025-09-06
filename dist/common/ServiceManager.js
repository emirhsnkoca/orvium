export class ServiceManager {
    static _serviceSymbol = (globalThis.Symbol ? Symbol("ServiceInstances") : "__SvcInstances");
    static _serviceClasses = [];
    static _serviceInstances = [];
    static GetServiceIdx(serviceClass) {
        let serviceIdx;
        if (serviceClass.hasOwnProperty(this._serviceSymbol))
            serviceIdx = serviceClass[this._serviceSymbol];
        else {
            serviceIdx = this._serviceClasses.length;
            Object.defineProperty(serviceClass, this._serviceSymbol, {
                value: serviceIdx,
                writable: false
            });
            this._serviceClasses.push(serviceClass);
            this._serviceInstances.push([]);
        }
        return serviceIdx;
    }
    static GetServiceObj(serviceIdx, identObj) {
        let objListLen = this._serviceInstances[serviceIdx].length;
        for (let idx = 0; idx < objListLen; idx++) {
            if (this._serviceInstances[serviceIdx][idx][0] === identObj)
                return this._serviceInstances[serviceIdx][idx][1];
        }
        return null;
    }
    static AddServiceObj(serviceIdx, identObj, serviceObj) {
        this._serviceInstances[serviceIdx].push([
            identObj,
            serviceObj
        ]);
    }
    static GetService(serviceClass, serviceIdent = null, serviceProps = null) {
        if (!serviceClass)
            return null;
        let serviceIdx = this.GetServiceIdx(serviceClass);
        let serviceObj = this.GetServiceObj(serviceIdx, serviceIdent);
        if (!serviceObj) {
            serviceObj = new serviceClass(serviceProps);
            this.AddServiceObj(serviceIdx, serviceIdent, serviceObj);
        }
        return serviceObj;
    }
    static DisposeAllServices() {
        let promises = [];
        this._serviceInstances.forEach((instanceArr) => {
            if (instanceArr.length > 0) {
                instanceArr.forEach((instance) => {
                    if (typeof instance[1].dispose === "function") {
                        promises.push(instance[1].dispose());
                    }
                });
                instanceArr.splice(0, instanceArr.length);
            }
        });
        return Promise.all(promises).then();
    }
}
//# sourceMappingURL=ServiceManager.js.map