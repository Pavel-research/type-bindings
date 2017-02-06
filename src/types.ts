export type TypeReference=Type|string
export import metakeys=require("./metaKeys")
export import manager=require("./manager")
export import ts=require("./typesService")
import pluralize=require("pluralize")
import moments=require("moment")
export import service=ts.INSTANCE;
export import utils=require("./utils")
export interface Type {
    type?: (Type|string)[] | (Type|string)
    id: string
    displayName?: string
    description?: string
    required?
    default?: any
    enum?: any[]
    readonly?: boolean

    constructors?: (Operation|string)[]
    updaters?: (Operation|string)[]
    listers?: (Operation|string)[]
    destructors?: (Operation|string)[]
    actions?: {[name: string]: Action}
}

export interface FunctionalValue {
    computeFunction?: string| ((p: IGraphPoint) => any)
}

export interface NumberType extends Type {
    minimum?: number
    maximum?: number
    step?: number
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
    discriminator?: boolean;
    depends?: Property;
}

export interface Operation extends Type {
    id: string
    displayName?: string
    description?: string
    icon?: string
    parameters: Parameter[]
    result: Type
    executorId?: string
    annotations: any
    [name: string]: any
    securedBy?: string[]
}

export interface Action extends Operation {
}


export interface ObjectType extends Type {
    properties?: {[name: string]: TypeReference}

    required?: string[]
    discriminator?: string
    discriminatorValue?: any
}
export interface SecuritySchemeDefinition extends Type {
    kind: string
    settings: any
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
export const TYPE_OPERATION: Type = {id: "operation", type: TYPE_ANY}
export const TYPE_DATE: Type = <Type&metakeys.Label>{
    id: "date", type: TYPE_SCALAR, label(v){
        return moments(v).calendar(null, {
            sameDay: '[Today]',
            nextDay: '[Tomorrow]',
            nextWeek: 'dddd',
            lastDay: '[Yesterday]',
            lastWeek: '[Last] dddd',
            sameElse: 'DD/MM/YYYY'
        });
    }
}
export const TYPE_PASSWORD: Type = {id: "password", type: TYPE_STRING}
export const TYPE_DATETIME: Type = {id: "datetime", type: TYPE_DATE}
export const TYPE_BOOLEAN: Type = {id: "boolean", type: TYPE_SCALAR}
export const TYPE_NULL: Type = {id: "null", type: TYPE_SCALAR}
export const TYPE_OBJECT: ObjectType = {id: "object"}
export const TYPE_ARRAY: ArrayType = {id: "array"}
export const TYPE_MAP: MapType = {id: "map"}
export const TYPE_RELATION: Type = {id: "relation", type: TYPE_ARRAY}
export const TYPE_VIEW: Type = {id: "view", type: TYPE_ARRAY}
export const TYPE_TEXT: StringType = {id: "text", type: "string", multiline: true}
export const TYPE_MARKDOWN: Type&metakeys.needsOwnGroup = {id: "markdown", type: TYPE_TEXT, needsOwnGroup: true}
service.register(TYPE_UNION);
service.register(TYPE_ANY);
service.register(TYPE_VIEW);
service.register(TYPE_SCALAR);
service.register(TYPE_DATE);
service.register(TYPE_STRING);
service.register(TYPE_NUMBER);
service.register(TYPE_INTEGER);
service.register(TYPE_BOOLEAN);
service.register(TYPE_NULL);
service.register(TYPE_DATETIME);
service.register(TYPE_PASSWORD);
service.register(TYPE_OBJECT);
service.register(TYPE_ARRAY);
service.register(TYPE_RELATION);
service.register(TYPE_TEXT);
service.register(TYPE_MARKDOWN);
service.register(TYPE_MAP);
export function declareMeta(t: Type, v: any) {
    Object.keys(v).forEach(k => t[k] = v[k])
}

export function copy(t: TypeReference) {
    var ttt = service.resolvedType(t);
    var result = {id: null, type: null};
    Object.keys(ttt).forEach(x => result[x] = ttt[x]);
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

    inner?: Status[]
    uid?: string
}

export interface IGraphPoint {
    get(): any
    id(): string
    path(): string
    type(): Type
    parent(): IGraphPoint
    root(): IGraphPoint
    binding(p: string): IGraphPoint
    uid(): any
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
    isLoading(): boolean
    isError(): boolean
    canRetry(): boolean
    clearError();
    errorMessage(): string
    refresh(): void
    errorKind(): "auth"|"parameters"|"unknown"|null
    accessControl(): IAccessControl

    addOperation();
    removeOperation();
    updateOperation();
}
export interface IAccessControl {

    supportsAdd(): boolean

    supportsRemove(): boolean
    supportsUpdate(): boolean

    canEditSelf(): boolean
    canEditChildren(): boolean
    canAddItem(t?: any): boolean
    canRemoveItem(t?: any): boolean
    canEditItem(t?: any): boolean

    needsAuthentification(): boolean

}

export interface CollectionBinding {
    add(v: any);
    remove(v: any);
    replace(oldValue: any, newValue: any);
    componentType(): Type;
    workingCopy(): any[]
    contains(v: any): boolean
    containsWithProp(prop: string, value: any, exceptions: any[]): boolean

    setSelection(v: any[])
    getSelection(): any[]
    selectionBinding(): IBinding
    isSelected(v): boolean
    refresh();
    setSelectionIndex(n: number)
}

export abstract class ListenableValue<T> {
    protected listeners: IValueListener[] = []
    _parent: ListenableValue<any>;

    public fireEvent(c: ChangeEvent) {
        this.listeners.forEach(x => x.valueChanged(c));
    }

    abstract get(): T

    addListener(v: IValueListener) {
        this.listeners.push(v);
    }

    removeListener(v: IValueListener) {
        this.listeners = this.listeners.filter(x => x != v);
    }
}
export interface Parameter extends Type {
    location: "query"|"uri"|"header"|"body"|"other"
    required: boolean
}

export interface Operation {

}

export interface Thenable {
    then(f: (err, v: any,extra?:any) => void);
}
export class DefaultAccessControl<T extends AbstractBinding> implements IAccessControl {

    constructor(protected readonly binding: T) {

    }

    needsAuthentification() {
        return false;
    }

    supportsAdd(): boolean {
        return this.isEditable();
    }

    protected isEditable() {
        if (this.binding.parent()) {
            if (!this.binding.parent().accessControl().canEditChildren()) {
                return false;
            }
        }
        return !this.binding.type().readonly;
    }
    canEditChildren(): boolean{
        if (this.binding.parent()) {
            if (!this.binding.parent().accessControl().canEditChildren()) {
                return false;
            }
        }
        return true;
    }

    supportsUpdate(): boolean {
        return this.isEditable();
    }

    supportsRemove(): boolean {
        return this.isEditable();
    }

    canEditSelf(): boolean {
        return this.isEditable();
    }

    canAddItem(t?: any): boolean {
        return this.isEditable();
    }

    canRemoveItem(t?: any): boolean {
        return this.isEditable();
    }

    canEditItem(t?: any): boolean {
        return this.isEditable();
    }
}


export abstract class AbstractBinding extends ListenableValue<any> implements IBinding {

    _parent: Binding;

    lookupVar(v: string) {
        return null;
    }

    errorKind() {
        return null;
    }
    addOperation() {
        return null;
    }

    removeOperation() {
        return null;
    }

    updateOperation() {
        return null;
    }
    _acccessor: IAccessControl;

    accessControl() {
        if (this._acccessor) {
            return this._acccessor;
        }
        return new DefaultAccessControl(this);
    }

    clearError() {
    }

    isLoading(): boolean {
        return false;
    }

    isError() {
        return false;
    }

    canRetry() {
        return false;
    }

    abstract id();

    errorMessage(): string {
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

    protected _cb: CollectionBinding;

    collectionBinding() {
        if (this._cb) {
            return this._cb;
        }
        this._cb = this.createCollectionBinding();
        return this._cb;
    }

    path(): string {
        if (this.parent()) {
            var ps = this.parent().path();
            if (ps) {
                return ps + "." + this.id();
            }
            return this.id();
        }
        return "";
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

    abstract refresh()

    abstract set(v: any)

    private _uid = (buid++);

    uid() {
        return this._uid;
    }

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

    innerBnds() {
        return this._bnds;
    }
}

class KeyBinding extends AbstractBinding implements IBinding {

    createCollectionBinding(): CollectionBinding {
        throw new Error("Key binding can not be viewed as collection")
    }

    refresh() {
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


//const shadowMap=new WeakMap<any,any>();

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

export let enumOptions = function (type: Type, b: IBinding) {
    var enumv = type.enum;
    if (!enumv) {
        var enumF = (<metakeys.EnumValues>type).enumValues;
        enumv = calcExpression(enumF, b);
        if (!Array.isArray(enumv)) {
            if (typeof enumv == "object") {
                enumv = Object.keys(enumv);
            }
        }

    }
    if (!enumv) {
        enumv = []
    }
    var result = [];

    return enumv;
};


export interface IContext {
    lookupVar(name: string): any
}
var buid = 0;

export class Binding extends AbstractBinding implements IBinding {

    _parent: Binding;
    value: any;
    _id: string

    variables: {[name: string]: any} = {}

    context: IContext;

    readonly: boolean

    autoinit: boolean = true;

    addVar(name: string, value: any) {
        this.variables[name] = value;
    }

    preCommitListeners: IValueListener[] = [];

    addPrecomitListener(i: IValueListener) {
        this.preCommitListeners.push(i);
    }

    removePrecomitListener(i: IValueListener) {
        this.preCommitListeners = this.preCommitListeners.filter(x => x != i);
    }



    inGet: boolean;


    get(p?: string) {
        if (p) {
            return this.binding(p).get();
        }
        if (this._parent && this._id) {
            var mm = service.getValue(this._parent.type(), this._parent.value, this._id, this._parent);
            if (mm != this.value) {
                this.value = mm;
                var v = this.autoinit;
                this.inGet = true;
                if (service.isArray(this.type()) || service.isMap(this.type())) {
                    this._cb = this.createCollectionBinding();
                }
                this.inGet = false;
            }
            return mm;
        }
        return this.value;
    }

    createCollectionBinding(): CollectionBinding {
        if (this.type().componentType) {
            return new cb.MapCollectionBinding(this);
        }
        if (this.type().itemType) {
            return new cb.ArrayCollectionBinding(this);
        }
        throw new Error("Collection bindings may be only used with map or array types");
    }

    set(v: any) {
        if (this.readonly) {
            return;
        }
        if (v) {
            if (service.isNumber(this.type())) {
                if (typeof v != "number") {
                    if (service.isInteger(this.type())) {
                        v = parseInt(v);
                    }
                    else {
                        v = parseFloat(v);
                    }
                }
            }
            if (service.isArray(this.type())) {
                if (!Array.isArray(v)) {
                    v = [v];
                }
            }
        }
        else {
            if (service.isNumber(this.type())) {
                if (v == "") {
                    v = null;
                }
            }

        }
        if (v == this.value) {
            if (v) {
                if (typeof v != "object") {
                    return;
                }
            }
            else {
                return;
            }
        }
        if (Array.isArray(v)) {
            if (v.length == 0) {
                if (Array.isArray(this.value)) {
                    if (this.value.length == 0) {
                        return;
                    }
                }
            }
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
                if (this._parent.autoinit) {
                    this._parent.set(s);
                } //autoinit
            }
            service.setValue(this.type(), s, this._id, v, this);
        }
        this.value = v;
        if (!this.inGet) {
            this.changing = true;
            manager.INSTANCE.fire(ev);
            this.fireUp(ev);
            this.changing = false;
        }
    }

    changing = false;

    protected lastEvent:ChangeEvent

    getLastEvent(){
        return this.lastEvent;
    }

    fireUp(ev) {
        this.lastEvent=ev;
        if (this._parent) {
            this._parent.fireUp(ev);
        }
        else {
            this.refresh();
        }
    }


    public changed() {
        var ev: ChangeEvent = {
            kind: "change",
            source: this,
            oldValue: this.value,
            newValue: this.value,
            target: this._parent ? this._parent.get() : null
        };
        manager.INSTANCE.fire(ev);
        this.fireUp(ev);
    }


    private refreshChildren() {
        Object.keys(this._bnds).forEach(k => {

            this._bnds[k].refresh();
        })
        if (this._cb) {
            this._cb.refresh();
        }
    }

    rc = 0;
    refreshing = false;

    refresh() {
        if (this.refreshing) {
            return;
        }
        this.refreshing = true;

        try {
            this.preCommitListeners.forEach(x => x.valueChanged(null));
            this.rc++;
            if (this._parent && this._id) {
                var mm = service.getValue(this._parent.type(), this._parent.value, this._id, this._parent);
                var chV = mm != this.value;
                this.value = mm;
            }
            this.refreshChildren();
            if (this._parent && this.id) {
                if (chV || typeof mm == "object") {
                    var v = this.autoinit;
                    this.listeners.forEach(x => x.valueChanged(null));
                }
            }
            else if (this.changing || (!this._parent)) {
                this.listeners.forEach(x => x.valueChanged(null));
            }
        } finally {
            this.refreshing = false;
        }
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
        var p = service.property(this.type(), name);
        var b: Binding = null;
        if (p && (service.isRelation(p.type) || service.isView(p.type))) {
            b = new storage.BasicPagedCollection(name, <metakeys.WebCollection>service.resolvedType(p.type), this);
        }
        else {
            b = new Binding(name);
            if (name.charAt(0) == '@') {
                b.value = this.lookupVar(name.substring(1));
                return b;
            }
            if (this.value) {
                b.value = service.getValue(this.type(), this.value, name);
            }
            b._id = name;
        }

        b._parent = this;
        if (p) {
            b._type = service.resolvedType(p);
        }
        else if ((<MapType>this.type()).componentType) {
            b._type = (<MapType>this.type()).componentType;
        }
        this._bnds[name] = b;
        return b;

    }

    lookupVar(v: string) {
        if (this.variables[v]) {
            return this.variables[v];
        }
        if (service.property(this.type(),v)) {
            return service.getValue(this.type(),this.get(),v,this);
        }
        if (this._parent) {
            return this._parent.lookupVar(v);
        }
        if (this.context) {
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

export class ComputedBinding extends Binding implements IValueListener {

    protected ignore: boolean;

    _lv: any

    valueChanged(v: ChangeEvent) {
        if (this.ignore) {
            return;
        }
        var q = this.get();

        if (JSON.stringify(this._lv) === JSON.stringify(q)) {
            return;
        }
        this.fireEvent(null);
        this._lv = q;
        this.ignore = true;
        try {
            this.changed();
        } finally {
            this.ignore = false;
        }
    }

    refresh() {
        this.valueChanged(null);
        super.refresh();
    }

    constructor(id: string, private f: ((v: IBinding) => any), private listenToRoot: boolean, parent: Binding) {
        super(id);
        this._parent = parent;
        this._lv = this.get();
    }

    get(): any {
        return this.f(this.parent());
    }
}

export class OperationBinding extends Binding {

    canCompute(x:Parameter){
        if (this.ctx.lookupVar(x.id)){
            return true;
        }
        if ((<FunctionalValue>x).computeFunction){
            return true;
        }
        if ((<metakeys.EqualTo>x).equalTo){
            return true;
        }
    }

    compute(x:Parameter){
        var v=this.ctx.lookupVar(x.id);
        if (v){
            return v;
        }
        if ((<FunctionalValue>x).computeFunction){
            var exp=calcExpression((<FunctionalValue>x).computeFunction,this);
            if (exp){
                return exp;
            }
        }
        if ((<metakeys.EqualTo>x).equalTo){
            var eq=(<metakeys.EqualTo>x).equalTo;
            return calcExpression(eq,this);
        }
        return null;
    }

    constructor(private t: Operation, private ctx: Binding) {
        super(t.id);
        var ps: Parameter[] = t.parameters.filter(x => !this.canCompute(x));
        if (ps.length == 0) {
            this._type = TYPE_NULL;
        }
        if (ps.length == 1) {
            this._type = {
                id: t.id,
                type: [t, ps[0]]
            }
            this.value = service.newInstance(this._type);
        }
        else {
            let parameterType: ObjectType = {
                id: t.id,
                type: "object",
                properties: {}
            }
            var b = this;
            if (ps) {
                ps.forEach(p => parameterType.properties[p.id] = {
                    type: p,
                    id: "",
                    required: p.required,
                    displayName: service.caption(p)
                });
            }
            this._type = parameterType;
            this.value = service.newInstance(this._type);
        }
    }
    execute(cb:(r:any)=>void){
        var vl=this.get();
        var rs={};
        var ps: Parameter[]=[];
        this.t.parameters.forEach(x=>{
            var val=this.compute(x);
            if (val){
                rs[x.id]=val;

            }
            else{
                ps.push(x);
            }
        })
        if (ps.length==1){
            var tp=service.resolvedType(<string>ps[0].type);
            if (this.context){
                if (!service.isSubtypeOf(tp,(<Binding>this.context).type())){
                    vl=service.convert(tp,(<Binding>this.context).type(),vl)
                }
            }
            rs[ps[0].id]=vl;
        }
        else{
            Object.keys(vl).forEach(x=>{
                rs[x]=vl[x];
            })
        }
        service.executeOperation(this.t,rs,cb);
    }
}
export class ViewBinding extends Binding {
    protected _paramBindings: Binding[];

    constructor(id: string) {
        super(id);
    }

    parameterModifyCount = 0;

    parametersChanged() {
        this.parameterModifyCount++;
        var cp = this.parameterModifyCount;
        if (this._parametersOwnerBinding.lastEvent){
            var tp=this._parametersOwnerBinding.lastEvent.source.type();
            if (tp.enum||(<metakeys.EnumValues>tp).enumValues||service.isBoolean(tp)){
                this.value = null;
                this.changed();
                return;
            }
        }
        setTimeout(x => {
            if (cp == this.parameterModifyCount) {
                this.value = null;
                this.changed();
            }
        }, 800)//FIXME
    }

    statusChanged() {
        this.value = null;
        if (this.parameterStatus().valid) {
            this.clearError();
        }
    }

    _parametersOwnerBinding;

    parameterBindings(): Binding[] {
        if (this._paramBindings) {
            return this._paramBindings;
        }
        this._paramBindings = [];
        var ps = (<metakeys.WebCollection>this.type()).parameters
        let parameterType: ObjectType = {
            id: "Parameters",
            type: "object",
            properties: {}
        }
        this._parametersOwnerBinding = new Binding("");
        this._parametersOwnerBinding._type = parameterType;
        this._parametersOwnerBinding.value = {};
        var b = this;
        if (ps) {
            ps.forEach(p => parameterType.properties[p.id] = {
                type: p,
                id: "",
                required: p.required,
                displayName: service.caption(p)
            });
            this._parametersOwnerBinding.set(service.newInstance(this._parametersOwnerBinding.type()))
            if (ps) {
                ps.forEach(x => {
                    var bnd = this._parametersOwnerBinding.binding(x.id);
                    this._paramBindings.push(bnd);

                })
            }
        }
        this._parametersOwnerBinding.addListener({
            valueChanged(){
                b.parametersChanged();
            }
        })
        this._parametersOwnerBinding.binding("$status").addListener({
            valueChanged(){
                b.statusChanged();
            }
        })
        return this._paramBindings;
    }

    parameterStatus(): Status {
        this.parameterBindings();
        return this._parametersOwnerBinding.binding("$status").get();
    }
}
export import storage=require("./storage")
export import vs=require("./validators")
import cb=require("./collectionBindings")//
export import ok=vs.ok;
export import error=vs.error;
export import warn=vs.warn;
export import calcExpression=compute.calcExpression;
export import calcCondition=compute.calcCondition;

export class StatusBinding extends ComputedBinding implements IValueListener {
    constructor(p: Binding) {
        super("$status", v => {
            var validator = vs.INSTANCE.validator(p.type());
            return validator.validateBinding(p);
        }, true, p)
        this.value = ok();
    }
}
export function binding(v: any, t: Type): Binding {
    var rs: Binding;
    if (service.isView(t) || service.isRelation(t)) {
        rs = new storage.BasicPagedCollection(t.id, t, new Binding(""));
        rs._type = t;
        return rs;
    }
    rs = new Binding(t.id);
    rs.value = v;
    rs._type = t;
    return rs;
}

export import setAuthService= storage.setAuthServive