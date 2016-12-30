export class TypeManager{}
export type TypeReference=Type|string

export interface Type{
    type?: (Type|string)[]
    id: string
    displayName?: string
}

export interface StringType extends Type{
    pattern?: string
    minLength?:string
    maxLength?: string
}

export interface ObjectType extends Type{
    properties?:{[name:string]:TypeReference}
}

export interface MapType extends Type{
    keyType?: TypeReference
    componentType?: TypeReference
}

export interface ArrayType extends Type{
    itemType?: TypeReference
    uniqueItems?: boolean
}
export const TYPE_ANY:MapType={id:"any"}
export const TYPE_STRING:StringType={id:"string"}
export const TYPE_NUMBER:Type={id:"number"}
export const TYPE_BOOLEAN:Type={id:"boolean"}
export const TYPE_NULL:Type={id:"null"}
export const TYPE_OBJECT:ObjectType={id:"object"}
export const TYPE_ARRAY:ArrayType={id:"array"}
export const TYPE_MAP:MapType={id:"map"}

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
    type():Type
    binding(p:string):IBinding
    parent():IBinding
    root():IBinding
    addListener(v:IValueListener)
    removeListener(v:IValueListener)
}

class Binding implements IBinding{

    _type:any;
    _parent:Binding;
    value:any;
    id: string
    listeners:IValueListener[]=[]
    addListener(v:IValueListener){
        this.listeners.push(v);
    }
    removeListener(v:IValueListener){
        this.listeners=this.listeners.filter(x=>x!=v);
    }

    type(){
        if (this._type){
            return this._type;
        }
        return TYPE_ANY;
    }

    get(){
        return this.value;
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
            s[this.id]=v;
        }

        this.value=v;
        this.refreshChildren();
        this.fireEvent(c);

    }
    protected fireEvent(c:ChangeEvent){
        this.listeners.forEach(x=>x.valueChanged(c));
        if (this._parent){
            this._parent.fireEvent(c);
        }
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
                this.value=vl[this.id];
            }
        }
        this.refreshChildren();
    }

    parent(){
        return this._parent;
    }

    root(){
        if (this.parent()){
            return this.parent().root();
        }
        return <IBinding>this;
    }
    constructor(n:string){
        this.id=n;
    }
    private _bnds:{ [name:string]:Binding}={}

    localBinding(name:string):Binding{
        if (this._bnds[name]){
            return this._bnds[name];
        }
        else{
            var b=new Binding(name);
            b._parent=this;
            if (this.value) {
                b.value = this.value[name];
            }
            b.id=name;
            if ((<ObjectType>this._type).properties){
                b._type=(<ObjectType>this._type).properties[name];
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
}

export function binding(v:any,t:Type):IBinding{
    var rs=new Binding(t.id);
    rs.value=v;
    rs._type=t;
    return rs;
}