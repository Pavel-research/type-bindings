/**
 * Created by Pavel on 02.01.2017.
 */
import types=require("./types")
import metakeys=require("./metaKeys")
import moment=require("moment")
import pluralize=require("pluralize")
import {Binding, Operation} from "./types";
import {isArray} from "util";
import set = Reflect.set;
import storage=require("./storage")
import {isNullOrUndefined} from "util";
import utils=require("./utils")

let applyProp = function (superP: types.Type, result: {}) {
    if (superP) {
        if (typeof superP == "string") {
            superP = INSTANCE.resolveTypeByName(superP);
        }
        Object.keys(superP).forEach(x => result[x] = superP[x]);
    }
    return superP;
};
function mergeProp(dec: types.Type, superP: types.Type): types.Type {
    if (!superP){
        return dec;
    }
    if (!dec){
        return superP;
    }
    var result = {};

    applyProp(superP, result);
    applyProp(dec, result);
    return <types.Type>result;
}
function apply(t: types.Type, s: types.Type) {
    Object.keys(s).forEach(k => {
        if (k == "properties") {
            if (!t[k]) {
                t[k] = {};
            }
            {
                var props = s[k];
                Object.keys(props).forEach(p => {

                    t[k][p] = mergeProp(props[p], t[k][p]);
                })
            }

            return;
        }
        if (k == "type") {
            return;
        }
        else {
            t[k] = s[k];
        }
    })
    var props = (<types.ObjectType>s).properties;
    if (props && t.required && Array.isArray(t.required)) {
        Object.keys(props).forEach(p => {
            if ((<types.Type>props[p]).required) {
                (<string[]>t.required).push(p);
            }
        })
    }
}
export function nicerName(n: string) {
    var result: string[] = [];
    var needUpperCase = true;
    var p = "";
    for (var i = 0; i < n.length; i++) {
        var c = n.charAt(i);
        if (c == '_') {
            c = ' ';
        }
        if (p.toUpperCase() != p) {
            if (c.toLowerCase() != c) {
                result.push(' ');
            }
        }
        if (needUpperCase) {
            c = c.toUpperCase();
            needUpperCase = false;
        }

        result.push(c);
        p = c;
    }

    return result.join("");
}
const GENERIC_GROUP = "Generic";
const ADVANCED_GROUP = "Advanced";
const OTHER_GROUP = "Other";

export function interpolate(str: string, props: any) {
    return str.replace(/\${(\w+)\}/g, function (match, expr) {
        return (props )[expr];
    });
}
function setupGroups(ps: types.Property[], t: types.Type) {
    if (!ps) {
        return;
    }
    var allProperties: Map<string,types.Property> = new Map();
    if ((<metakeys.PropertyGroups>t).propertyGroups) {
        var pc = (<metakeys.PropertyGroups>t).propertyGroups;
        Object.keys(pc).forEach(x => {
            pc[x].forEach(y => {
                ps.forEach(p => {
                    if (p.id == y) {
                        p.groupId = x;
                    }
                })

            })
        })
    }
    ps.forEach(x => {
            if (x.required && INSTANCE.isScalar(x.type)||INSTANCE.isReference(x.type)) {
                x.groupId = GENERIC_GROUP
                return;
            }

            if (!x.groupId) {
                allProperties.set(x.id, x)
            }
        }
    );
    var it = allProperties.keys()
    while (true) {
        var v = it.next()
        if (v.done) {
            return;
        }
        var val = v.value
        var q = allProperties.get(val);
        if (INSTANCE.isScalar(q.type)) {
            q.groupId = GENERIC_GROUP;
            if ((<metakeys.needsOwnGroup>q.type).needsOwnGroup) {
                q.groupId = q.id;
            }
        }
        else {
            q.groupId = q.id;
        }
    }
}
export interface IPropertyGroup {
    id: string,
    caption: string,
    properties: types.Property[]
}
let deps = function (p: IPropertyGroup, x) {
    var dependent: types.Property[] = [];
    p.properties.forEach(y => {
        if (dependencyString(y.type).indexOf(x.id) != -1) {
            dependent.push(y);
        }
        if ((<any>y.type).discriminationInfo) {
            if ((<any>y.type).discriminationInfo[x.id]) {
                dependent.push(y);
                x.discriminator = true;
            }
        }
    });
    return dependent;
};

function autoInit(t: types.Type) {
    if (t.enum) {
        return true;
    }
    if (INSTANCE.isBoolean(t)) {
        return true;
    }
}
function labelProps(t: types.Type): string {
    var m: metakeys.Label = <any>INSTANCE.resolvedType(t);
    if (m.label) {
        if (typeof m.label == "function") {
            return "";
        }
        else {
            return m.label
        }
    }
    return "name title label id"
}
function order(t: types.Type, p: IPropertyGroup) {

    var copy: types.Property[] = [];
    var inserted: {[name: string]: boolean} = {}
    p.properties.forEach(x => {
        var dependent = deps(p, x);
        x.dependents = dependent;
        x.dependents.forEach(y => y.depends = x);
    })
    let properties = p.properties.filter(x => !(<types.FunctionalValue>x.type).computeFunction);
    var lp = labelProps(t);
    var kp = (<types.metakeys.KeyProp>t).keyProp;
    if (kp) {
        properties.forEach(x => {
            if (x.id == kp) {
                insert(x, copy, inserted)
            }
        })
    }


    properties.forEach(x => {
        if (lp.indexOf(x.id) != -1) {
            insert(x, copy, inserted)
        }
    })


    var kp = (<types.ObjectType>t).discriminator;
    if (kp) {
        properties.forEach(x => {
            if (x.id == kp) {
                insert(x, copy, inserted)
            }
        })
    }
    properties.forEach(x => {
        if (x.required && !autoInit(x.type) && isNullOrUndefined(x.depends)) {
            insert(x, copy, inserted)
        }
    })
    properties.forEach(x => {
        if (x.required && (!autoInit(x.type) || x.discriminator)) {
            insert(x, copy, inserted)
        }
    })
    var po: metakeys.PropOrder = <any>t;
    if (po.propOrder) {
        po.propOrder.forEach(x => {
            p.properties.forEach(y => {
                if (y.id == x) {
                    insert(y, copy, inserted)
                }
            })
        })
    }
    properties.forEach(x => {
        if (!types.service.isBoolean(x) && !x.depends) {
            insert(x, copy, inserted)
        }
    })
    properties.forEach(x => {
        if (types.service.isBoolean(x)) {
            insert(x, copy, inserted)
        }
    })
    properties.forEach(x => {
        insert(x, copy, inserted)
    })
    p.properties.filter(x => (<types.FunctionalValue>x.type).computeFunction).forEach(x => {
        insert(x, copy, inserted)
    });
    p.properties = copy;
}

function insert(p: types.Property, copy: types.Property[], inserted: {[name: string]: boolean}) {
    if (inserted[p.id]) {
        return;
    }
    inserted[p.id] = true;
    copy.push(p);
    p.dependents.forEach(d => {
        if (!types.service.isBoolean(d)) {
            insert(d, copy, inserted)
        }
    });
    p.dependents.forEach(d => {
        insert(d, copy, inserted)
    });
}

function dependencyString(t: types.Type) {
    var ft: types.FullTypeOptions = <any>t;
    var ds = "";
    ds = ds + addDeps(ft.hiddenWhen)
    ds = ds + addDeps(ft.visibleWhen)
    ds = ds + addDeps(ft.requiredWhen)
    ds = ds + addDeps(ft.disabledWhen);
    return ds;
}

function addDeps(v: any) {
    if (typeof v == "string") {
        return v;
    }
    return "";
}

export interface IExecutor{
    executeOperation(op: types.Operation,parameters:{ [name:string]:any},cb:(r:any)=>void)
}
export class TypeService implements IExecutor{

    private instanceMap: WeakMap<any,types.Type> = new WeakMap();

    private typeMap: WeakMap<types.Type,types.Type> = new WeakMap();

    private typeByName: Map<string,types.Type> = new Map();

    private executors:{[name:string]:IExecutor}={};

    isScalar(t: types.Type) {
        var m = this.isSubtypeOf(t, types.TYPE_SCALAR);
        if (!m) {
            var options = (<types.UnionType>t).options;
            if (options) {
                var allScalar = true;
                options.forEach(x => {
                    allScalar = allScalar && this.isScalar(this.resolvedType(x));
                })
                if (allScalar) {
                    return true;
                }
            }
        }
        return m;
    }
    isReference(t:types.Type){
        var r=this.resolvedType(t);
        if ((<metakeys.Reference>r).reference){
            return true;
        }
        return false;
    }

    isNumber(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_NUMBER);
    }

    isInteger(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_INTEGER);
    }

    isString(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_STRING);
    }

    isArray(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_ARRAY);
    }

    isRelation(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_RELATION);
    }

    isView(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_VIEW);
    }

    constructors(t : types.Type):types.Operation[]{
        if (!t.constructors){
            return [];
        }
        return <types.Operation[]>t.constructors.map(x=>{
            if (typeof x=="string"){
                return this.resolveTypeByName(x);
            }
            return x;
        })
    }
    executeOperation(op: types.Operation,parameters:{ [name:string]:any},cb:(r:any)=>void){
        this.executors[op.executorId].executeOperation(op,parameters,cb);
    }
    registerExecutor(name:string,ex:IExecutor){
        this.executors[name]=ex;
    }

    conversionRules:{
        [key:string]:types.ConversionRule
    }={}

    registerModule(module:types.Module){
        if (module.conversionRules){
            Object.keys(module.conversionRules).forEach(x=>{
                var cr=module.conversionRules[x];
                var key=cr.from+"->"+cr.to;
                this.conversionRules[key]=cr;
            })
        }
    }

    resolvableId(t:types.Type| string){
        if (typeof  t=="string"){
            return t;
        }
        if (t.id){
            return t.id;
        }
        if (t.type){
            if (typeof t.type=="string"){
                return t.type;
            }
            if (Array.isArray(t.type)){
                var m:any[]=t.type;
                if (m.length==1){
                    if (typeof m[0]=="string"){
                        return m[0];
                    }
                    return this.resolvableId(m[0]);
                }
                return null;
            }
            return this.resolvableId(t.type)
        }
    }
    private executeConversionRule(r:types.ConversionRule,targetType : types.Type,sourceType:types.Type,vl:any){
        if (r.selfRule){
            var b=new Binding("");
            b.set(vl)
            var exp=types.calcExpression(r.selfRule,b);
            return exp;
        }
        return vl;
    }

    convert(targetType : types.Type,sourceType:types.Type,vl:any):any{
        if (this.isSubtypeOf(sourceType,targetType)){
            return vl;
        }
        var sid=this.resolvableId(sourceType);
        var tid=this.resolvableId(targetType);
        var cid=sid+"->"+tid;
        if (this.conversionRules[cid]){
            return this.executeConversionRule(this.conversionRules[cid],targetType,sourceType,vl);
        }
        if (this.isArray(targetType)&&this.isArray(sourceType)){
            if (Array.isArray(vl)){
                return vl.map(x=>{
                    return this.convert(this.componentType(targetType),this.componentType(sourceType),x);
                })
            }
        }
        if (this.isString(targetType)){
            if (this.isObject(sourceType)){
                return this.label(vl,sourceType);//
            }
        }
        if (this.isObject(targetType)){
            var rs={};
            this.allProperties(targetType).forEach(x=>{
                var cl=this.getValue(sourceType,vl,x.id,null);
                if (cl){
                    if (cl){
                        cl=this.convert(x.type,this.property(sourceType,x.id).type,cl);//
                    }
                    this.setValue(targetType,rs,x.id,cl,null);
                }
                else{
                    this.setValue(targetType,rs,x.id,null,null);
                }
            })
            return rs;
        }
        return vl;
    }
    updaters(t : types.Type):types.Operation[]{
        if (!t.updaters){
            return [];
        }
        return <types.Operation[]>t.updaters.map(x=>{
            if (typeof x=="string"){
                return this.resolveTypeByName(x);
            }
            return x;
        })
    }
    destructors(t : types.Type):types.Operation[]{
        if (!t.destructors){
            return [];
        }
        return <types.Operation[]>t.destructors.map(x=>{
            if (typeof x=="string"){
                return this.resolveTypeByName(x);
            }
            return x;
        })
    }
    listers(t : types.Type):types.Operation[]{
        if (!t.listers){
            return [];
        }
        return <types.Operation[]>t.listers.map(x=>{
            if (typeof x=="string"){
                return this.resolveTypeByName(x);
            }
            return x;
        })
    }

    isVisible(t: types.Type, b: types.IGraphPoint): boolean {
        var m: types.metakeys.VisibleWhen&types.metakeys.DisabledWhen = t;
        var visible = true;
        if (!isNullOrUndefined(m.visibleWhen)) {
            visible = visible && types.calcCondition(m.visibleWhen, b);
        }
        var vl = t;
        if ((<types.metakeys.DiscriminatorValueInfo><any>vl).discriminationInfo) {
            var map = (<types.metakeys.DiscriminatorValueInfo><any>vl).discriminationInfo
            if (b.parent()) {
                Object.keys(map).forEach(x => {
                    var actualDescValue = b.parent().binding(x).get();
                    if (map[x].indexOf(actualDescValue) == -1) {
                        visible = false;
                    }
                })

            }
        }
        if (m.hiddenWhen) {
            visible = visible && !types.calcCondition(m.hiddenWhen, b)
        }
        return visible
    }

    componentType(t: types.Type): types.Type {
        t=this.resolvedType(t);
        var cm: types.ArrayType = t;
        if (this.isArray(t)) {
            return this.resolvedType(cm.itemType);
        }
        if (this.isMap(t)) {
            return this.resolvedType((<types.MapType>cm).componentType);
        }
    }

    isFiniteSetOfInstances(t: types.Type) {
        return t.enum || (<metakeys.EnumValues>t).enumValues;
    }

    normalize(r: types.TypeReference) {
        if (typeof  r == "string") {
            return this.resolveTypeByName(r);
        }
        else {
            return r;
        }
    }

    isMultiSelect(t: types.Type) {
        if (this.isArray(t)) {
            var cm: types.ArrayType = t;
            if (cm.uniqueItems) {
                if (this.isFiniteSetOfInstances(this.componentType(t))||(<metakeys.Reference>this.resolvedType(t)).reference) {
                    if (!(<metakeys.Ordered>t).ordered) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    isBoolean(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_BOOLEAN);
    }

    isSame(v0:any,v1:any,t:types.Type){
        if (v0==v1){
            return true;
        }
        var kp=this.keyProp(t);
        if (kp){
            var k0=this.getValue(t,v0,kp);
            var k1=this.getValue(t,v1,kp);
            return k0==k1;
        }
    }

    isDate(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_DATE);
    }

    isMap(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_MAP);
    }

    isObject(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_OBJECT);
    }

    isSubtypeOf(t: types.Type, superT: types.Type) {
        if (t == superT) {
            return true;
        }
        if (((<any>t).$original) == superT) {
            return true;
        }
        if (this.resolvedType(superT)==t) {
            return true;
        }
        var st = this.superTypes(t);
        for (var i = 0; i < st.length; i++) {
            if (this.isSubtypeOf(st[i], superT)) {
                return true;
            }
        }
    }


    register(t: types.Type) {
        if (t.type=="module"){
            this.registerModule(<types.Module>t);
        }
        if (t.id) {
            // if (this.typeByName.has(t.id)) {
            //     if (this.typeByName.get(t.id) === t) {
            //         return;
            //     }
            //     throw new Error("Type with this id already exists");
            // }
            this.typeByName.set(t.id, t);
        }
    }

    resolveTypeByName(name: string): types.Type {
        if (this.typeByName.has(name)) {
            return this.typeByName.get(name);
        }
        return types.TYPE_ANY;
    }

    superTypes(t: types.Type): types.Type[] {
        var rt = this.resolvedType(t);
        if (!rt.type) {
            return [];
        }
        return <types.Type[]>rt.type;
    }

    discriminatorValue(t: types.Type) {
        var r = this.resolvedType(t);
        var dv = (<types.ObjectType>r).discriminatorValue;
        if (dv) {
            return dv;
        }
        if (t.id) {
            return t.id;
        }
    }

    discriminator(t: types.Type) {
        var r = this.resolvedType(t);
        var dv = (<types.ObjectType>r).discriminator;
        return dv;
    }

    caption(t: types.Type): string {
        var r = this.resolvedType(t);
        if (r.displayName) {
            return r.displayName;
        }
        if (r.id) {
            return nicerName(r.id);
        }
        return "";
    }


    label(v: any, t: types.Type): string {
        var m: metakeys.Label = <any>this.resolvedType(t);
        if (m.label) {
            if (typeof m.label == "function") {
                return m.label(v);
            }
            else {
                if (m.label.indexOf("{") != -1) {
                    return interpolate(m.label, v);
                }
                else {
                    return v[m.label];
                }
            }
        }

        if (v && typeof v == "object") {
            if (v.$key) {
                return v.$key
            }
            if (v.name) {
                return this.getValue(t, v, "name");
            }
            else if (v.title) {
                return this.getValue(t, v, "title");
            }
            else if (v.label) {
                return this.getValue(t, v, "label");
            }

            return t.displayName;
        }
        if (typeof v == "array") {
            var ll: any[] = v;
            var it = (<types.ArrayType>t).itemType;
            return ll.map(x => this.label(x, <types.Type>it)).join(",");
        }
        if (v) {
            return "" + v;
        }
        if (isNullOrUndefined(v)) {
            return "";
        }
    }

    getValue(t: types.Type, target: any, name: string, bnd?: types.IGraphPoint) {
        if (!target) {
            return null;
        }
        var prop = this.property(t, name);
        if (prop) {
            var func: types.FunctionalValue = prop.type;
            if (func.computeFunction) {
                if (!bnd) {
                    bnd = types.binding(target, t);
                }
                return types.calcExpression(func.computeFunction, bnd);
            }

        }


        var val = target[name];
        if (val) {
            if (typeof val == "function") {
                return (<Function>val).apply(target);
            }
        }
        return val;
    }

    isReadonly(t: types.Type): boolean {
        if (t.readonly) {
            return true;
        }
        if ((<types.FunctionalValue>t).computeFunction) {
            return true;
        }
    }

    setValue(t: types.Type, target: any, name: string, v: any, bnd: types.IGraphPoint) {
        var val = target[name];
        var prop = this.property(t, name);
        if (prop) {
            if (prop.readonly) {
                return;
            }
        }
        var setter = target['get' + name.charAt(0).toUpperCase() + name.substring(1)];
        if (setter && typeof setter == "function") {
            setter.apply(target, v);
        }


        target[name] = v;
        return val;
    }

    children(v: any, t: types.Type): any[] {
        var m: metakeys.TreeProp = <any>this.resolvedType(t);
        if (m.children) {
            var ch = m.children;
            if (typeof ch == "string") {
                if (v[ch]) {
                    return v[ch];
                }
                return [];
            }
            else {
                var res = [];
                ch.forEach(x => {
                    if (v[x]) {
                        res = res.concat(v[x]);
                    }

                })
                return res;
            }
        }
        else {
            var res = [];
            this.visibleProperties(t).forEach(x => {
                if (this.isArray(x.type)) {
                    var at = <types.ArrayType>x.type;
                    if (this.isObject(<types.Type>at.itemType)) {
                        var q = x.id;
                        if (v[q]) {
                            res = res.concat(v[q]);
                        }
                    }
                }
                if (this.isMap(x.type)) {
                    var mt = <types.MapType>x.type;
                    if (this.isObject(<types.Type>mt.componentType)) {
                        var q = x.id;
                        if (v[q]) {
                            res = res.concat(v[q]);
                        }
                    }
                }
            })
            return res;
        }
    }

    visibleProperties(t: types.ObjectType&metakeys.VisibleProperties): types.Property[] {
        if (t.visibleProperties) {
            return this.allProperties(t).filter(x => {
                t.visibleProperties.indexOf(x.id) != -1
            });
        }
        var result: types.Property[] = [];
        var pn: {[name: string]: types.Property} = {}
        this.superTypes(t).forEach(x => {
            var nn = this.visibleProperties(x);
            nn.forEach(v => {
                pn[v.id] = v;
            })
        })
        this.properties(t, pn);
        Object.keys(pn).forEach(x => {
            if (t.hiddenProperties) {
                if (t.hiddenProperties.indexOf(x) != -1) {
                    return;
                }
            }
            result.push(pn[x]);
        })

        return result;
    }

    allProperties(t: types.Type): types.Property[] {
        var rt = t;
        var pn: {[name: string]: types.Property} = {}
        this.superTypes(t).forEach(x => {
            var nn = this.allProperties(x);
            nn.forEach(v => {
                pn[v.id] = v;
            })
        })
        var result = this.properties(t, pn);
        return result;
    }

    propertyGroups(t: types.Type): IPropertyGroup[] {
        var mm: {[name: string]: types.Property[]} = {}
        var res: IPropertyGroup[] = [];
        this.visibleProperties(t).forEach(p => {
            if (p.groupId == null) {
                p.groupId = GENERIC_GROUP
            }
            var q = mm[p.groupId];
            if (!q) {
                q = [];
                mm[p.groupId] = q;
            }
            q.push(p);
        })
        if (mm[GENERIC_GROUP]) {
            res.push({
                id: GENERIC_GROUP,
                caption: nicerName(GENERIC_GROUP),
                properties: mm[GENERIC_GROUP]
            })
            delete mm[GENERIC_GROUP];
        }
        Object.keys(mm).filter(k => {

            res.push({
                id: k,
                caption: nicerName(k),
                properties: mm[k]
            })
        })
        res.forEach(x => order(t, x))
        return res;
    }


    keyProp(t: types.Type): string {
        if ((<metakeys.KeyProp>t).keyProp) {
            return (<metakeys.KeyProp>t).keyProp;
        }
        var mmm="$key";
        this.allProperties(t).forEach(x=>{
            if ((<metakeys.Key>this.resolvedType(x)).key){
                mmm=x.id;
            }
        });
        return mmm;
    }

    public properties(t: types.Type, pn: {[p: string]: types.Property} = {}) {
        this.propertyMap(t, pn);
        var result: types.Property[] = [];
        Object.keys(pn).forEach(x => {
            result.push(pn[x])
        })
        setupGroups(result, t)
        return result;
    }

    property(t: types.Type, name: string) {
        var rs = {};
        var r = this.propertyMap(this.resolvedType(t), rs);
        return rs[name];
    }

    private propertyMap(t: types.Type, pn: {[p: string]: types.Property}) {
        var ot = <types.ObjectType>t;
        if (ot.properties) {
            Object.keys(ot.properties).forEach(p => {
                var ty = ot.properties[p];
                var rt: types.Type = null;
                if (typeof ty == "string") {
                    rt = this.resolveTypeByName(ty);
                }
                else {
                    rt = <types.Type>ty;
                }
                var nn = nicerName(p);
                if (!rt.id) {
                    if (rt.displayName) {
                        nn = rt.displayName;
                    }
                }
                var gid = null
                pn[p] = {
                    id: p,
                    type: rt,
                    declaredAt: ot,
                    displayName: nn,
                    groupId: gid,
                    required: ((<any>rt).required && typeof rt.required == "boolean") ? true : false
                }
            })
        }
        if (ot.required && Array.isArray(ot.required)) {
            Object.keys(pn).forEach(x => {
                pn[x].required = ot.required.indexOf(x) != -1;
            })
        }
    }

    public actions(t: types.Type, pn: {[p: string]: types.Action} = {}) {
        this.actionMap(t, pn);
        var result: types.Action[] = [];
        Object.keys(pn).forEach(x => {

            result.push(pn[x])

        })
        return result;
    }

    private actionMap(t: types.Type, pn: {[p: string]: types.Action}) {
        var ot = <types.ObjectType>t;
        if (ot.actions) {
            Object.keys(ot.actions).forEach(p => {
                var ty = ot.actions[p];
                pn[p] = ty;
            })
        }
    }

    workingCopy(v: any, t: types.Type) {
        if (this.isScalar(t)) {
            return v;
        }
        return utils.deepCopy(v);
    }

    resolvedType(t: types.Type&{$resolved?: boolean}| string): types.Type {
        if (typeof  t == "string") {
            var sm: string = <any>t;
            t = this.resolveTypeByName(sm);
        }

        if (t == types.TYPE_ANY) {
            return t;
        }
        if (t.$resolved) {
            return t;
        }
        if (this.typeMap.has(t)) {
            return this.typeMap.get(t);
        }
        var mm: types.Type&any = {};

        //normalize types
        if (t.type) {
            if (!Array.isArray(t.type)) {
                mm.type = [t.type];
            }
            else {
                mm.type = t.type;
            }
        }
        else {
            mm.type = [types.TYPE_ANY];
        }
        var newTypes: types.Type[] = [];
        mm.type.forEach(t => {
            var rt = types.TYPE_ANY;
            if (typeof t == "string") {
                rt = this.resolvedType(this.resolveTypeByName(<string>t));
            }
            else {
                rt = this.resolvedType(t);
            }
            apply(mm, rt);
            newTypes.push(rt);
        })

        apply(mm, t);
        mm.type = newTypes;
        mm.$resolved = true;
        mm.$original = t;
        if (!t.displayName && t.id) {
            t.displayName = nicerName(t.id)

        }

        if (mm.itemType) {
            mm.itemType = this.resolvedType(mm.itemType);
            if (!mm.itemType.displayName && mm.displayName) {
                var rr = {
                    id: "",
                    type: mm.itemType,
                    displayName: pluralize.singular(mm.displayName)
                }
                mm.itemType = this.resolvedType(rr);
            }
        }
        if (mm.componentType && !mm.componentType.$resolved) {
            mm.componentType = this.resolvedType(mm.componentType);
            if (!mm.componentType.displayName && mm.displayName) {
                var rr = {
                    id: "",
                    type: mm.componentType,
                    displayName: pluralize.singular(mm.displayName)
                }
                mm.componentType = this.resolvedType(rr);
            }
        }
        this.typeMap.set(t, mm);

        if ((<any>mm).options) {
            var ut: types.UnionType = <any>mm;
            var rs = (<any>mm).options.map(x => {
                if (typeof x == "string") {
                    return this.resolveTypeByName(x);
                }
                return x;
            })
            ut.options = rs;
            mm = optimizeUt(ut)
            this.typeMap.set(t, mm);
        }

        //now we should collapse super types;
        return <types.Type>mm;
    }

    typeOf(v: any) {
        if (this.instanceMap.has(v)) {
            return this.instanceMap.get(v);
        }
    }


    normalizeObjectUnionType(u: types.UnionType, tp: types.ObjectType[]): types.ObjectType {
        var rs = types.copy(u);
        rs.type = "object";
        var pmap: {[name: string]: {[name: string]: types.Property}} = {};
        var dmap: {[name: string]: {[name: string]: string[]}} = {};

        //now lets try to gather discriminator
        var discriminators: {[name: string]: string[]} = {}
        var discriminatorDescriptions: {[name: string]: string[]} = {}
        tp.forEach(v => {
            var rt = this.resolvedType(v);
            var allProps = this.allProperties(rt);
            var desc = this.discriminator(rt);
            var value = this.discriminatorValue(rt);
            allProps.forEach(c => {
                var rmap = pmap[c.id];
                var dm = dmap[c.id];
                if (!rmap) {
                    rmap = {};
                    pmap[c.id] = rmap;
                }
                if (!dm) {
                    dm = {};
                    dmap[c.id] = dm;
                }
                var vls = dm[desc];
                if (!vls) {
                    vls = [];
                    dm[desc] = vls;
                }
                vls.push(value);
                rmap[utils.hash(c.type)] = c;
            })
            var dlist = discriminators[desc];
            var ddescs = discriminatorDescriptions[desc];
            if (!dlist) {
                dlist = [];
                ddescs = [];
                discriminators[desc] = dlist
                discriminatorDescriptions[desc] = ddescs;
            }
            dlist.push(value);
            ddescs.push(this.caption(rt));
        })
        var ps: {[name: string]: types.TypeReference} = {};
        Object.keys(pmap).forEach(k => {
            var cand = pmap[k];
            if (Object.keys(cand).length == 1) {
                ps[k] = cand[Object.keys(cand)[0]];
            }
            else {
                ps[k] = {
                    id: k,
                    type: "union"

                };
                (<any>ps[k]).options = Object.keys(cand).map(v => cand[v]);
            }
            if (discriminators[k]) {
                (<any>ps[k]).enum = discriminators[k];
                (<any>ps[k]).enumDescriptions = discriminatorDescriptions[k];
                (<any>ps[k]).required = true;
            }
            else {
                var ll = dmap[k];
                var need = true;
                if (Object.keys(ll).length == 1) {
                    if (ll[Object.keys(ll)[0]].length == tp.length) {
                        need = false;
                    }
                }
                if (need) {//only need to put discrimination info if field exists only in some options
                    (<metakeys.DiscriminatorValueInfo><any>ps[k]).discriminationInfo = dmap[k];
                }
            }
        });
        (<types.ObjectType><any>rs).properties = ps;
        delete (<types.UnionType><any>rs).options
        delete (<any>rs).createControl
        return rs;
    };

    newInstance(t: types.Type): any {
        if (this.isObject(t)) {
            var val = {};
            this.allProperties(t).forEach(x => {
                var rr=this.resolvedType(x.type);
                if (rr.default) {
                    this.setValue(t, val, x.id, rr.default, null);
                }
                if (x.required) {
                    if (this.isArray(x.type)) {
                        this.setValue(t, val, x.id, [], null);
                    }
                    if (this.isMap(x.type)) {
                        this.setValue(t, val, x.id, {}, null);
                    }
                    if (this.isBoolean(x.type)) {
                        this.setValue(t, val, x.id, false, null);
                    }
                }
            })
            return val;
        }
        if (this.isArray(t)) {
            var ar = [];

            return ar;
        }
    }
}

export const INSTANCE = new TypeService();

function optimizeUt(ut: types.UnionType): types.Type {
    var nt: {[norm: string]: types.Type} = {};
    ut.options.forEach(x => {
            if (typeof x == "string") {
                x = INSTANCE.resolveTypeByName(x);
            }
            nt[JSON.stringify(x)] = x
        }
    )
    var hasChanges = true;
    while (hasChanges) {
        hasChanges = false;
        Object.keys(nt).forEach(x => {
            Object.keys(nt).forEach(y => {
                var t1 = nt[x];
                var t2 = nt[y];
                if (t1 == t2) {
                    return;
                }
                if (INSTANCE.isArray(t1)) {
                    if (INSTANCE.componentType(t1) == t2 || INSTANCE.componentType(t1).id == t2.id) {
                        delete nt[y];
                        hasChanges = true;
                    }
                }
                if (INSTANCE.isScalar(t1) && INSTANCE.isScalar(t2)) {
                    if (INSTANCE.isSubtypeOf(t2, t1)) {
                        delete nt[y];
                        hasChanges = true;
                    }
                    else {

                    }
                }
            })
        })
    }
    var objectTypes: types.ObjectType[] = [];
    var scalarTypes: types.ObjectType[] = [];
    var arrayTypes: types.ObjectType[] = [];
    var otherTypes: types.ObjectType[] = [];
    Object.keys(nt).forEach(x => {
        var tp = nt[x];
        if (INSTANCE.isScalar(tp)) {
            scalarTypes.push(tp);
        }
        else if (INSTANCE.isObject(tp)) {
            objectTypes.push(tp);
        }
        else if (INSTANCE.isArray(tp)) {
            arrayTypes.push(tp);
        }
        else {
            otherTypes.push(tp);
        }
    });
    var options: types.Type[] = [];
    if (objectTypes.length > 0) {
        if (objectTypes.length == 1) {
            options.push(objectTypes[0]);
        }
        else {
            options.push(INSTANCE.normalizeObjectUnionType(ut, objectTypes));
        }
    }
    if (arrayTypes.length > 0) {
        if (arrayTypes.length == 1) {
            options.push(arrayTypes[0]);
        }
        else {
            var t: types.ArrayType = <any>types.copy(ut);
            t.type = "array";
            let it: types.UnionType = <any>types.copy(ut);
            it.id = ""
            it.displayName = ""
            it.options = arrayTypes.map(o => {
                var rs = types.copy((<types.ArrayType>o).itemType);
                return rs;
            });
            t.itemType = it;
            delete (<any>t).options;
            delete (<any>t).createControl;
            options.push(t);
        }
    }
    options = options.concat(scalarTypes);
    options = options.concat(otherTypes);
    if (options.length == 1) {
        return INSTANCE.resolvedType(options[0]);
    }
    var result = types.copy(ut)
    ut.options = options;
    return result;
}