import tps=require("./types")


export function sort(vl:any[],t:tps.Type, property:string,asc:boolean):any[]{
    var pr=tps.service.property(t,property);
    if (pr) {
        var rst = tps.service.resolvedType(pr.type);
        var res = vl.sort((x1, x2) => {
            var vl1 = tps.service.getValueWithProp(t, x1, pr);
            var vl2 = tps.service.getValueWithProp(t, x2, pr);
            return tps.service.compare(vl1, vl2,rst);
        })
        if (!asc) {
            res = res.reverse();
        }
        return res;
    }
    return vl;
}
export class FilteredCollection {

    base:any[];
    filtered:any[]

    filters:{ [id:string]:any}={};
    filterDescriptions:{ [id:string]:tps.metakeys.FilterDescription}={}
    filterTypes:{ [id:string]:tps.Type}={}
    type:tps.Type
    setBase(base:any[],t:tps.Type){
        this.base=base;
        this.type=t;
        this.updateFiltered();
    }
    set(t:tps.metakeys.Filter&tps.Type,v:any){
        if (v){
            if (Array.isArray(v)){
                if (v.length==0){
                    v=null;
                }
                else if (v.length==1){
                    v=v[0];
                }
            }
        }
        if (!v){
            delete this.filters[t.id]
            this.updateFiltered();
            return;
        }
        this.filters[t.id]=v;
        this.filterDescriptions[t.id]=t.filter;
        this.filterTypes[t.id]=t;
        this.updateFiltered();
    }

    get(){
        return this.filtered;
    }

    updated(v:any){
        if (!this.isFiltered(v)){
            this.filtered=this.filtered.filter(z=>z!=v);
        }
        else{
            if (this.base.indexOf(v)!=-1){
                if (this.filtered.indexOf(v)==-1){
                    this.filtered.push(v);
                }
            }
        }
    }

    updateFiltered(){
        this.filtered=this.base;
        Object.keys(this.filterDescriptions).forEach(x=>{
            if (this.filters[x]){
                this.filtered=filter(this.filtered,this.filters[x],this.type,this.filterDescriptions[x]);
            }
        })
    }
    isFiltered(v:any){
        var filtered=true;
        Object.keys(this.filterDescriptions).forEach(x=>{
            if (this.filters[x]){
                filtered=filtered&&isFiltered(this.filtered,this.filters[x],this.type,this.filterDescriptions[x]);
            }
        })
        return filtered;
    }

}
export function isFiltered(x:any,filterVal:any,t:tps.Type,d:tps.metakeys.FilterDescription):boolean{
    var bnd=tps.binding(null,t);
    var filterOp=d.op;
    if (!filterOp){
        filterOp="eq";
    }
    bnd.value=x;
    var vl=tps.calcExpression(d.property,bnd);
    if (filterOp=="eq"){
        var rs= vl==filterVal;
        if (!rs&&Array.isArray(vl)){
            rs=vl.indexOf(filterVal)!=-1;
            if (!rs) {
                if (Array.isArray(filterVal)) {
                    var mm=true;
                    filterVal.forEach(y=>{
                        mm=mm&&vl.indexOf(y)!=-1;
                    })
                    rs=mm;
                }
            }
        }
        else if (!rs&&Array.isArray(filterVal)) {
            var mm=true;
            filterVal.forEach(y=>{
                mm=mm&&vl.indexOf(y)!=-1;
            })
            rs=mm;
        }
        return rs;
    }
    if (filterOp=="neq"){
        var rs= vl==filterVal;
        if (!rs&&Array.isArray(vl)){
            rs=vl.indexOf(filterVal)!=-1;
        }
        return !rs;
    }
    var pr=bnd.binding(d.property);
    if (filterOp=="gt"){
        return tps.service.compare(vl,filterVal,pr.type())>0;
    }
    if (filterOp=="lt"){
        return tps.service.compare(vl,filterVal,pr.type())<0;
    }
    if (filterOp=="ge"){
        return tps.service.compare(vl,filterVal,pr.type())>=0;
    }
    if (filterOp=="le"){
        return tps.service.compare(vl,filterVal,pr.type())<=0;
    }
    return false;
}

export function filter(vl:any[],filterVal:any,t:tps.Type,d:tps.metakeys.FilterDescription):any[]{
    if (d.property){
        return vl.filter(x=>isFiltered(x,filterVal,t,d))
    }
    else{
        return vl;
    }
}
