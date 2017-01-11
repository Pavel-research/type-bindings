/**
 * Created by Pavel on 02.01.2017.
 */
import types=require("./types")
import metakeys=require("./metaKeys")
import pluralize=require("pluralize")
import {deepCopy} from "./types";
import {isArray} from "util";
import set = Reflect.set;
function apply(t: types.Type, s: types.Type) {
    Object.keys(s).forEach(k => {
        if (k == "properties") {
            if (!t[k]) {
                t[k] = s[k];
            }
            else {
                var props = s[k];
                Object.keys(props).forEach(p => {
                    t[k][p] = props[p];
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
}
export function nicerName(n: string) {
    var result: string[] = [];
    var needUpperCase = true;
    var p = "";
    for (var i = 0; i < n.length; i++) {
        var c = n.charAt(i);
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

function interpolate(str: string, props: any) {
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
            if (x.required && INSTANCE.isScalar(x.type)) {
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
        }
        else if (INSTANCE.isArray(q.type)) {
            q.groupId = q.id;
        }
        else if (INSTANCE.isObject(q.type)) {
            q.groupId = q.id;
        }
        else if (INSTANCE.isMap(q.type)) {
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
    });
    return dependent;
};
function order(t:types.Type,p:IPropertyGroup){

    var copy:types.Property[]=[];
    var inserted:{ [name:string]:boolean}={}
    p.properties.forEach(x=>{
        var dependent = deps(p, x);
        x.dependents=dependent;
        x.dependents.forEach(y=>y.depends=x);
    })
    let properties = p.properties.filter(x=>!(<types.FunctionalValue>x.type).computeFunction);

    properties.forEach(x=>{
        if (x.required&&!x.type.enum){
            insert(x,copy,inserted)
        }
    })
    var po:metakeys.PropOrder=<any>t;
    if (po.propOrder){
        po.propOrder.forEach(x=>{
            p.properties.forEach(y=>{
                if (y.id==x){
                    insert(y,copy,inserted)
                }
            })
        })
    }
    properties.forEach(x=>{
        if (!types.service.isBoolean(x)&&!x.depends){
            insert(x,copy,inserted)
        }
    })
    properties.forEach(x=>{
        if (types.service.isBoolean(x)){
            insert(x,copy,inserted)
        }
    })
    properties.forEach(x=>{
        insert(x,copy,inserted)
    })
    p.properties.filter(x=>(<types.FunctionalValue>x.type).computeFunction).forEach(x=>{
        insert(x,copy,inserted)
    });
    p.properties=copy;
}

function insert(p:types.Property,copy:types.Property[],inserted:{ [name:string]:boolean}){
    if (inserted[p.id]){
        return;
    }
    inserted[p.id]=true;
    copy.push(p);
    p.dependents.forEach(d=>{
        if (!types.service.isBoolean(d)) {
            insert(d, copy, inserted)
        }
    });
    p.dependents.forEach(d=>{
        insert(d, copy, inserted)
    });
}

function dependencyString(t:types.Type){
    var ft:types.FullTypeOptions=<any>t;
    var ds="";
    ds=ds+addDeps(ft.hiddenWhen)
    ds=ds+addDeps(ft.visibleWhen)
    ds=ds+addDeps(ft.requiredWhen)
    ds=ds+addDeps(ft.disabledWhen);
    return ds;
}

function addDeps(v:any){
    if (typeof v=="string"){
        return v;
    }
    return "";
}

export class TypeService {

    private instanceMap: WeakMap<any,types.Type> = new WeakMap();

    private  typeMap: WeakMap<types.Type,types.Type> = new WeakMap();

    private  typeByName: Map<string,types.Type> = new Map();

    isScalar(t: types.Type) {
        return this.isSubtypeOf(t, types.TYPE_SCALAR);
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

    componentType(t:types.Type):types.Type{
        var cm:types.ArrayType=t;
        if (this.isArray(t)){
            return this.resolvedType(cm.itemType);
        }
    }
    isFiniteSetOfInstances(t:types.Type){
        return t.enum||(<metakeys.EnumValues>t).enumValues;
    }

    normalize(r:types.TypeReference){
        if (typeof  r=="string"){
            return this.resolveTypeByName(r);
        }
        else{
            return r;
        }
    }

    isMultiSelect(t: types.Type){
        if (this.isArray(t)){
            var cm:types.ArrayType=t;
            if (cm.uniqueItems){
                if (this.isFiniteSetOfInstances(this.componentType(t))){
                    if (!(<metakeys.Ordered>t).ordered){
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
        if (((<any>t).$original)==superT){
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
        if (t.id) {
            if (this.typeByName.has(t.id)) {
                if (this.typeByName.get(t.id) === t) {
                    return;
                }
                throw new Error("Type with this id already exists");
            }
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
        return <types.Type[]>this.resolvedType(t).type;
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

        if (v&&typeof v=="object") {
            if (v.$key){
                return v.$key
            }
            if (v.name) {
                return this.getValue(t,v,"name");
            }
            else if (v.title) {
                return this.getValue(t,v,"title");
            }
            else if (v.label) {
                return this.getValue(t,v,"label");
            }

            return t.displayName;
        }
        if (typeof v=="array"){
            var ll:any[]=v;
            var it=(<types.ArrayType>t).itemType;
            return ll.map(x=>this.label(x,<types.Type>it)).join(",");
        }
        if (v){
            return ""+v;
        }
    }
    getValue(t:types.Type,target:any,name:string,bnd?:types.IGraphPoint){
        var prop=this.property(t,name);
        if (prop){
            var func:types.FunctionalValue=prop.type;
            if (func.computeFunction){
                if (!bnd){
                    bnd=types.binding(target,t);
                }
                return types.calcExpression(func.computeFunction,bnd);
            }
        }
        var val=target[name];
        if (val){
            if (typeof val=="function"){
                return (<Function>val).apply(target);
            }
        }
        return val;
    }
    isReadonly(t:types.Type):boolean{
        if (t.readonly){
            return true;
        }
        if ((<types.FunctionalValue>t).computeFunction){
            return true;
        }
    }
    setValue(t:types.Type,target:any,name:string,v:any,bnd:types.IGraphPoint){
        var val=target[name];
        var prop=this.property(t,name);
        if (prop) {
            if (prop.readonly) {
                return;
            }
        }
        var setter=target['get'+name.charAt(0).toUpperCase()+name.substring(1)];
        if (setter&&typeof setter=="function"){
            setter.apply(target,v);
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
        Object.keys(mm).filter(k => {

            res.push({
                id: k,
                caption: nicerName(k),
                properties: mm[k]
            })
        })
        res.forEach(x=>order(t,x))
        return res;
    }

    private valMap: WeakMap<types.Type,types.InstanceValidator>=new WeakMap();

    validator(t: types.Type):types.InstanceValidator {
        var rs = this.resolvedType(t);
        var hasW: metakeys.HasValidator = <metakeys.HasValidator>rs;
        if (hasW.instanceValidator && hasW.overrideDefaultValidators) {
            return hasW.instanceValidator;
        }
        if (this.valMap.has(rs)){
            return this.valMap.get(rs);
        }
        var cm=new types.CompositeValidator();
        this.valMap.set(rs,cm);
        if (hasW.errorMessage){
            cm._errorMessage=hasW.errorMessage;
        }

        if (hasW.instanceValidator){
            cm._validators.push(hasW.instanceValidator);
        }
        if (rs.required&&typeof rs.required=="boolean"){
            cm._validators.push(new types.RequiredValidator());
        }
        if ((<metakeys.RequiredWhen>rs).requiredWhen){
            cm._validators.push(new types.RequiredWhenValidator((<metakeys.RequiredWhen>rs)));
        }
        if (this.isString(rs)){
            var st:types.StringType=rs;
            if (st.pattern){
                cm._validators.push({
                    validateBinding(v:types.IGraphPoint):types.Status{
                        var vl=""+v.get();
                        if (!vl.match(st.pattern)){
                            return types.error(v.type().displayName+" should match to "+st.pattern);
                        }
                        return types.ok();
                    }
                })
            }
            if (st.minLength){
                cm._validators.push({
                    validateBinding(v:types.IGraphPoint):types.Status{
                        var vv=v.get();
                        if (v.get()) {
                            var vl = "" + vv;
                            if (vl.length < st.minLength) {
                                return types.error(v.type().displayName + " should have at least " + st.minLength + " characters");
                            }
                        }
                        return types.ok();
                    }
                })
            }
            if (st.maxLength){
                cm._validators.push({
                    validateBinding(v:types.IGraphPoint):types.Status{
                        if (v.get()) {
                            var vl = "" + v.get();
                            if (vl.length > st.maxLength) {
                                return types.error(v.type().displayName + " should have not more then " + st.maxLength + " characters");
                            }
                        }
                        return types.ok();
                    }
                })
            }

        }
        if (this.isNumber(rs)){
            var nt:types.NumberType=rs;

            if (nt.minimum){
                cm._validators.push({
                    validateBinding(v:types.IGraphPoint):types.Status{
                        var vv=v.get();
                        if (v.get()) {
                            var vl = vv;
                            if (vl < nt.minimum) {
                                return types.error(v.type().displayName + " should be at least " + nt.minimum);
                            }
                        }
                        return types.ok();
                    }
                })
            }
            if (nt.maximum){
                cm._validators.push({
                    validateBinding(v:types.IGraphPoint):types.Status{
                        var vv=v.get();
                        if (v.get()) {
                            var vl = vv;
                            if (vl > nt.maximum) {
                                return types.error(v.type().displayName + " should be not more then " + nt.maximum);
                            }
                        }
                        return types.ok();
                    }
                })
            }

        }
        if (this.isObject(rs)){
            var ps=this.allProperties(rs);
            ps.forEach(p=>{
                    var v=this.validator(p)
                    cm._validators.push({

                        validateBinding(g:types.IGraphPoint){
                            return v.validateBinding(g.binding(p.id));
                        }
                    });
                });

        }
        else if (this.isArray(rs)){

        }
        else if (this.isMap(rs)){

        }
        return cm;
    }
    keyProp(t:types.Type):string{
        if ((<metakeys.KeyProp>t).keyProp){
            return (<metakeys.KeyProp>t).keyProp;
        }
        return "$key";
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
        var r = this.propertyMap(t, rs);
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
                var nn=nicerName(p);
                if (!rt.id){
                    if (rt.displayName){
                        nn=rt.displayName;
                    }
                }
                var gid = null
                pn[p] = {
                    id: p,
                    type: rt,
                    declaredAt: ot,
                    displayName: nn,
                    groupId: gid,
                    required: ((<any>rt).required &&typeof rt.required=="boolean")? true : false
                }
            })
        }
        if (ot.required&&Array.isArray(ot.required)) {
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

    workingCopy(v: any,t:types.Type){
        if (this.isScalar(t)){
            return v;
        }
        return deepCopy(v);
    }

    resolvedType(t: types.Type&{$resolved?: boolean}| string): types.Type {
        if (typeof  t=="string"){
            var sm:string=<any>t;
            t=this.resolveTypeByName(sm);
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
        var newTypes:types.Type[]=[];
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
        mm.type=newTypes;
        mm.$resolved = true;
        mm.$original=t;
        if (!t.displayName && t.id) {
            t.displayName = nicerName(t.id)
        }

        if (mm.itemType){
            mm.itemType=this.resolvedType(mm.itemType);
            if (!mm.itemType.displayName&&mm.displayName){
                var rr={
                    id:"",
                    type:mm.itemType,
                    displayName:pluralize.singular(mm.displayName)
                }
                mm.itemType=this.resolvedType(rr);
            }
        }
        if (mm.componentType){
            mm.componentType=this.resolvedType(mm.componentType);
            if (!mm.componentType.displayName&&mm.displayName){
                var rr={
                    id:"",
                    type:mm.componentType,
                    displayName:pluralize.singular(mm.displayName)
                }
                mm.componentType=this.resolvedType(rr);
            }
        }
        this.typeMap.set(t, mm);


        //now we should collapse super types;
        return <types.Type>mm;
    }

    typeOf(v: any) {
        if (this.instanceMap.has(v)) {
            return this.instanceMap.get(v);
        }
    }

    newInstance(t: types.Type): any {
        if (this.isObject(t)){
            var val={};
            this.allProperties(t).forEach(x=>{
                if (x.type.default){
                    this.setValue(t,val,x.id,x.type.default,null);
                }
            })
            return val;
        }
        if (this.isArray(t)){
            var ar=[];

            return ar;
        }
    }
}

export const INSTANCE = new TypeService();
