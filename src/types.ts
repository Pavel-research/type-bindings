import {RESTAccessControl} from "./storage";
export type TypeReference=Type|string
export import metakeys=require("./metaKeys")
export import manager=require("./manager")
export import ts=require("./typesService")
import pluralize=require("pluralize")
import moments=require("moment")
export import service=ts.INSTANCE;
export import utils=require("./utils")
export import decorators=require("./decorators")
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
    details?: (Operation|string)[]
    listers?: (Operation|string)[]
    destructors?: (Operation|string)[]
    memberCollections?: (Operation|string)[]
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
export const TYPE_ACTION: Type = {id: "action", type: TYPE_OPERATION}

export const TYPE_DATE: Type = <Type&metakeys.Label>{
    id: "date", type: TYPE_SCALAR, label(v){
        var m = moments(v);
        var vl = m.calendar(null, {
            sameDay: '[Today]',
            nextDay: '[Tomorrow]',
            nextWeek: 'dddd',
            lastDay: '[Yesterday]',
            lastWeek: '[Last] dddd',
            sameElse: 'MM/DD/YYYY'
        })
        if (vl == "Today") {
            return m.fromNow();
        }
        return vl;
    }
}
export const TYPE_SECURITYDEFINITION: Type = {id: "securityDefinition", type: TYPE_ANY}
export const TYPE_MODULE: Type = {id: "module", type: TYPE_ANY}
export const TYPE_PASSWORD: Type = {id: "password", type: TYPE_STRING}
export const TYPE_DATETIME: Type = {id: "datetime", type: TYPE_DATE}
export const TYPE_DATEONLY: Type = {id: "date-only", type: TYPE_DATE}
export const TYPE_URL: StringType = {id: "url", type: "string"}
export const TYPE_HTMLURL: StringType = {id: "htmlUrl", type: "url"}
export const TYPE_LINK: StringType = {id: "link", type: "url"}
export const TYPE_HTML: StringType = {id: "html", type: "text"}

export const TYPE_IMAGEURL: StringType = {id: "imageUrl", type: "url"}

export const TYPE_BOOLEAN: Type = {id: "boolean", type: TYPE_SCALAR}
export const TYPE_NULL: Type = {id: "null", type: TYPE_SCALAR}
export const TYPE_OBJECT: ObjectType = {id: "object"}
export const TYPE_ARRAY: ArrayType = {id: "array"}
export const TYPE_MAP: MapType = {id: "map"}
export const TYPE_RELATION: Type = {id: "relation", type: TYPE_ARRAY}
export const TYPE_VIEW: Type = {id: "view", type: TYPE_ARRAY}
export const TYPE_TEXT: StringType = {id: "text", type: "string", multiline: true}
export const TYPE_MARKDOWN: Type&metakeys.needsOwnGroup = {id: "markdown", type: TYPE_TEXT, needsOwnGroup: true}
export const TYPE_CODE: Type&metakeys.needsOwnGroup = {id: "code", type: TYPE_TEXT, needsOwnGroup: true}

const isBrowser = typeof window !== 'undefined';

if (isBrowser) {
    (<any>window).moments = moments;
}
(<metakeys.HasComparator>TYPE_DATE).compareFunction = (x0: any, x1: any) => {
    if (x0 && x1) {
        var d0 = new Date(x0);
        var d1 = new Date(x1);
        return d0.getTime() - d1.getTime();
    }
    if (x0) {
        return 1;
    }
    return -1;
}
(<metakeys.HasComparator>TYPE_NUMBER).compareFunction = (x0: any, x1: any) => {
    if (x0 && x1) {
        return x0 - x1;
    }
    if (x0) {
        return 1;
    }
    return -1;
}
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

export class HasType {
    constructor(public readonly $type: Type, public readonly $value: any) {

    }
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
    subKind?: string
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
    addListener(v: IValueListener| ((v: any) => void))
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
    autoCommit(): boolean;
    enumeratedValues(): IBinding
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
    setGroupByProperty(prop: string)
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
    groupBy(): boolean;
    tree(): boolean;
    children(x: any): any[]
    expanded(x: any): boolean
    expand(x: any)
    collapse(x: any)

    levels(): number[]
}

export abstract class ListenableValue<T> {
    protected listeners: IValueListener[] = []
    _parent: ListenableValue<any>;

    public fireEvent(c: ChangeEvent) {
        this.listeners.forEach(x => x.valueChanged(c));
    }

    abstract get(): T

    addListener(v: IValueListener| ((v: any) => void)) {
        if (typeof v == "function") {
            this.listeners.push({
                valueChanged(e){
                    (<any>v)(e)
                }
            })
        }
        else {
            this.listeners.push(v);
        }
    }

    removeListener(v: IValueListener) {
        this.listeners = this.listeners.filter(x => x != v);
    }
}
export interface Parameter extends Type {
    location: string
    required?: boolean
}

export interface Operation {

}

export interface Thenable {
    then(f: (err, v: any, extra?: any) => void);
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
        if ((<Binding><any>this.binding).readonly) {
            return false;
        }
        if (this.binding.parent()) {
            if (!this.binding.parent().accessControl().canEditChildren()) {
                return false;
            }
        }
        return !this.binding.type().readonly;
    }

    canEditChildren(): boolean {
        if (this.binding.parent()) {
            if (!this.binding.parent().accessControl().canEditChildren()) {
                return false;
            }
        }
        if (this.binding.immutable) {
            return false;
        }
        if (this.binding.type().immutable) {
            return false;
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
    immutable: boolean

    lookupVar(v: string) {
        return null;
    }

    errorKind() {
        return null;
    }

    addOperation() {
        return null;
    }

    enumeratedValues() {
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

    autoCommit() {
        return true;
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
    if (!type) {
        return [];
    }
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

    _autoCommit: boolean = true;

    autoCommit() {
        return this._autoCommit;
    }

    type() {
        if (this.value instanceof HasType) {
            return (<Type|any>service.resolvedType(this.value.$type));
        }
        return super.type();
    }

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
        if (this.value instanceof HasType) {
            return this.value.$value;
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
        if (Array.isArray(v)) {
            if (!service.isArray(this.type())) {
                if (v.length == 1) {
                    v = v[0];
                }
                if (v.length == 0) {
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
        this.beforeChange(ev);
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

    protected beforeChange(e: ChangeEvent) {
        this.beforeChangeListeners.forEach(x => x.valueChanged(e));
        if (this._parent) {
            this._parent.beforeChange(e);
        }
    }

    beforeChangeListeners: IValueListener[] = [];

    changing = false;

    protected lastEvent: ChangeEvent

    getLastEvent() {
        return this.lastEvent;
    }

    fireUp(ev) {
        this.lastEvent = ev;
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


    refreshChildren() {
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
                if (chV || typeof mm == "object" || ((<metakeys.EnumValues>this.type()).enumValues) || (this.type().computeFunction)) {
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

    private _enum: Binding
    private _btransform: (x: any) => any
    private _transform: (x: any) => any

    fromReferenceToOriginal(v: any): any {
        if (!this._btransform) {
            this.enumeratedValues();
        }
        if (!this._btransform) {
            return v;

        }
        return this._btransform(v);
    }

    fromOriginalToReference(x: any): any {
        if (!this._transform) {
            this.enumeratedValues();
        }
        if (!this._transform) {
            return x;

        }
        return this._transform(x);
    }

    enumeratedValues(): IBinding {
        if (this._enum) {
            return this._enum;
        }
        if (this.type().enum) {
            this._enum = new Binding("$enum");
            this._enum.value = this.type().enum;
            this._enum._type = array(this._type);
        }
        var ev = (<metakeys.EnumValues>this.type()).enumValues;
        if (ev) {
            var eb = new ComputedBinding("$enum", (x) => {

            }, false, this);
            this.addPrecomitListener({
                valueChanged(e){
                    eb.refresh();
                }
            })
            eb._type = this._type;
            this._enum = eb;
        }
        else {
            var _enumOptions = enumOptionsBinding(this.type(), this);
            if (_enumOptions) {
                this._enum = _enumOptions.collection;
            }
        }
        return this._enum;
    }

    constructor(n: string) {
        super();
        this._id = n;
    }

    id() {
        return this._id;
    }

    referencedType() {
        var ref = (<metakeys.Reference>this.type()).reference;
        if (ref) {
            var tr: (x: any) => any = null;
            var btr: (x: any) => any = null;
            if (typeof ref == "string") {
                var cmp = service.resolveTypeByName(ref);
                if (cmp.id == "any") {
                    var nnn = <string>ref;
                    if (nnn.indexOf('.') != -1) {
                        var cmp = service.resolveTypeByName(nnn.substring(0, nnn.indexOf('.')));
                        if (cmp.id != "any") {
                            return cmp
                        }
                    }
                }
            }
        }
        return null;
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
            if (p && p.type.remote) {
                b = new storage.RemoteValueBinding(name);
                b.context = this;

            }
            else {
                b = new Binding(name);
            }
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
        if (service.property(this.type(), v)) {
            return service.getValue(this.type(), this.get(), v, this);
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

export class DirtyController extends ListenableValue<any> {

    saved: string;
    current: string
    isDirty: boolean = false;

    setSaved(v: any) {
        this.saved = JSON.stringify(v);
    }

    setCurrent(c: any) {
        this.current = JSON.stringify(c);
        this.updateState();
    }

    private updateState() {
        var newDirty = this.current != this.saved;
        if (newDirty != this.isDirty) {
            this.isDirty = newDirty;
            this.fireEvent(null);
        }
    }

    get() {
        return this.isDirty;
    }
}
export class CachingBinding extends Binding {

    readonly dirtyController = new DirtyController();

    ol: IValueListener = null;


    constructor(private original: Binding) {
        super(original.id());
        this.context = original;
        this._type = original._type;
        var v = this;
        this.ol = {
            valueChanged(){
                v.set(utils.deepCopy(original.get()));
            }
        }
        original.addListener(this.ol);
        this.addListener({
            valueChanged(){
                v.dirtyController.setCurrent(v.get());
            }
        })
    }

    dispose() {
        this.original.removeListener(this.ol);
    }

    set(v: any) {
        this.dirtyController.setSaved(v);
        super.set(v);
    }

    commit() {
        var q = this.original.readonly;
        this.original.readonly = false;
        this.original.set(this.get());
        this.original.readonly = q;
    }

    revert() {
        this.set(utils.deepCopy(this.original.get()));
    }
}

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
function canCompute(b: Binding, x: Parameter, allowVar = true) {
    if (b.type().basicPaging) {
        var v = b.type().basicPaging;
        if (v.offset == x.id) {
            return true;
        }
        if (v.page == x.id) {
            return true;
        }
        if (v.limit == x.id) {
            return true;
        }
    }
    if ((<metakeys.Reference>x).reference) {
        var ref: string|boolean = (<metakeys.Reference>x).reference
        if (typeof ref == "string") {
            var rs: string = ref;
            var member = rs.indexOf('.');
            if (member != -1) {
                var typeName = rs.substring(0, member);
                //var pname=rs.substring(member+1);
                var ts = service.resolveTypeByName(typeName);
                var lll = b;
                while (lll) {
                    if (service.isSubtypeOf(lll.type(), ts)) {
                        return true;
                    }
                    if (!lll.parent()) {
                        if (lll.context) {
                            lll = <any>lll.context;
                        }
                        else {
                            lll = null;
                        }
                    }
                    else {
                        lll = lll.parent();
                    }

                }
            }
        }
    }
    if (allowVar) {
        if (b.lookupVar(x.id)) {
            return true;
        }
    }
    if ((<FunctionalValue>x).computeFunction) {
        return true;
    }
    if ((<metakeys.EqualTo>x).equalTo) {
        return true;
    }

}
function computeParameter(b: Binding, x: Parameter, allowVar = true) {
    if ((<metakeys.Reference>x).reference) {
        var ref: string|boolean = (<metakeys.Reference>x).reference
        if (typeof ref == "string") {
            var rs: string = ref;
            var member = rs.indexOf('.');
            if (member != -1) {
                var typeName = rs.substring(0, member);
                var pname = rs.substring(member + 1);
                var ts = service.resolveTypeByName(typeName);
                var lll = b;
                while (lll) {
                    if (service.isSubtypeOf(lll.type(), ts)) {
                        return lll.get(pname)
                    }
                    if (!lll.parent()) {
                        if (lll.context) {
                            lll = <any>lll.context;
                        }
                        else {
                            lll = null;
                        }
                    }
                    else {
                        lll = lll.parent();
                    }
                }
            }
        }
    }
    if (allowVar) {
        var v = b.lookupVar(x.id);
        if (v) {
            return v;
        }
    }
    if ((<FunctionalValue>x).computeFunction) {
        var exp = calcExpression((<FunctionalValue>x).computeFunction, b);
        if (exp) {
            return exp;
        }
    }

    if ((<metakeys.EqualTo>x).equalTo) {
        var eq = (<metakeys.EqualTo>x).equalTo;
        return calcExpression(eq, b);
    }


}
function computeParameterBinding(b: Binding, x: Parameter): IBinding {
    if ((<metakeys.Reference>x).reference) {
        var ref: string|boolean = (<metakeys.Reference>x).reference
        if (typeof ref == "string") {
            var rs: string = ref;
            var member = rs.indexOf('.');
            if (member != -1) {
                var typeName = rs.substring(0, member);
                var pname = rs.substring(member + 1);
                var ts = service.resolveTypeByName(typeName);
                var lll = b;
                while (lll) {
                    if (service.isSubtypeOf(lll.type(), ts)) {
                        return lll.binding(pname);
                    }
                    if (!lll.parent()) {
                        if (lll.context) {
                            lll = <any>lll.context;
                        }
                        else {
                            lll = null;
                        }
                    }
                    else {
                        lll = lll.parent();
                    }
                }
            }
        }
    }
    var v = b.lookupVar(x.id);
    if (v) {
        var b = new Binding(x.id);
        b._type = x;
        b.value = v;
        return b;
    }

    if ((<FunctionalValue>x).computeFunction) {
        var exp = calcExpression((<FunctionalValue>x).computeFunction, b);
        var b = new Binding(x.id);
        b._type = x;
        b.value = exp;
        return b;
    }
    if ((<metakeys.EqualTo>x).equalTo) {
        var eq = (<metakeys.EqualTo>x).equalTo;
        var b = new Binding(x.id);
        b._type = x;
        b.value = eq;
        return b;
    }

    return null;
}
export class Parameterizeable extends Binding {

    param(name: string) {
        return this.lookupVar(name);
    }

}
export class OperationBinding extends Parameterizeable {

    canCompute(x: Parameter) {
        var vvl = canCompute(this.ctx, x);

        return vvl || canCompute(this, x, false);
    }

    lookupVar(v: string) {
        for (var i = 0; i < this.t.parameters.length; i++) {
            if (this.t.parameters[i].id == v) {
                if (this.canCompute(this.t.parameters[i])) {
                    return this.compute(this.t.parameters[i]);
                }
            }
        }
        return super.lookupVar(v);
    }
    setContext(v:any){
        Object.keys(v).forEach(x=>{
            this.ctx.addVar(x,v[x]);
        })
    }

    compute(x: Parameter) {
        var vvl = computeParameter(this.ctx, x);
        if (vvl instanceof Error) {
            vvl = false;
        }
        return vvl || computeParameter(this, x, false);
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

        ///this._type=t.result;
    }

    resultType(){
        return this.t.result;
    }


    execute(cb: (r: any) => void) {
        var vl = this.get();
        var rs = {};
        var ps: Parameter[] = [];
        if (!this.t.location){
            var val = this.ctx.lookupVar("baseUri");
            if (val) {
                rs["baseUri"] = val;

            }
            // ps.push({
            //     id:"baseUri",
            //     location:"uri",
            //     type:"string"
            // })
        }
        this.t.parameters.forEach(x => {
            var val = this.compute(x);
            if (val) {
                rs[x.id] = val;

            }
            else {
                if (x.required) {
                    ps.push(x);
                }
            }
        })
        if (ps.length == 1) {
            var tp = service.resolvedType(<string>ps[0].type);
            if (this.context&&(<any>this.context).type) {
                if (!service.isSubtypeOf(tp, (<Binding>this.context).type())) {
                    vl = service.convert(tp, (<Binding>this.context).type(), vl)
                }
            }
            rs[ps[0].id] = vl;
        }
        else {
            Object.keys(vl).forEach(x => {
                rs[x] = vl[x];
            })
        }
        service.executeOperation(this.t, rs, cb);
    }
}
export interface ConversionRule {
    from: string
    to: string
    code?: (v) => any
    selfRule?: string
    autoConvertKnownProperties?: boolean
    asssertions?: {[name: string]: string}
}
export interface Module {
    conversionRules?: {
        [name: string]: ConversionRule
    }
}
import cu=require("./collectionUtils")


export class ViewBinding extends Binding {
    protected _paramBindings: Binding[];
    protected _allParamBindings: Binding[];

    constructor(id: string) {
        super(id);
    }

    parameterModifyCount = 0;


    processOrderingChange() {
        var ord = null;
        var v: any;
        this.parameterBindings().forEach(x => {
            if ((<metakeys.Ordering>x.type()).ordering) {
                ord = (<metakeys.Ordering>x.type()).ordering;
                v = x.value;
            }
        })
        var o = ord[v];
        var asc = false;
        var prop = null;

        if (typeof o == "object") {
            asc = !o.descending;
            prop = o.property;
        }
        else {
            prop = o;
        }
        this.parameterBindings().forEach(x => {
            if ((<metakeys.Ordering>x.type()).sortDirection) {
                var vl = x.value;
                if (vl == "asc") {
                    asc = true;
                }
            }
        })
        if (this.hasAllData()) {
            if (this.localFilters) {
                this.localFilters.base = cu.sort(this.localFilters.base, this.collectionBinding().componentType(), prop, asc)
                this.localFilters.setBase(this.value, this.collectionBinding().componentType());
                this.localFilters.set(ord, v);
                this.value = this.localFilters.filtered;
            }
            else {
                this.value = cu.sort(this.value, this.collectionBinding().componentType(), prop, asc);
            }
            this._cb.refresh();
            this.changed();
        }
        else {
            this.innerParametersChanged();
        }
    }

    localFilters: cu.FilteredCollection

    beforeLocalFilters: any;

    sortDirectionParameter(): IBinding {
        var result: IBinding = null;
        this.parameterBindings().forEach(x => {
            if ((<metakeys.Ordering>x.type()).sortDirection) {
                result = x;
            }
        })
        return result;
    }

    processFilteringChange(pbnd: IBinding, ord: metakeys.Filter&Type, v: any) {
        if (this.hasAllData()) {
            if (!this.localFilters) {
                this.beforeLocalFilters = this.oldParameters;
                if (this.beforeLocalFilters[pbnd.id()]) {
                    this.potentiallyDelayChange(pbnd);
                    return;
                }
                this.localFilters = new cu.FilteredCollection();
                this.localFilters.setBase(this.value, this.collectionBinding().componentType());
                this.localFilters.set(ord, v);
                this.value = this.localFilters.filtered;
                this._cb.refresh();
                this.changed();
            }
            else {
                if (this.beforeLocalFilters[pbnd.id()]) {
                    this.localFilters = null;
                    this.potentiallyDelayChange(pbnd);
                    return;
                }
                else {
                    this.localFilters.set(ord, v);
                    this.value = this.localFilters.filtered;
                    this._cb.refresh();
                    this.changed();
                }
            }
            //we already have enough data to filter locally;
        }
        else {
            this.potentiallyDelayChange(pbnd)
        }
    }

    potentiallyDelayChange(pbnd: IBinding) {
        if (pbnd && pbnd.enumeratedValues()) {
            this.innerParametersChanged();
            return;
        }
        var cp = this.parameterModifyCount;
        setTimeout(x => {
            if (cp == this.parameterModifyCount) {
                this.innerParametersChanged();
            }
        }, 800)//FIXME
    }

    hasAllData() {
        return false;
    }

    parametersChanged() {
        this.parameterModifyCount++;
        var cp = this.parameterModifyCount;
        if (this._parametersOwnerBinding.getLastEvent()) {
            var pdnd = this._parametersOwnerBinding.getLastEvent().source;
            if (pdnd.id() == "$groupBy") {
                var val = pdnd.get();
                if (val == "$none") {
                    val = "";
                }
                this.collectionBinding().setGroupByProperty(val);
                return;
            }
            var tp = pdnd.type();
            var ordering = (<metakeys.Ordering>tp).ordering;
            if (ordering) {
                var value = pdnd.get();
                this.processOrderingChange();
                //this.sort()
                return;
            }
            var sd = (<metakeys.Ordering>tp).sortDirection;
            if (sd) {
                var value = pdnd.get();
                this.processOrderingChange();
                //this.sort()
                return;
            }
            var filter = (<metakeys.Filter&Type>tp).filter;
            if (filter) {
                var value = pdnd.get();
                this.processFilteringChange(pdnd, (<metakeys.Filter&Type>tp), value);
                //this.sort()
                return;
            }
        }
        this.potentiallyDelayChange(pdnd);
    }

    innerParametersChanged() {
        this.value = null;
        this.changed();
    }

    statusChanged() {
        this.value = null;
        if (this.parameterStatus().valid) {
            this.clearError();
        }
    }

    _parametersOwnerBinding: Binding;

    allParameterBindings() {
        if (this._allParamBindings) {
            return this._allParamBindings;
        }
        this.parameterBindings();
        return this._allParamBindings;
    }

    private oldParameters: any

    parameterBindings(): Binding[] {
        if (this._paramBindings) {
            return this._paramBindings;
        }
        this._paramBindings = [];
        this._allParamBindings = [];
        var ps = (<metakeys.WebCollection>this.type()).parameters;
        let parameterType: ObjectType = {
            id: "Parameters",
            type: "object",
            properties: {}
        }
        var gb = (<metakeys.GroupBy>this.type()).groupBy;
        if (gb && gb.allowUserConfiguration) {
            var values = [];
            if (gb.allowedGropings) {
                values = gb.allowedGropings;
            }
            else {
                var vp = service.visibleProperties(service.componentType(this.type()));
                vp = vp.filter(x => {
                    var vl = service.isMultiSelect(x.type) || service.isFiniteSetOfInstances(x.type);
                    return vl;
                })
                values = vp.map(x => x.id);
            }
            var ed = [];
            values.forEach(x => {
                var p = service.property(service.componentType(this.type()), x);
                if (p) {
                    ed.push(service.caption(p));
                }
            })
            values.push("$none");
            ed.push("None")
            ps.push(<any>{
                id: "$groupBy",
                location: "other",
                displayName: "Group By",
                type: "string",
                enum: values,
                enumDescriptions: ed,
                default: gb.property,
                required: false
            });
            var pl = (<metakeys.ParametersLayout>this.type()).parametersLayout;
            if (pl) {
                if (pl.initiallyVisible) {
                    pl.initiallyVisible.push("$groupBy");
                }
            }
        }
        var bnd = this;
        this._parametersOwnerBinding = new Binding("");
        this._parametersOwnerBinding._type = parameterType;
        this._parametersOwnerBinding.value = {};
        this._parametersOwnerBinding.beforeChangeListeners.push({
            valueChanged(e){
                bnd.oldParameters = utils.deepCopy(bnd._parametersOwnerBinding.value);
            }
        })
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
                    if (canCompute(this, x)) {
                        var b1 = <IBinding>computeParameterBinding(this, x);
                        if (b1) {
                            b1.addListener({
                                valueChanged(){
                                    b._parametersOwnerBinding.binding(x.id).set(b1.get());
                                    //b.changed();
                                }
                            })
                            b._parametersOwnerBinding.binding(x.id).set(b1.get());
                            this._allParamBindings.push(<Binding>b._parametersOwnerBinding.binding(x.id));
                        }
                    }
                    else {
                        var bnd = <Binding>this._parametersOwnerBinding.binding(x.id);
                        this._paramBindings.push(bnd);
                        this._allParamBindings.push(bnd);
                    }

                })
            }
        }
        this._parametersOwnerBinding.addPrecomitListener({//
            valueChanged(){
                var ev = b._parametersOwnerBinding.getLastEvent();
                if (b.parameterBindings().indexOf(<Binding>ev.source) == -1) {
                    if (b.allParameterBindings().indexOf(<Binding>ev.source) != -1) {
                        b.innerParametersChanged();
                        return;
                    }
                }
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

    refresh() {
        this.valueChanged(null)
    }

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

export interface EnumResult {
    collection: storage.BasicPagedCollection
    transformer?: (x: any) => any
    btrasform?: (x: any) => any
}
export function enumOptionsBinding(t: Type, c: IBinding): EnumResult {
    var cmp = service.isArray(t) ? service.componentType(t) : t;
    var ref = (<metakeys.Reference>t).reference;
    if (ref) {
        var tr: (x: any) => any = null;
        var btr: (x: any) => any = null;
        if (typeof ref == "string") {
            cmp = service.resolveTypeByName(ref);
            if (cmp.id == "any") {
                var nnn = <string>ref;
                if (nnn.indexOf('.') != -1) {
                    cmp = service.resolveTypeByName(nnn.substring(0, nnn.indexOf('.')));
                    var pName = nnn.substring(nnn.indexOf('.') + 1)
                    tr = function (x) {
                        return service.getValue(cmp, x, pName, c);
                    }
                    btr = (x) => {
                        var wc = st.all();
                        var rs = null;
                        for (var i = 0; i < wc.length; i++) {
                            if (tr(wc[i]) == x) {
                                rs = wc[i];
                                break;
                            }
                        }
                        return rs;
                    }
                }
            }
        }
        var lsts = service.listers(cmp);
        if (lsts.length > 0) {
            if ((<any>c)._enum) {
                var st: storage.BasicPagedCollection = (<any>c)._enum;
                return {collection: ((<any>c)._enum), transformer: tr, btrasform: btr};
            }
            var st = new storage.BasicPagedCollection(lsts[0].id, lsts[0], c);
            st.context = c;
            (<any>c)._enum = st;
            (<any>c)._btransform = btr;
            (<any>c)._transform = tr;
            return {collection: st, transformer: tr, btrasform: btr};
        }
    }
}
export import setAuthService= storage.setAuthServive

export function unidirectional(b1: IBinding, b2: Binding) {
    b1.addListener({
        valueChanged(){
            var v = b1.get();
            if (!v) {
                v = [];
            }
            if (!Array.isArray(v)) {
                v = [v]
            }
            b2.collectionBinding().setSelection(v);
        }
    })
    var sb = b2.collectionBinding().selectionBinding();
    (<AbstractBinding>sb).immutable = true;
    //b2.readonly=true;
}
class CC {

    isSetting: boolean

    constructor(private b1: IBinding, private b2: Binding, transformer?: (x: any) => any, btransformer?: (x: any) => any) {
        var holder = this;
        b1.addListener({
            valueChanged(){
                if (holder.isSetting) {
                    return;
                }
                var vl = b1.get();
                vl = holder.ptransform(vl, btransformer);
                b2.collectionBinding().setSelection(vl);
            }
        })
        b2.collectionBinding().selectionBinding().addListener({
            valueChanged(){
                holder.isSetting = true;
                try {
                    var sel = b2.collectionBinding().getSelection();
                    if (transformer) {
                        sel = sel.map(x => transformer(x));
                    }
                    b1.set(sel);
                } finally {
                    holder.isSetting = false;
                }
            }
        })
        b2.collectionBinding().setSelection(this.ptransform(b1.get(), btransformer));
    }

    private ptransform(vl: any, btransformer: (x: any) => any) {
        if (!vl) {
            vl = [];
        }
        if (!Array.isArray(vl)) {
            vl = [vl];
        }
        if (btransformer) {
            vl = vl.map(x => btransformer(x));
        }
        return vl;
    }
}


export function bidirectional(b1: IBinding, b2: Binding, transformer?: (x: any) => any, btransformer?: (x: any) => any) {
    new CC(b1, b2, transformer, btransformer);
}
service.addRule({
    from: "scalar",
    to: "date-only",
    code: (v) => {
        return moments(v).format("YYYY-MM-DD")
    }
})
service.addRule({
    from: "datetime",
    to: "date-only",
    code: (v) => {
        return moments(v).format("YYYY-MM-DD")
    }
})
service.addRule({
    from: "scalar",
    to: "date",
    code: (v) => {
        return moments(v).toISOString();
    }
})//

export function reinit(v?: {[name: string]: Type}) {
    service.clean();
    service.register(TYPE_UNION);
    service.register(TYPE_ANY);
    service.register(TYPE_SECURITYDEFINITION);
    service.register(TYPE_LINK);
    service.register(TYPE_VIEW);
    service.register(TYPE_SCALAR);
    service.register(TYPE_MODULE);
    service.register(TYPE_DATE);
    service.register(TYPE_DATEONLY);
    service.register(TYPE_STRING);
    service.register(TYPE_URL)
    service.register(TYPE_HTMLURL)
    service.register(TYPE_IMAGEURL)
    service.register(TYPE_OPERATION)
    service.register(TYPE_ACTION)
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
    service.register(TYPE_CODE);
    service.register(TYPE_MAP);
    service.register(TYPE_HTML);
    if (v) {
        Object.keys(v).forEach(x => {
            service.register(v[x]);
        })
    }
}
reinit();

export class FunctionProxy {
    constructor(private v: any, private resource, private name: string) {

    }

    get(target: any, property: string, receiver) {
        console.log(property);

    }
}
class CCollection extends storage.BasicPagedCollection {

    user: string
    password: string

    auth() {
        return false;
    }
    parameterStatus(){
        return ok();
    }

    patchAuth(lr: storage.Request): storage.Request {
        lr.auth = {user: this.user, password: this.password}
        return lr;
    }
}

export class WebCollection {

    constructor(private op: Operation, private options: any,private base:any=null) {

    }

    forEach(f: (v: any) => void) {
        var collection = new CCollection("", <any>this.op, new Binding(""));
        collection.user = this.options.user;
        collection.password = this.options.password;
        collection.allParameterBindings().forEach(x=>{
            if (x.type().reference){
                var rs=x.type().reference;
                var Pname=rs.substring(rs.indexOf('.')+1);
                if (Pname=="owner.login"){
                    x.set("petrochenko-pavel-a")
                }

                else if(this.base[Pname]){
                    x.set(this.base[Pname]);
                }
            }
        })
        var promise = new Promise((resolve, reject) =>{
            // do a thing, possibly async, then…
            collection.addListener(x => {
                if (!collection.isLoading()&&collection.pageCount()==0){
                    resolve(null);
                }
                collection.requestAll().then((e, v, r) => {
                    var ps:Promise<any>[]=[]
                    v.forEach(x => {
                        var r=f(proxyFunc(x, (<any>this.op).itemType, this.options))
                        if (r){
                            ps.push(<any>r);
                        }
                    });
                    if (ps.length>0){
                        Promise.all(ps).then(()=>resolve(null))
                    }
                    else {
                        resolve(null);
                    }
                })

            })
            if (collection.type().displayName=="Issues"){
                var v=[{title:"Test Issue"},{title:"Test 2"}]
                v.forEach(x => {
                    var r=f(proxyFunc(x, (<any>this.op).itemType, this.options))
                });
                resolve(null);
            }
            collection.get();
        });
        return promise;
    }
}
function proxyFunc(v: any, t: Type, o: any) {
    var rs = service.resolvedType(t);
    const val = new Proxy({}, {
        get: (target: any, property: string, receiver) => {
            if (v[property]) {
                return v[property];
            }
            if (property=="patch"){

            }
            var p: Property = null;
            service.properties(rs).forEach(x => {
                if (x.id.indexOf(property) != -1) {
                    p = x;
                }
            })
            if( property=="patch"){
                return  function(){
                   // throw new Error("Missing Parameter")
                }
            }
            return function () {
                return new WebCollection(<any>service.resolvedType(p.type), o,v);
            }

        },
    })
    return val;
}

export class ResourceProxy {
    constructor(private v: any, private name: string, private  options: any) {

    }

    get(target: any, property: string, receiver) {
        var ll = this.v;
        var ln = this.name;
        var opts = this.options;
        if (property=="handle"){
           return function (f1:string,f2:string) {
               var rs={
                   login:f1,
                   name: f2
               }

               return proxyFunc(rs,service.resolvedType("githubTypes_Repository"),this.options);
           }
        }
        return function () {
            var t: Type = null;
            Object.keys(ll.types).forEach(x => {
                //console.log(ll.types[x]);
                var name: string = ll.types[x].id;
                if (name && name.indexOf(ln)!=-1) {
                    t = ll.types[x];
                }
            })
            var op: Operation;
            Object.keys(ll.types).forEach(x => {
                //console.log(ll.types[x]);
                var name: string = ll.types[x].methodName;
                if (name && name == property) {
                    op = ll.types[x];
                }
            })
            return new WebCollection(op, opts);
        };
    }
}
export function createClient(v: any, options: any) {
    Object.keys(v.types).forEach(x => service.register(v.types[x]));
    const val = new Proxy({}, {
        get: (target: any, property: string, receiver) => {
            return new Proxy({}, new ResourceProxy(v, property, options));
        },
    })
    return val;
}