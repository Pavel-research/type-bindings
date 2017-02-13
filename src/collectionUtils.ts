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
