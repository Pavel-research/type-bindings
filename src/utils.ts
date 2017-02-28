import types=require("./types")

export function hash(t:types.Type):string{
    var m=deepCopy(t);
    delete (<any>t).declaredAt;
    delete (<any>t).$original;
    return JSON.stringify(m);
}

declare var $: any

export function deepCopy(obj: any) {
    if (typeof obj=="object") {
        return JSON.parse(JSON.stringify(obj));
    }
    return obj;
}
export function isSame(oldValue:any,newValue:any){
    if (!oldValue){
        if (newValue){
            return false;
        }
    }
    if (newValue){
        if (!oldValue){
            return false;
        }
    }
    return oldValue==newValue||JSON.stringify(oldValue) == JSON.stringify(newValue);
}

export function apply(s:any,t:any){
    Object.keys(s).forEach(x=>{
        t[x]=s[x];
    })
}