import types=require("./types")



export class ObjectRecord{

    listeners: types.IValueListener[]=[]
}
export interface ISetObserver extends types.IValueListener{

    has(v:any):boolean
}
export class ObjectChangeManager{

    private map:Map<any,ObjectRecord>=new Map();
    private observers:ISetObserver[]=[]

    addListener(object:any,l:types.IValueListener){
        var record:ObjectRecord=this.entry(object);
        record.listeners.push(l);
    }
    removeListener(object:any,l:types.IValueListener){
        var record:ObjectRecord=this.entry(object);
        record.listeners=record.listeners.filter(x=>x!=object);
    }

    addSetObserver(object:any,l:types.IValueListener){
        this.observers.push(object);
    }
    removeSetObserver(object:any,l:types.IValueListener){
        var record:ObjectRecord=this.entry(object);
        this.observers=this.observers.filter(x=>x!=object);
    }

    fire(c:types.ChangeEvent){
        if (!c.target){
            return;
        }
        var tr=this.entry(c.target);
        tr.listeners.forEach(x=>x.valueChanged(c));
        this.observers.forEach(o=>{
            if (o.has(c)){
                o.valueChanged(c);
            }
        })
    }

    entry(obj:any):ObjectRecord{
        if (this.map.has(obj)){
            return this.map.get(obj);
        }
        let result=new ObjectRecord();
        if (typeof obj=="object") {
            this.map.set(obj, result);
        }
        return result;
    }
}

export const INSTANCE=new ObjectChangeManager();