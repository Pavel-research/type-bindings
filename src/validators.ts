import types=require("./types")
import metakeys=require("./metaKeys")
import ts=require("./typesService")
import InstanceValidator=types.InstanceValidator;
import IGraphPoint=types.IGraphPoint;
import Status=types.Status;
import Severity=types.Severity;

import Type=types.Type;
import AbstractBinding=types.AbstractBinding;
import service=ts.INSTANCE

export class CompositeValidator implements InstanceValidator {

    _validators: InstanceValidator[] = [];
    _errorMessage: string;

    validateBinding(b: IGraphPoint): Status {
        var sts = this._validators.map(x => x.validateBinding(b))
        sts = sts.filter(x => x.severity != Severity.OK);
        if (sts.length == 0) {
            return ok();
        }
        var warns = sts.filter(x => x.severity == Severity.WARNING);
        sts = sts.filter(x => x.severity != Severity.WARNING);
        if (sts.length > 0) {
            var message = sts.map(x => x.message).join(", ");
            if (this._errorMessage) {
                return error(types.ts.interpolate(this._errorMessage, <any>b.type(),<any>b.type()), sts[0].path, b.uid(),sts);
            }
            return error(message, b.uid(),sts[0].path, sts);
        }
        if (warns.length > 0) {
            var message = warns.map(x => x.message).join(", ");
            return warn(message);
        }
    }
}
function getOwningCollection(b: IGraphPoint): types.CollectionBinding {
    var hu: metakeys.OwningCollection = b.type();
    var oc = (<any>b.type()).owningCollection;
    if (!oc) {
        if (b.parent()) {
            oc = (<any>b.parent().type()).owningCollection;
        }
    }
    if (oc instanceof AbstractBinding) {
        oc = (<AbstractBinding>oc).collectionBinding();
    }
    return oc;
};

export class UniquieValueValidator implements InstanceValidator {

    constructor(private type: Type&metakeys.OwningCollection) {

    }

    validateBinding(b: IGraphPoint): Status {
        var hu: metakeys.OwningCollection = b.type();
        var oc = getOwningCollection(b);
        if (oc) {
            if (oc.contains(b.get())) {
                var ue = (<any>b.type()).uniquinessException;
                if (ue instanceof AbstractBinding) {
                    ue = ue.get();
                }
                if (ue == b.get()) {
                    return ok();
                }
                return error(b.type().displayName + " should be unique", b.id());
            }
        }
        return ok();
    }
}
export function ok(): Status {
    return {
        severity: Severity.OK,
        message: "",
        path: "",
        valid: true
    }
}
export function error(message: string,uid:string, path: string = "",inner?:Status[]): Status {
    return {
        severity: Severity.ERROR,
        message: message,
        path: path,
        valid: false,
        inner: inner,
        uid:uid
    }
}
export function warn(message: string, path: string = "",inner?:Status[]): Status {
    return {
        severity: Severity.WARNING,
        message: message,
        path: path,
        valid: true,
        inner: inner
    }
}
export class UniquinesValidator implements InstanceValidator {

    constructor(private type: Type&metakeys.OwningCollection) {
    }

    validateBinding(b: IGraphPoint): Status {
        var oc = getOwningCollection(b);
        if (oc) {
            var uex = [];
            if (b.parent() && (<any>b.parent().type()).uniquinessException) {
                var ue = (<any>b.parent().type()).uniquinessException;
                if (ue instanceof AbstractBinding) {
                    ue = ue.get();
                }
                uex.push(ue);
            }
            if ((<types.CollectionBinding>oc).containsWithProp(b.type().id, b.get(), uex)) {
                return error(b.type().displayName + " should be unique", b.id());
            }
        }
        return ok();
    }
}
export class EnumValuesValidator implements InstanceValidator {
    constructor(private v: Type&metakeys.EnumValues) {

    }

    validateBinding(b: IGraphPoint): Status {
        if (b.get()) {
            var options = types.enumOptions(b.type(), <types.IBinding>b);
            if (options.indexOf(b.get()) == -1) {
                return error(b.type().displayName + " should be one of :" + options,b.uid())
            }
        }
        return ok();
    }
}
export class RequiredValidator implements InstanceValidator {
    validateBinding(b: IGraphPoint): Status {
        if (!b.get() && b.get() !== false) {
            return error(b.type().displayName + " is required",b.uid());
        }
        return ok();
    }
}
export class RequiredWhenValidator implements InstanceValidator {
    constructor(private v: metakeys.RequiredWhen) {

    }

    validateBinding(b: IGraphPoint): Status {
        if (!b.get() && b.get() !== false) {
            if (types.calcCondition(this.v.requiredWhen, b)) {
                if (this.v.requiredWhenMessage) {
                    return error(this.v.requiredWhenMessage,b.uid());
                }
                return error(b.type().displayName + " is required in this context",b.uid());
            }
        }
        return ok();
    }
}

export class ValidationManager {

    private valMap: WeakMap<types.Type,types.InstanceValidator> = new WeakMap();

    validator(t: types.Type): types.InstanceValidator {
        var rs = service.resolvedType(t);
        var hasW: metakeys.HasValidator = <metakeys.HasValidator>rs;
        let instanceValidator = hasW.instanceValidator;
        if (instanceValidator && hasW.overrideDefaultValidators) {
            return this.toVal(instanceValidator);
        }
        if (this.valMap.has(rs)) {
            return this.valMap.get(rs);
        }
        var cm = new CompositeValidator();
        this.valMap.set(rs, cm);
        if (hasW.errorMessage) {
            cm._errorMessage = hasW.errorMessage;
        }
        var collection = (<metakeys.OwningCollection>rs).owningCollection;
        if (collection) {
            //lets add unique validator
            if ((<metakeys.Unique>rs).unique) {
                cm._validators.push(new UniquinesValidator(<any>rs))
            }
            if ((<metakeys.Unique>rs).uniqueValue) {
                cm._validators.push(new UniquieValueValidator(<any>rs))
            }
        }
        else {
            if ((<metakeys.Unique>rs).unique) {
                cm._validators.push(new UniquinesValidator(<any>rs))
            }
        }
        if (instanceValidator) {
            cm._validators.push(this.toVal(instanceValidator));
        }
        if (rs.required && typeof rs.required == "boolean") {
            cm._validators.push(new RequiredValidator());
        }
        if ((<metakeys.RequiredWhen>rs).requiredWhen) {
            cm._validators.push(new RequiredWhenValidator((<metakeys.RequiredWhen>rs)));
        }
        if (rs.enum || (<metakeys.EnumValues>rs).enumValues) {
            cm._validators.push(new EnumValuesValidator(t));
        }
        if (service.isString(rs)) {
            var st: types.StringType = rs;
            if (st.pattern) {
                cm._validators.push({
                    validateBinding(v: types.IGraphPoint): types.Status{
                        var vl = "" + v.get();
                        if (!vl.match(st.pattern)) {
                            return error(v.type().displayName + " should match to " + st.pattern,v.uid());
                        }
                        return ok();
                    }
                })
            }
            if (st.minLength) {
                cm._validators.push({
                    validateBinding(v: types.IGraphPoint): types.Status{
                        var vv = v.get();
                        if (v.get()) {
                            var vl = "" + vv;
                            if (vl.length < st.minLength) {
                                return error(v.type().displayName + " should have at least " + st.minLength + " characters",v.uid());
                            }
                        }
                        return ok();
                    }
                })
            }
            if (st.maxLength) {
                cm._validators.push({
                    validateBinding(v: types.IGraphPoint): types.Status{
                        if (v.get()) {
                            var vl = "" + v.get();
                            if (vl.length > st.maxLength) {
                                return error(v.type().displayName + " should have not more then " + st.maxLength + " characters",v.uid());
                            }
                        }
                        return ok();
                    }
                })
            }

        }
        if (service.isNumber(rs)) {
            var nt: types.NumberType = rs;

            if (nt.minimum) {
                cm._validators.push({
                    validateBinding(v: types.IGraphPoint): types.Status{
                        var vv = v.get();
                        if (v.get()) {
                            var vl = vv;
                            if (vl < nt.minimum) {
                                return error(v.type().displayName + " should be at least " + nt.minimum,v.uid());
                            }
                        }
                        return ok();
                    }
                })
            }
            if (nt.maximum) {
                cm._validators.push({
                    validateBinding(v: types.IGraphPoint): types.Status{
                        var vv = v.get();
                        if (v.get()) {
                            var vl = vv;
                            if (vl > nt.maximum) {
                                return error(v.type().displayName + " should be not more then " + nt.maximum,v.uid());
                            }
                        }
                        return ok();
                    }
                })
            }

        }
        if (service.isObject(rs)) {
            var ps = service.allProperties(rs);
            ps.forEach(p => {
                var v = this.validator(p)
                cm._validators.push({

                    validateBinding(g: types.IGraphPoint){
                        if (!g.get()){
                            return ok();
                        }
                        var lb = g.binding(p.id);
                        if (service.isVisible(lb.type(), lb)) {
                            var res = v.validateBinding(lb);
                            if (!res.path) {
                                res.path = p.id;
                            }
                            else {
                                res.path = p.id + "." + res.path
                            }
                            return res;
                        }
                        return ok();
                    }
                });
            });
        }
        else if (service.isArray(rs)) {
            cm._validators.push({

                validateBinding(g: types.IGraphPoint){
                    var value = g.get();
                    if (value) {
                        var toVal: any[] = value;
                        if (!Array.isArray(value)) {
                            toVal = [value];
                        }
                        var bnd = new types.Binding("");
                        //bnd._parent=<types.Binding>g;
                        var ct = {
                            id: "",
                            type: service.componentType(rs),
                            owningCollection: (<types.Binding>g).collectionBinding(),
                            uniquinessException: bnd
                        };
                        bnd._type = ct;
                        bnd.context = <types.Binding>g;
                        var componentValidator = INSTANCE.validator(ct);
                        var statuses: types.Status[] = [];
                        toVal.forEach((el, i) => {
                            bnd.value = el;
                            var rs = componentValidator.validateBinding(bnd);//
                            if (!rs.valid) {
                                statuses.push(error(service.caption(ct) + " " + service.label(el, ct) + " has problems (" + rs.message + ")", "[" + i + "]", g.uid(),[rs]));
                            }
                        })
                        statuses = statuses.filter(x => x.severity == types.Severity.ERROR);
                        if (statuses.length > 0) {
                            return error(statuses.map(x => x.message).join(","),g.uid(), "", statuses);
                        }
                        return ok();
                    }
                    return ok();
                }
            });
        }
        else if (service.isMap(rs)) {
            cm._validators.push({

                validateBinding(g: types.IGraphPoint){
                    var value = (<types.AbstractBinding>g).collectionBinding().workingCopy();
                    if (value) {
                        var toVal: any[] = value;
                        if (!Array.isArray(value)) {
                            toVal = [value];
                        }
                        var bnd = new types.Binding("");
                        var ct = {
                            id: "",
                            type: (<types.Binding>g).collectionBinding().componentType(),
                            owningCollection: (<types.Binding>g).collectionBinding(),
                            uniquinessException: bnd
                        };
                        //bnd._parent=<types.Binding>g;
                        bnd._type = ct;
                        bnd.context = <types.Binding>g;
                        var componentValidator = INSTANCE.validator(bnd.type());
                        var statuses: types.Status[] = [];
                        toVal.forEach((el, i) => {
                            bnd.value = el;
                            var rs = componentValidator.validateBinding(bnd);//
                            if (!rs.valid) {
                                statuses.push(error(service.caption(bnd.type()) + " " + service.label(el, bnd.type()) + " has problems (" + rs.message + ")", g.uid(),"[" + i + "]", [rs]));
                            }
                        })
                        statuses = statuses.filter(x => x.severity == types.Severity.ERROR);
                        if (statuses.length > 0) {
                            return error(statuses.map(x => x.message).join(","),g.uid(), "", statuses);
                        }
                        return ok();
                    }
                    return ok();
                }
            });
        }
        return cm;
    }

    private toVal(instanceValidator: types.InstanceValidator|string|string[]): types.InstanceValidator {
        if (typeof instanceValidator == "string") {
            return {
                validateBinding(g: types.IGraphPoint){
                    var clc = types.calcExpression(<string>instanceValidator, g);
                    if (!clc) {
                        return error("Some error", "")
                    }
                    return ok();
                }
            }
        }
        else if (Array.isArray(instanceValidator)) {
            var cmpVal = new CompositeValidator();
            var vals: string[] = instanceValidator;
            vals.forEach(x => {
                var vl = {
                    validateBinding(g: types.IGraphPoint){
                        var clc = types.calcExpression(<string><any>instanceValidator, g);
                        if (!clc) {
                            return error("Some error", "")
                        }
                        return ok();
                    }
                }
                cmpVal._validators.push(vl);
            })
            return cmpVal;
        }
        return <types.InstanceValidator>instanceValidator;
    }
}

export const INSTANCE = new ValidationManager();