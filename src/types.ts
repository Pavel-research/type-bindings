export type TypeReference=Type|string
export import metakeys=require("./metaKeys")
export import ts=require("./typesService")
export import service=ts.INSTANCE;
export interface Type{
    type?: (Type|string)[] | (Type|string)
    id: string
    displayName?: string
}

export interface StringType extends Type{
    pattern?: string
    minLength?:string
    maxLength?: string
}
export interface Property{
    required?:boolean
    id: string
    type: Type
    declaredAt:Type
    groupId: string
}
export interface ObjectType extends Type{
    properties?:{[name:string]:TypeReference}
    required?:string[]
}

export interface MapType extends Type{
    keyType?: TypeReference
    componentType?: TypeReference
}

export interface UnionType extends Type{
    options:TypeReference[]
}

export interface ArrayType extends Type{
    itemType?: TypeReference
    uniqueItems?: boolean
}
export const TYPE_ANY:MapType={id:"any"}
export const TYPE_SCALAR:Type={id:"scalar",type:TYPE_ANY}
export const TYPE_STRING:StringType={id:"string",type: TYPE_SCALAR}
export const TYPE_NUMBER:Type={id:"number",type: TYPE_SCALAR}
export const TYPE_BOOLEAN:Type={id:"boolean",type: TYPE_SCALAR}
export const TYPE_NULL:Type={id:"null",type: TYPE_SCALAR}
export const TYPE_OBJECT:ObjectType={id:"object"}
export const TYPE_ARRAY:ArrayType={id:"array"}
export const TYPE_MAP:MapType={id:"map"}

export function array(t:Type):ArrayType{
    return {
        id:t.id+"[]",
        type:TYPE_ARRAY,
        itemType:t
    }
}
export function map(t:Type):MapType{
    return {
        id:t.id+"*",
        type:TYPE_MAP,
        componentType:t,
        keyType: TYPE_STRING
    }
}

export interface ChangeEvent{
    kind:string
    source:IBinding
    target:any
    oldValue:any
    newValue:any
}

export interface IValueListener{
    valueChanged(e:ChangeEvent);
}

export interface IBinding {
    get(): any
    set(v: any)
    path():string
    id(): string
    type():Type
    binding(p:string):IBinding
    parent():IBinding
    root():IBinding
    addListener(v:IValueListener)
    removeListener(v:IValueListener)

    add(v:any):any
    remove(v:any):any
    replace(old:any,newV:any):any

}

export interface CollectionBinding{
    add(v:any);
    remove(v:any);
    replace(oldValue:any,newValue:any);
    componentType():Type;
    workingCopy():any[]
}


export abstract class AbstractBinding implements IBinding{
    listeners:IValueListener[]=[]
    _parent:Binding;
    _type:any
    protected _bnds:{ [name:string]:Binding}={}

    path():string{
        if (this.parent()){
            return this.parent().path()+"."+this.id();
        }
        return this.id();
    }

    protected fireEvent(c:ChangeEvent){
        this.listeners.forEach(x=>x.valueChanged(c));
        if (this._parent){
            this._parent.fireEvent(c);
        }
    }
    type(){
        if (this._type){
            return this._type;
        }
        return TYPE_ANY;
    }
    protected abstract createCollectionBinding():CollectionBinding;

    add(v:any){
        this.createCollectionBinding().add(v);
    }
    remove(v:any){
        this.createCollectionBinding().remove(v);
    }
    replace(oldValue:any,newValue:any){
        this.createCollectionBinding().replace(oldValue,newValue);
    }

    abstract get():any
    abstract set(v:any)

    abstract id():string

    binding(p:string):IBinding{
        return null;
    }

    parent(){
        return this._parent;
    }

    root(){
        if (this.parent()){
            return this.parent().root();
        }
        return <IBinding><any>this;
    }

    addListener(v:IValueListener){
        this.listeners.push(v);
    }
    removeListener(v:IValueListener){
        this.listeners=this.listeners.filter(x=>x!=v);
    }

    innerBnds(){
        return this._bnds;
    }
}

class KeyBinding extends AbstractBinding implements IBinding{

    createCollectionBinding():CollectionBinding{
        throw new Error("Key binding can not be viewed as collection")
    }


    get(): any{
        var res=null;
        Object.keys(this._parent._parent.value).forEach(k=>{
            if (this._parent._parent.value[k]===this._parent.value){
                res=k;
            }
        })
        return res;
     }
    set(v: any){
        var res=null;
        Object.keys(this._parent._parent.value).forEach(k=>{
            if (this._parent._parent.value[k]===this._parent.value){
                res=k;
            }
        })
        var ev:ChangeEvent={kind:"change",source:this,oldValue:res,newValue:v,target:this._parent?this._parent.get():null};
        if (res){
            delete this._parent._parent.value[res];
            this._parent._parent.value[v]=this._parent.value;
        }
        delete this._parent._parent.innerBnds()[res]
        this._parent.id=v;
        this._parent._parent.innerBnds()[v]=this._parent;
        this.fireEvent(ev);
        return res;
    }

    id(){
        return "$key";
    }

    constructor(p:Binding){
        super();
        this._parent=p;
        this._type=TYPE_STRING;
    }


    binding(p:string):IBinding{
        return null;
    }
}

export abstract class AbstractCollectionBinding{

    constructor(protected pb:Binding){

    }

    protected onChanged(){
        this.pb.changed();
    }
}


class ArrayCollectionBinding extends AbstractCollectionBinding implements CollectionBinding{

    value:any[];
    _componentType:any

    workingCopy(){
        return this.value;
    }

    componentType(){
        return this._componentType;
    }

    constructor(p:Binding){
        super(p);
        this.value=p.get();
        if (!Array.isArray(this.value)){
            this.value=[];
        }
        this._componentType=p.type().itemType;
    }



    add(v:any){
        this.value.push(v);
        this.pb.changed();
    }
    remove(v:any){
        var i=this.value.indexOf(v);
        if (i!=-1){
            this.value.slice(i,1);
        }
        this.pb.changed();
    }
    replace(oldValue:any,newValue:any){
        var i=this.value.indexOf(oldValue);
        if (i!=-1){
            this.value[i]=newValue;
        }
        this.pb.changed();
    }
}
declare var $: any

export function deepCopy(obj: any) {
    var newObj = $.extend(true, {}, obj);
    return newObj;
}
export class MapCollectionBinding extends AbstractCollectionBinding implements CollectionBinding{

    value:any;
    _componentType:Type

    workingCopy(){
        var res=[];
        Object.keys(this.value).forEach(k=>{
            var rs=deepCopy(this.value[k]);
            if (typeof rs=="object"){
                rs.$key=k;
                res.push(rs);
            }
            else{
                res.push({$key:k,$value:this.value[k]})
            }
        })
        return res;
    }

    componentType(){
        return this._componentType;
    }
    constructor(p:Binding){
        super(p);
        this.value=p.get();
        if (!this.value){
            this.value={};
        }
        this._componentType=p.type().componentType;
    }
    add(v:any){
        if (!v.$key){
            throw new Error("Adding object with no key")
        }
        var val=v;
        if (v.$value){
            val=v.$value;
        }
        this.value[v.$key]=val;
        delete v["$key"];
        this.pb.changed();
    }

    remove(v:any){
        if (!v.$key){
            throw new Error("Removing object with no key")
        }
        delete this.value[v.$key];
        this.pb.changed();
    }
    replace(oldValue:any,newValue:any){
        if (!newValue.$key){
            throw new Error("Adding object with no key")
        }
        if (!oldValue.$key){
            throw new Error("removing object with no key")
        }
        delete this.value[oldValue.$key];
        this.add(newValue);
    }
}



export class Binding extends AbstractBinding implements IBinding{

    _parent:Binding;
    value:any;
    _id: string

    get(p?:string){
        if (p){
            return this.binding(p).get();
        }
        return this.value;
    }

    createCollectionBinding():CollectionBinding{
        if (this.type().componentType){
            return new MapCollectionBinding(this);
        }
        if (this.type().itemType){
            return new ArrayCollectionBinding(this);
        }
        throw new Error("Collection bindings may be only used with map or array types");
    }

    set(v:any){
        var c=this.value;
        var ev:ChangeEvent={kind:"change",source:this,oldValue:c,newValue:v,target:this._parent?this._parent.get():null};
        if (this._parent&&this.id){
            var s=this._parent.get();
            if (!s){
                s={};
                this._parent.set(s);
            }
            s[this._id]=v;
        }

        this.value=v;
        this.refreshChildren();
        this.fireEvent(c);
    }

    public changed(){
        var ev:ChangeEvent={kind:"change",source:this,oldValue:this.value,newValue:this.value,target:this._parent?this._parent.get():null};
        this.refreshChildren();
        this.fireEvent(ev);
    }


    private refreshChildren() {
        Object.keys(this._bnds).forEach(k => {
            this._bnds[k].refresh();
        })
    }

    refresh(){
        if (this._parent&&this.id){
            var vl=this._parent.get();
            if (vl){
                this.value=vl[this._id];
            }
        }
        this.refreshChildren();
    }

    constructor(n:string){
        super();
        this._id=n;
    }
    id(){
        return this._id;
    }


    localBinding(name:string):AbstractBinding{
        if (name=="$key"){
            if (this.parent()&&this.parent()._type.componentType){
                var kb=new KeyBinding(this);
                return kb;
                //this is actually a parent key binding;
            }
        }
        if (this._bnds[name]){
            return this._bnds[name];
        }
        else{
            var b=new Binding(name);
            b._parent=this;
            if (this.value) {
                b.value = this.value[name];
            }
            b._id=name;
            if ((<ObjectType>this._type).properties){
                b._type=(<ObjectType>this._type).properties[name];
            }
            else if ((<MapType>this._type).componentType){
                b._type=(<MapType>this._type).componentType;
            }
            this._bnds[name]=b;
            return b;
        }
    }

    binding(p:string):IBinding{
        var id=p.indexOf('.');
        if (id!=-1){
            var name=p.substring(0,id);
            var l=this.localBinding(name);
            return l.binding(p.substring(id+1));
        }
        return this.localBinding(p);
    }
    put(id:string,v:any){
        this.binding(id).set(v);
    }
}

export function binding(v:any,t:Type):Binding{
    var rs=new Binding(t.id);
    rs.value=v;
    rs._type=t;
    return rs;
}