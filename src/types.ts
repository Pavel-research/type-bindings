export type TypeReference=Type|string
export import metakeys=require("./metaKeys")
export import manager=require("./manager")
export import ts=require("./typesService")
import pluralize=require("pluralize")
export import service=ts.INSTANCE;

export interface Type {
    type?: (Type|string)[] | (Type|string)
    id: string
    displayName?: string
    description?: string
    required?
    default?: any
    enum?: any[]
    readonly?:boolean
}

export interface FunctionalValue{
    computeFunction?:string| ((p:IGraphPoint)=>any)
}

export interface NumberType extends Type {
    minimum?: number
    maximum?: number
    step?:number
}
export interface StringType extends Type {
    pattern?: string
    minLength?: number
    maxLength?: number
    multiline?: boolean
}
export interface Property {
    required?: boolean
    id: string
    type: Type
    declaredAt: Type
    displayName: string;
    groupId: string
    dependents?: Property[];
    depends?: Property;

}
export interface Action{
    id: string
    displayName?: string
    description?: string
    icon?: string
    parameters?:Type[]
    code:string
}

export interface ObjectType extends Type {
    properties?: {[name: string]: TypeReference}
    actions?: {[name: string]: Action}
    required?: string[]
    discriminator?: string
    discriminatorValue?: any
}

export function hash(t:Type):string{
    var m=deepCopy(t);
    delete (<any>t).declaredAt;
    delete (<any>t).$original;
    return JSON.stringify(m);
}

export interface MapType extends Type {
    keyType?: TypeReference
    componentType?: TypeReference
}

export interface UnionType extends Type {
    options: TypeReference[]
}

export interface ArrayType extends Type {
    itemType?: TypeReference
    uniqueItems?: boolean
}
export const TYPE_ANY: MapType = {id: "any"}
export const TYPE_UNION: MapType = {id: "union"}
export const TYPE_SCALAR: Type = {id: "scalar", type: TYPE_ANY}
export const TYPE_STRING: StringType = {id: "string", type: TYPE_SCALAR}
export const TYPE_NUMBER: Type = {id: "number", type: TYPE_SCALAR}
export const TYPE_INTEGER: Type = {id: "integer", type: TYPE_NUMBER}
export const TYPE_BOOLEAN: Type = {id: "boolean", type: TYPE_SCALAR}
export const TYPE_NULL: Type = {id: "null", type: TYPE_SCALAR}
export const TYPE_OBJECT: ObjectType = {id: "object"}
export const TYPE_ARRAY: ArrayType = {id: "array"}
export const TYPE_MAP: MapType = {id: "map"}

service.register(TYPE_UNION);
service.register(TYPE_ANY);
service.register(TYPE_SCALAR);
service.register(TYPE_STRING);
service.register(TYPE_NUMBER);
service.register(TYPE_INTEGER);
service.register(TYPE_BOOLEAN);
service.register(TYPE_NULL);
service.register(TYPE_OBJECT);
service.register(TYPE_ARRAY);
service.register(TYPE_MAP);
export function declareMeta(t: Type, v: any) {
    Object.keys(v).forEach(k => t[k] = v[k])
}

export function copy(t:TypeReference){
    var ttt=service.resolvedType(t);
    var result={ id:null, type: null};

    Object.keys(ttt).forEach(x=>result[x]=ttt[x]);
    delete (<any>result).$resolved;
    return result;
}

export function array(t: Type): ArrayType {
    return {
        id: t.id + "[]",
        type: TYPE_ARRAY,
        itemType: t
    }
}
export function map(t: Type): MapType {
    return {
        id: t.id + "*",
        type: TYPE_MAP,
        componentType: t,
        keyType: TYPE_STRING
    }
}

export interface ChangeEvent {
    kind: string
    source: IBinding
    target: any
    oldValue: any
    newValue: any
}

export interface IValueListener {
    valueChanged(e: ChangeEvent);
}

export enum Severity{
    OK, WARNING, ERROR
}
export interface Status {
    message: string
    path: string
    severity: Severity
    valid: boolean

    inner?:Status[]
    point?: IGraphPoint
}

export interface IGraphPoint {
    get(): any
    id(): string
    path(): string
    type(): Type
    parent(): IGraphPoint
    root(): IGraphPoint
    binding(p: string): IGraphPoint
}

export interface IBinding extends IGraphPoint,IContext {
    get(): any
    set(v: any)
    path(): string
    id(): string
    type(): Type
    binding(p: string): IBinding
    parent(): IBinding
    root(): IBinding
    collectionBinding(): CollectionBinding
    addListener(v: IValueListener)
    removeListener(v: IValueListener)
    add(v: any): any
    remove(v: any): any
    replace(old: any, newV: any): any
    status(): IBinding

}

export interface CollectionBinding {
    add(v: any);
    remove(v: any);
    replace(oldValue: any, newValue: any);
    componentType(): Type;
    workingCopy(): any[]
    contains(v:any):boolean
    containsWithProp(prop:string,value:any,exceptions:any[]):boolean
}


export abstract class AbstractBinding implements IBinding {
    listeners: IValueListener[] = []
    _parent: Binding;
    lookupVar(v: string){
        return null;
    }
    _type: any
    protected _bnds: {[name: string]: Binding} = {}
    private _status: IBinding

    status() {
        if (this._status) {
            return this._status;
        }
    }

    private _cb:CollectionBinding;

    collectionBinding() {
        if (this._cb){
            return this._cb;
        }
        this._cb= this.createCollectionBinding();
        return this._cb;
    }

    path(): string {
        if (this.parent()) {
            var ps=this.parent().path();
            if (ps) {
                return ps + "." + this.id();
            }
            return this.id();
        }
        return "";
    }

    public fireEvent(c: ChangeEvent) {
        this.listeners.forEach(x => x.valueChanged(c));
        if (this._parent) {
            this._parent.fireEvent(c);
        }
    }

    type() {
        if (this._type) {
            return (<Type|any>service.resolvedType(this._type));
        }
        return TYPE_ANY;
    }

    protected abstract createCollectionBinding(): CollectionBinding;

    add(v: any) {
        this.collectionBinding().add(v);
    }

    remove(v: any) {
        this.collectionBinding().remove(v);
    }

    replace(oldValue: any, newValue: any) {
        this.collectionBinding().replace(oldValue, newValue);
    }

    abstract get(): any

    abstract set(v: any)

    abstract id(): string

    binding(p: string): IBinding {
        return null;
    }

    parent() {
        return this._parent;
    }

    root() {
        if (this.parent()) {
            return this.parent().root();
        }
        return <IBinding><any>this;
    }

    addListener(v: IValueListener) {
        this.listeners.push(v);
    }

    removeListener(v: IValueListener) {
        this.listeners = this.listeners.filter(x => x != v);
    }

    innerBnds() {
        return this._bnds;
    }
}

class KeyBinding extends AbstractBinding implements IBinding {

    createCollectionBinding(): CollectionBinding {
        throw new Error("Key binding can not be viewed as collection")
    }


    get(): any {
        var res = null;
        Object.keys(this._parent._parent.value).forEach(k => {
            if (this._parent._parent.value[k] === this._parent.value) {
                res = k;
            }
        })
        return res;
    }

    set(v: any) {
        var res = null;
        Object.keys(this._parent._parent.value).forEach(k => {
            if (this._parent._parent.value[k] === this._parent.value) {
                res = k;
            }
        })
        var ev: ChangeEvent = {
            kind: "change",
            source: this,
            oldValue: res,
            newValue: v,
            target: this._parent ? this._parent.get() : null
        };
        if (res) {
            delete this._parent._parent.value[res];
            this._parent._parent.value[v] = this._parent.value;
        }
        delete this._parent._parent.innerBnds()[res]
        this._parent.id = v;
        this._parent._parent.innerBnds()[v] = this._parent;
        this.fireEvent(ev);
        return res;
    }

    id() {
        return "$key";
    }

    constructor(p: Binding) {
        super();
        this._parent = p;
        this._type = TYPE_STRING;
    }


    binding(p: string): IBinding {
        return null;
    }
}

export abstract class AbstractCollectionBinding {

    constructor(protected pb: Binding) {

    }
    abstract componentType():Type
    abstract workingCopy():any[]
    containsWithProp(prop:string,value:any,exceptions:any[]):boolean{
        return this.workingCopy().filter(x=>service.getValue(this.componentType(),x,prop)==value).filter(x=>exceptions.indexOf(x)==-1).length>0;
    }

    protected onChanged() {
        this.pb.changed();
    }
}


class ArrayCollectionBinding extends AbstractCollectionBinding implements CollectionBinding {

    value: any[];
    _componentType: any

    workingCopy() {
        if (!this.value) {
            this.value = [];
        }
        else if (!Array.isArray(this.value)) {
            this.value = [];
        }
        return this.value;
    }

    componentType() {
        return this._componentType;
    }
    contains(v:any){
        if (this.value.indexOf(v)!=-1){
            return true;
        }
        return false;
    }


    constructor(p: Binding) {
        super(p);
        this.value = p.get();
        if (!this.value){
            this.value=[];
            if (!p.parent()||p.parent().get()) {
                p.set(this.value);
            }
        }
        else if (!Array.isArray(this.value)) {
            this.value = [this.value];
            p.set(this.value);
        }
        if (p.type().uniqueItems){
            this._componentType = {
                uniqueValue:true,
                owningCollection: this,
                type:p.type().itemType
            };
        }
        else this._componentType = {
            owningCollection: this,
            type:p.type().itemType
        };
        if (!this._componentType.type.displayName&&p.type().displayName){
            this._componentType.displayName=ts.nicerName(pluralize.singular(p.type().displayName))
        }
    }


    add(v: any) {
        this.value.push(v);
        this.pb.changed();
    }

    remove(v: any) {
        var i = this.value.indexOf(v);
        if (i != -1) {
            this.value.splice(i, 1);
        }
        this.pb.changed();
    }

    replace(oldValue: any, newValue: any) {
        var i = this.value.indexOf(oldValue);
        if (i != -1) {
            this.value[i] = newValue;
        }
        this.pb.changed();
    }
}
declare var $: any

export function deepCopy(obj: any) {
    if (typeof obj=="object") {
        var newObj = $.extend(true, {}, obj);
        return newObj;
    }
    return obj;
}

//const shadowMap=new WeakMap<any,any>();
export class MapCollectionBinding extends AbstractCollectionBinding implements CollectionBinding {

    value: any;
    _componentType: Type

    wcopy:any[]

    // containsWithProp(prop:string,value:any,exceptions:any[]):boolean{
    //     return this.workingCopy().filter(x=>service.getValue(this.componentType(),x,prop)==value).filter(x=>{
    //         return exceptions.map(x=>x.$key).indexOf(x.$key)==-1;
    //     }).length>0;
    // }

    workingCopy() {
        if (this.wcopy){
            return this.wcopy;
        }
        var res = [];
        if (this.value) {
            Object.keys(this.value).forEach(k => {
                var rs = deepCopy(this.value[k]);
                if (typeof rs == "object") {
                    rs.$key = k;
                    res.push(rs);
                }
                else {
                    rs={$key: k, $value: this.value[k]};
                    res.push(rs)
                }
                var view=this;
                manager.INSTANCE.addListener(rs,{
                    valueChanged(){
                        view.replace({ $key:k},rs);
                    }
                })
            })
        }
        this.wcopy=res;
        return res;
    }
    contains(v:any){
        var key=v.$key;
        if (this.value){
            if (Object.keys(this.value).indexOf(key)!=-1){
                return true;
            }
            return false;
        }
    }

    componentType() {
        return this._componentType;
    }

    constructor(p: Binding) {
        super(p);
        this.value = p.get();
        if (!this.value) {
            this.value = {};
            if (!p.parent()||p.parent().get()) {
                p.set(this.value);
            }
        }
        this._componentType = p.type().componentType;
        var nn="Name";
        var nd="";
        var kn=(<metakeys.KeyName>p.type()).keyName;
        if (kn){
            nn=kn;
        }
        var kd=(<metakeys.KeyName>p.type()).keyDescription;
        if (kd){
            nd=kd;
        }
        var kt=TYPE_STRING;
        if (p.type().keyType){
            kt=p.type().keyType;
        }
        var ts = {
            id: "",
            type: TYPE_OBJECT,

            properties: {
                $key: {
                    type: kt,
                    required: true,
                    displayName: nn,
                    description: kd,
                    unique: true,
                    owningCollection: this
                }
            },
            keyProp:"$key",
            displayName: pluralize.singular(p.type().displayName)
        }
        if (service.isObject(this._componentType)) {
            ts.type = this._componentType;
        }
        else {
            var vn=this._componentType.displayName;
            ts.properties["$value"] = {
                type: this._componentType,
                required: true,
                displayName:vn
            }
        }
        this._componentType = ts;
    }

    add(v: any) {
        this.workingCopy();
        this.wcopy.push(v);
        if (!v.$key) {
            throw new Error("Adding object with no key")
        }
        var val = deepCopy(v);
        if (v.$value) {
            val = v.$value;
        }
        this.value[v.$key] = val;
        delete val["$key"];
        this.pb.changed();
    }

    remove(v: any) {
        if (v==null){
            return;
        }
        this.workingCopy();
        this.wcopy=this.wcopy.filter(x=>x!==v);
        if (!v.$key) {
            throw new Error("Removing object with no key")
        }
        delete this.value[v.$key];
        this.pb.changed();
    }

    replace(oldValue: any, newValue: any) {
        this.workingCopy();
        this.wcopy=this.wcopy.filter(x=>x!=oldValue);
        delete this.value[oldValue.$key];
        if (!newValue.$key) {
            throw new Error("Adding object with no key")
        }
        if (!oldValue.$key) {
            throw new Error("removing object with no key")
        }
        delete this.value[oldValue.$key];
        if (this.value[newValue.$key]){
            newValue.$key=oldValue.$key;
        }
        this.add(newValue);
    }
}
export type FullTypeOptions=
    Type
        &metakeys.RequiredWhen
        &metakeys.DefaultColumns
        &metakeys.DisabledWhen
        &metakeys.GroupBy
        &metakeys.PropertyGroups
        &metakeys.VisibleProperties
        &metakeys.VisibleWhen
        &metakeys.HasValidator
        &metakeys.TypeAhead
        &metakeys.EnumValues
        &metakeys.Label
        &metakeys.TreeProp
        &metakeys.PropOrder
        &metakeys.EnumDescriptions
        &metakeys.KeyName;


export interface InstanceValidator {
    validateBinding(b: IGraphPoint): Status
}
export function ok(): Status {
    return {
        severity: Severity.OK,
        message: "",
        path: "",
        valid: true
    }
}
export function error(message: string, path: string = "",inner?:Status[]): Status {
    return {
        severity: Severity.ERROR,
        message: message,
        path: path,
        valid: false,
        inner: inner
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
export class RequiredValidator implements InstanceValidator {
    validateBinding(b: IGraphPoint): Status {
        if (!b.get()) {
            return error(b.type().displayName + " is required");
        }
        return ok();
    }
}
export class RequiredWhenValidator implements InstanceValidator {
    constructor(private v: metakeys.RequiredWhen) {

    }

    validateBinding(b: IGraphPoint): Status {
        if (!b.get()) {
            if (calcCondition(this.v.requiredWhen, b)) {
                if (this.v.requiredWhenMessage) {
                    return error(this.v.requiredWhenMessage);
                }
                return error(b.type().displayName + " is required in this context");
            }
        }
        return ok();
    }
}
 function getOwningCollection(b: IGraphPoint):CollectionBinding {
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
export class UniquinesValidator implements InstanceValidator {

    constructor(private type:Type&metakeys.OwningCollection){

    }

    validateBinding(b: IGraphPoint): Status {
        var oc = getOwningCollection(b);
        if (oc) {
            var uex=[];
            if (b.parent() && (<any>b.parent().type()).uniquinessException) {
                var ue=(<any>b.parent().type()).uniquinessException;
                if (ue instanceof AbstractBinding){
                    ue=ue.get();
                }
                uex.push(ue);
            }
            if ((<CollectionBinding>oc).containsWithProp(b.type().id, b.get(),uex)) {

                return error(b.type().displayName + " should be unique", b.id());
            }
        }
        return ok();
    }
}
export class UniquieValueValidator implements InstanceValidator {

    constructor(private type:Type&metakeys.OwningCollection){

    }

    validateBinding(b: IGraphPoint): Status {
        var hu:metakeys.OwningCollection=b.type();
        var oc = getOwningCollection(b);
        if (oc) {
            if (oc.contains(b.get())) {
                var ue=(<any>b.type()).uniquinessException;
                if (ue instanceof AbstractBinding){
                    ue=ue.get();
                }
                if (ue==b.get()){
                    return ok();
                }
                return error(b.type().displayName + " should be unique", b.id());
            }
        }
        return ok();
    }
}

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
                return error(ts.interpolate(this._errorMessage,b.type()),sts[0].path,sts);
            }
            return error(message,sts[0].path,sts);
        }
        if (warns.length > 0) {
            var message = warns.map(x => x.message).join(", ");
            return warn(message);
        }
    }
}
export interface IContext{
    lookupVar(name:string):any
}
export class Binding extends AbstractBinding implements IBinding {

    _parent: Binding;
    value: any;
    _id: string

    variables:{ [name:string]:any}={}

    context:IContext;

    readonly: boolean

    autoinit:boolean=true;

    addVar(name:string,value:any){
        this.variables[name]=value;
    }
    public fireEvent(c: ChangeEvent) {
        super.fireEvent(c);
        if (this.context&&this.context instanceof Binding){
            (<Binding>this.context).changed();
        }
    }
    get(p?: string) {
        if (p) {
            return this.binding(p).get();
        }
        if (this._parent&&this._id){
            return service.getValue(this._parent.type(),this._parent.value,this._id,this._parent);
        }
        return this.value;
    }

    createCollectionBinding(): CollectionBinding {
        if (this.type().componentType) {
            return new MapCollectionBinding(this);
        }
        if (this.type().itemType) {
            return new ArrayCollectionBinding(this);
        }
        throw new Error("Collection bindings may be only used with map or array types");
    }

    set(v: any) {
        if (this.readonly){
            return;
        }
        if (v) {
            if (service.isNumber(this.type())) {
                if (typeof v != "number") {
                    if (service.isInteger(this.type())) {
                        v = parseInt(v);
                    }
                    else{
                        v= parseFloat(v);
                    }
                }
            }
            if (service.isArray(this.type())){
                if (!Array.isArray(v)){
                    v=[v];
                }
            }
        }
        else{
            if (service.isNumber(this.type())) {
                if (v==""){
                    v=null;
                }
            }
        }
        if (v == this.value) {
            return;
        }

        var c = this.value;
        var ev: ChangeEvent = {
            kind: "change",
            source: this,
            oldValue: c,
            newValue: v,
            target: this._parent ? this._parent.get() : null
        };
        if (this._parent && this.id) {
            var s = this._parent.get();
            if (!s) {
                s = {};
                if (this._parent.autoinit){
                    this._parent.set(s);
                } //autoinit
            }
            service.setValue(this.type(),s,this._id,v,this);
        }
        this.value = v;
        this.refreshChildren();
        this.fireEvent(ev);
        manager.INSTANCE.fire(ev);

    }

    public changed() {
        var ev: ChangeEvent = {
            kind: "change",
            source: this,
            oldValue: this.value,
            newValue: this.value,
            target: this._parent ? this._parent.get() : null
        };
        this.refreshChildren();
        this.fireEvent(ev);

        manager.INSTANCE.fire(ev);
    }


    private refreshChildren() {
        Object.keys(this._bnds).forEach(k => {
            this._bnds[k].refresh();
        })
    }

    refresh() {
        if (this._parent && this.id) {
            var vl =this.get();
            if (vl!==this.value) {
                this.value=vl;
                this.listeners.forEach(x => x.valueChanged(vl));
            }
        }
        this.refreshChildren();
    }

    constructor(n: string) {
        super();
        this._id = n;
    }

    id() {
        return this._id;
    }


    localBinding(name: string): AbstractBinding {
        if (this._bnds[name]) {
            return this._bnds[name];
        }
        if (name == "$status") {
            var st = new StatusBinding(this);
            this._bnds["$status"] = st;
            return st;
        }
        else if (name == "$key") {
            if (this.parent() && this.parent().type().componentType) {
                var kb = new KeyBinding(this);
                return kb;
                //this is actually a parent key binding;
            }
        }
        var b = new Binding(name);
        if (name.charAt(0)=='@'){
            b.value=this.lookupVar(name.substring(1));
            return b;
        }
        b._parent = this;
        if (this.value) {
            b.value = service.getValue(this.type(),this.value,name);
        }
        b._id = name;
        var p = service.property(this.type(), name);
        if (p) {
            b._type = service.resolvedType(p);
        }
        else if ((<MapType>this.type()).componentType) {
            b._type = (<MapType>this.type()).componentType;
        }
        this._bnds[name] = b;
        return b;

    }
    lookupVar(v: string){
        if (this.variables[v]){
            return this.variables[v];
        }
        if (this._parent){
            return this._parent.lookupVar(v);
        }
        if (this.context){
            return this.context.lookupVar(v);
        }
        return null;
    }
    binding(p: string): IBinding {
        var id = p.indexOf('.');
        if (id != -1) {
            var name = p.substring(0, id);
            var l = this.localBinding(name);
            return l.binding(p.substring(id + 1));
        }
        return this.localBinding(p);
    }

    put(id: string, v: any) {
        this.binding(id).set(v);
    }
}
import compute=require("./computationalEngine")
export function calcExpression(c: metakeys.Condition, v: IGraphPoint): any {
    return compute.calcExpression(c,v);
}
export function calcCondition(c: metakeys.Condition, v: IGraphPoint): boolean {
    return compute.calcCondition(c,v);
}
export class ComputedBinding extends Binding implements IValueListener {

    protected ignore: boolean;

    valueChanged(v: ChangeEvent) {
        if (this.ignore) {
            return;
        }
        var q = this.get();
        if (JSON.stringify(this.value) === JSON.stringify(q)) {
            return;
        }
        this.value = q;
        this.ignore = true;
        try {
            this.changed();
        } finally {
            this.ignore = false;
        }
    }


    constructor(id: string, private f: ((v: IBinding) => any), private listenToRoot: boolean, parent: Binding) {
        super(id);
        this._parent = parent;
        if (listenToRoot) {
            parent.root().addListener(this)
        }
        else {
            parent.addListener(this);
        }
        this.value = this.get();
    }

    get(): any {

        return this.f(this.parent());
    }
}

export class StatusBinding extends ComputedBinding implements IValueListener {

    constructor(p: Binding) {
        super("$status", v => {
            var validator = service.validator(p.type());
            return validator.validateBinding(p);
        }, true, p)
    }
}

export function binding(v: any, t: Type): Binding {
    var rs = new Binding(t.id);
    rs.value = v;
    rs._type = t;
    return rs;
}