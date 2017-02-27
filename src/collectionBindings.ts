import types=require("./types")
import metakeys=require("./metaKeys")
import ts=require("./typesService")
import utils=require("./utils")
import service=ts.INSTANCE;
import ListenableValue=types.ListenableValue;
import Binding=types.Binding;
import Type=types.Type;
import CollectionBinding=types.CollectionBinding;
import pluralize=require("pluralize")
import cu=require("./collectionUtils")
import deepCopy=utils.deepCopy;
import {DefaultAccessControl, HasType, ViewBinding} from "./types";
import {GroupNode} from "./collectionUtils";

export interface ISelectionListener {
    selectionChanged(newSelection: any[])
}

export interface ISelectionProvider {
    addSelectionListener(l: ISelectionListener)
    removeSelectionListener(l: ISelectionListener);
    getSelection(): any[]
}
export class SelectionAccessControl extends DefaultAccessControl<types.Binding>{

    constructor(private selection:Binding,private collection:Binding){
        super(selection)
    }
    isEditable(){
        if (!this.collection.accessControl().canEditSelf()){
            return false;
        }
        if (!this.collection.accessControl().canEditItem(this.selection.get())){
            return false;
        }
        return true;
    }
    canEditSelf(){
        return !this.selection.immutable;
    }
    canEditChildren(){
        return this.isEditable();
    }
}


export abstract class AbstractCollectionBinding extends ListenableValue<any[]> {

    constructor(protected pb: Binding) {
        super();
        if ((<metakeys.GroupBy>pb.type()).groupBy){
            var gb=(<metakeys.GroupBy>pb.type()).groupBy;
            this._groupByProp=gb.property;//
        }
    }
    _tree: boolean
    _treeProperty: string;
    _groupByProp: string
    groupBy(): boolean{
        return this._groupByProp!=null;
    }
    setGroupByProperty(property: string){
        this._groupByProp=property;
        this.change();
    }

    postransform(value:any[]):any{
        if (this._groupByProp){
            return cu.groupBy(value,this._groupByProp,this.componentType());
        }
        return value;
    }

    tree(): boolean{
        return this._tree;
    }
    children(x:any):any[]{
        if (this.groupBy()){
            if (x instanceof GroupNode){
                return x.children;
            }
        }
        if (this._tree){
            var vl=types.service.getValue(this.componentType(),x,this._treeProperty,null);
            if (vl){
                if (!Array.isArray(vl)){
                    return [vl];
                }
                return vl;
            }
        }
        return [];
    }
    protected expandValues(ac):any[]{
        if (ac) {
            if (this.groupBy() || this.tree()) {
                var rs = [];
                ac.forEach(x => {
                    rs.push(x);
                    if (this.expanded(x)) {
                        rs = rs.concat(this.expandValues(this.children(x)));
                    }
                });
                return rs;
            }
        }else {return  []}
        return ac;
    }

    levels(ac=this.workingCopy(),num:number=0):any[]{
        if (this.groupBy()||this.tree()){
            var rs=[];
            ac.forEach(x=>{
                rs.push(num);
                if (this.expanded(x)){
                    rs=rs.concat(this.levels(this.children(x),num+1));
                }
            });
            return rs;
        }
        return null;
    }

    expansionMap:WeakMap<any,any>
    expanded(x:any):boolean{
        if (!this.expansionMap){
            return false;
        }
        return this.expansionMap.has(x);
    }
    expand(m:any){
        if(!this.expansionMap){
            this.expansionMap=new WeakMap();
        }
        this.expansionMap.set(m,true);

        this.change();
    }
    collapse(m:any){
        this.expansionMap.delete(m);
        this.change();
    }

    abstract componentType(): Type

    abstract workingCopy(): any[]

    get() {
        return this.workingCopy();
    }

    private _selection: Binding;

    selectionBinding(): Binding {
        if (!this._selection) {
            this._selection = this.createSelectionBinding();
        }
        return this._selection;
    }

    originalValue(): any {

    }

    createSelectionBinding(): Binding {
        var sb = new Binding("selection");
        sb._type = {type: this.componentType(), owningCollection: this.pb, uniquinessException: sb};
        sb.context = this.pb;
        sb.autoinit = false;
        sb.readonly = true;
        this._selection = sb;
        var v = this;
        sb.addPrecomitListener({
            valueChanged(){
                if (!v.changing) {
                    v.applyChangesFromSelection();
                }
            }
        })
        sb._acccessor=new SelectionAccessControl(sb,this.pb);
        return sb;
    }

    getSelection(): any[] {
        var vl = this.selectionBinding().get();
        if (!vl) {
            return [];
        }
        if (!Array.isArray(vl)) {
            return [vl];
        }
        return vl;
    }

    changing: boolean
    applyingSelection: boolean

    setSelection(v: any[],fireUp=false) {
        var ll="<>";
        try{
            ll=JSON.stringify(v);
        }
        catch (e){}
        //console.log("Selection:"+this.pb.uid()+":"+this.pb.id()+":"+ll);
        if (this.applyingSelection){
            return;
        }
        this.changing = true;
        try {
            var s = this.selectionBinding()
            var r = s.readonly;
            var old=this.getSelection();
            s.readonly = false;
            if (v.length == 1) {
                s.set(v[0]);
            }
            else if (v.length == 0) {
                s.set(null);
            }
            else {
                s.set([].concat(v));
            }
            this._selection.readonly = r;
        } finally {
            this.changing = false;
            if (fireUp) {
                this.change();
            }
            else{
                this.pb.fireEvent({
                    kind: "change",
                    source: s,
                    target: this,
                    oldValue: old,
                    newValue: v,
                    subKind: "selection"
                });
            }
        }
    }

    containsWithProp(prop: string, value: any, exceptions: any[]): boolean {
        return this.workingCopy().filter(x => service.getValue(this.componentType(), x, prop) == value).filter(x => exceptions.indexOf(x)==-1).length > 0;
    }

    protected fireAdd(v: any) {
        this.fireEvent({kind: "add", target: this, oldValue: null, newValue: v, source: this.pb})
        this.change();
    }

    protected change() {
        if (this.changing) {
            return;
        }
        this.changing = true;
        try {
            if (!this.pb.get()) {
                this.pb.set(this.originalValue());
            }
            this.pb.changed();
        } finally {
            this.changing = false;
        }
    }

    protected applyChangesFromSelection() {
        this.fireEvent({
            kind: "selectionchange",
            target: this,
            oldValue: null,
            newValue: this.selectionBinding().get(),
            source: this.pb
        })
        this.applyingSelection=true;
        try {
            this.getSelection().forEach(x => {
                this.applyChangedElement(x);
            })
            this.postApplySelection();
        }finally {
            this.applyingSelection=false;
        }
    }

    protected applyChangedElement(x:any){
        let wcElement=this.getWCElement(x);

    }

    postApplySelection(){

    }
    protected getWCElement(x:any):any{
        return x;
    }

    protected fireRemove(v: any) {
        this.fireEvent({kind: "remove", target: this, oldValue: null, newValue: v, source: this.pb})
        if (this.isSelected(v)) {
            var newSelection = this.getSelection().filter(x => x != v);
            this.setSelection(newSelection);
        }
        this.change();
    }

    protected fireReplace(old: any, v: any) {
        this.fireEvent({kind: "change", target: this, oldValue: old, newValue: v, source: this.pb})
        this.change();
    }

    isSelected(v) {
        return this.existInValue(v, this.getSelection());
    }

    existInValue(v, r: any[]) {
        var plain = r.indexOf(v) != -1;
        if (plain) {
            return plain;
        }
        if (v instanceof HasType){
            v=v.$value;
        }
        //check for value with same key
        var keyProp = service.keyProp(this.componentType());
        if (v) {
            var has=false;
            r.forEach(x=>{
                if(x instanceof HasType){
                    if (x.$value==v){
                        has= true;
                    }
                }
            })
            if (has) {
                return has;
            }
            if (keyProp) {
                var vl = v[keyProp];
                if (vl) {
                    plain = plain || (r.filter(x => x[keyProp] === vl).length != 0);
                }
            }
            else{

            }
        }
        return plain;
    }

    protected isSame(oldValue: any, newValue: any) {
        return utils.isSame(oldValue, newValue);
    }
}


export class ArrayCollectionBinding extends AbstractCollectionBinding implements CollectionBinding {

    _value: any[];
    _tvalue:any[]
    _evalue:any[]
    _levels:number[];

    _componentType: any

    expand(v:any){
        this._evalue=null;
        this._levels=null;
        super.expand(v);
    }
    collapse(v:any){
        this._evalue=null;
        this._levels=null;
        super.collapse(v);
    }

    postApplySelection(){
        this.change();
    }
    levels(ac:any[]=this.workingCopy(),num=0):number[]{
        if (num==0){
            if(this._levels){
                return this._levels;
            }
            this._levels=super.levels(ac,num)
            return this._levels;
        }
        return super.levels(ac,num)
    }
    setGroupByProperty(property: string){
        this._tvalue=null;
        this._evalue=null;
        this._levels=null;
        super.setGroupByProperty(property);
    }

    setSelectionIndex(n:number){
       this.setSelection([this.value()[n]]);
    }

    value() {
        if (!this._value || this._value.length == 0) {
            if (this.pb) {
                this._value = this.pb.get();
            }
        }
        if (!this._value) {
            this._value = [];
        }
        else if (!Array.isArray(this._value)) {
            this._value = [];
        }
        if (this.pb instanceof ViewBinding){
            if (this._evalue){
                return this._evalue;
            }
            if (this._tvalue){
                this._evalue=this.expandValues(this._tvalue);
                return this._evalue;
            }
            this._tvalue= (this.postransform(this._value));
            this._evalue=this.expandValues(this._tvalue);
            return this._evalue;
        }
        return this._value;
    }



    originalValue() {
        return this.value();
    }

    workingCopy() {

        return this.value();
    }

    componentType() {
        return service.resolvedType(this._componentType);
    }
    refresh() {
        this._value=null;
        this._tvalue=null;
        this._evalue=null;
        this._levels=null;
        if (this.applyingSelection){
            return;
        }
        var newSelection=[];
        var oldSelection=this.getSelection();
        this.workingCopy().forEach(x=>{
            if (newSelection.length>=oldSelection.length){
                return;
            }
            if (oldSelection.indexOf(x)!=-1){
                newSelection.push(x);
            }
            else {
                //now we should look for same value of key property
                var kp = service.keyProp(this.componentType());
                if (kp) {
                    var vl = service.getValue(this.componentType(), x, kp, this.pb);
                    for (var i = 0; i < oldSelection.length; i++) {
                        var ov = service.getValue(this.componentType(), oldSelection[i], kp, this.pb);
                        if (ov == vl) {
                            newSelection.push(x);
                        }
                    }
                }
            }
        })
        var c=this.changing;
        this.changing=true;
        try {
            if (!this.applyingSelection) {
                var selection=this.getSelection();
                if (selection.length==0&&newSelection.length==0){
                    return;
                }
                this.setSelection(newSelection, false);
            }
        }finally {
            this.changing=c;
        }
    }


    contains(v: any) {
        if (this.value().indexOf(v) != -1) {
            return true;
        }
        return false;
    }


    constructor(p: Binding) {
        super(p);
        if (p.type().uniqueItems) {
            this._componentType = {
                uniqueValue: true,
                owningCollection: this,
                type: p.type().itemType
            };
        }
        else this._componentType = {
            owningCollection: this,
            type: p.type().itemType
        };
        if (!this._componentType.type.displayName && p.type().displayName) {
            this._componentType.displayName = ts.nicerName(pluralize.singular(p.type().displayName))
        }
    }


    add(v: any) {
        this.value().push(v);
        this.fireAdd(v);
    }

    remove(v: any) {
        var i = this.value().indexOf(v);
        if (i != -1) {
            this.value().splice(i, 1);
        }
        this.fireRemove(v);

    }

    replace(oldValue: any, newValue: any) {
        if (this.isSame(oldValue, newValue)) {
            return;
        }
        var i = this.value().indexOf(oldValue);
        if (i != -1) {
            this.value()[i] = newValue;
        }
        this.fireReplace(oldValue, newValue)
    }


}

export class MapCollectionBinding extends AbstractCollectionBinding implements CollectionBinding {

    value: any;
    _componentType: Type

    wcopy: any[]

    workingCopy() {
        if (this.wcopy) {
            return this.wcopy;
        }
        var res = this.buildWC();
        this.wcopy = res;
        return res;
    }

    private buildWC():any[] {
        var res = [];
        var sel=this.getSelection();
        if (this.value) {
            var num = 0;
            Object.keys(this.value).forEach(k => {
                var rs = deepCopy(this.value[k]);
                if (typeof rs == "object") {
                    rs.$key = k;
                    res.push(rs);
                    rs.$entryId = k;
                }
                else {
                    rs = {$key: k, $value: this.value[k]};
                    rs.$entryId = k;
                    res.push(rs)
                    console.log("New!!!")
                }
                num++;
            })
        }
        else {
            this.value = {};
        }
        res.forEach((x,i)=>{
            x.$position=i;
        })
        return res;
    }

    originalValue() {
        return this.value;
    }


    refresh() {
        if (this.applyingSelection){
            return;
        }
        this.value = this.pb.get();
        if (!this.value){
            this.value={}
        }
        this.wcopy=this.buildWC();
        var selectionKeys=this.getSelection().map(x=>x.$key);
        var newSelection=[];
        this.wcopy.forEach(x=>{
            if (selectionKeys.indexOf(x.$key)!=-1){
                newSelection.push(x);
            }
        })
        var c=this.changing;
        console.log("Refreshing working copy:"+this.pb.id()+":"+JSON.stringify(this.pb.value)+":"+this.pb.uid()+":"+JSON.stringify(this.wcopy));
        this.changing=true;
        try {
            if (!this.applyingSelection) {
                var selection=this.getSelection();
                if (selection.length==0&&newSelection.length==0){
                    return;
                }
                this.setSelection(newSelection, false);
            }
        }finally {
            this.changing=c;
        }
    }

    contains(v: any) {
        var key = v.$key;
        if (this.value) {
            if (Object.keys(this.value).indexOf(key) != -1) {
                return true;
            }
            return false;
        }
    }

    componentType() {
        return service.resolvedType(this._componentType);
    }

    applyChangedElement(e){
        console.log("Applying:"+JSON.stringify(e))

        // this.workingCopy().forEach(x=>{
        //     if (x.$key==e.$entryId){
        //         utils.apply(x,e);
        //         return;
        //     }
        // })
        this.replace({ $key:e.$entryId},e);
        if (e.$key) {
            e.$entryId = e.$key;
        }
    }
    constructor(p: Binding) {
        super(p);
        this.value = p.get();
        if (!this.value) {
            this.value = {};
            if (!p.parent() || !p.parent().get()) {
                p.set(this.value);
            }
        }
        this._componentType = p.type().componentType;
        var nn = "Name";
        var nd = "";
        var kn = (<metakeys.KeyName>p.type()).keyName;
        if (kn) {
            nn = kn;
        }
        var kd = (<metakeys.KeyName>p.type()).keyDescription;
        if (kd) {
            nd = kd;
        }
        var kt = types.TYPE_STRING;
        if (p.type().keyType) {
            kt = p.type().keyType;
        }
        var ts = {
            id: "",
            type: types.TYPE_OBJECT,

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
            keyProp: "$key",
            displayName: pluralize.singular(p.type().displayName)
        }
        if (service.isObject(this._componentType)) {
            ts.type = this._componentType;
        }
        else {
            var vn = this._componentType.displayName;
            ts.properties["$value"] = {
                type: this._componentType,
                required: true,
                displayName: vn
            }
        }
        this._componentType = ts;
    }

    add(v: any) {
        this.workingCopy();
        this.wcopy.push(v);
        if (!v.$key) {
            return;
        }
        var val = deepCopy(v);
        if (v.$value) {
            val = v.$value;
        }
        this.value[v.$key] = val;
        delete val["$key"];
        this.fireAdd(v);
    }

    remove(v: any) {
        if (v == null) {
            return;
        }
        this.workingCopy();
        this.wcopy = this.wcopy.filter(x => x !== v);
        if (!v.$key) {
            throw new Error("Removing object with no key")
        }
        delete this.value[v.$key];
        this.fireRemove(v);
    }

    setSelectionIndex(n:number){
        var vvv=this.workingCopy();
        this.setSelection([vvv[n]]);
    }
    replace(oldValue: any, newValue: any) {
        if (!oldValue.$key) {
            return;
        }
        if (!newValue.$key) {
            this.fireReplace(oldValue, newValue);
            return;
        }
        if (oldValue.$key!=newValue.$key&&this.value[newValue.$key]) { //
            this.fireReplace(oldValue, newValue);
            return;
        }

        delete this.value[oldValue.$key];

        var val = deepCopy(newValue);
        if (val.$value) {
            val = val.$value;
        }
        this.value[newValue.$key] = val;
        delete val["$key"];
        delete val["$entryId"];
        delete val["$position"];
        this.fireReplace(oldValue, newValue);
    }
}