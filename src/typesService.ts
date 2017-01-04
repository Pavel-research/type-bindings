/**
 * Created by Pavel on 02.01.2017.
 */
import types=require("./types")
import metakeys=require("./metaKeys")
function apply(t: types.Type, s: types.Type) {
    Object.keys(s).forEach(k => {
        if (k == "properties") {
            if (!t[k]) {
                t[k] = s[k];
            }
            else {
                var props = s[k];
                Object.keys(props).forEach(p => {
                    t[k][p] = props[p];
                })
            }
            return;
        }
        if (k == "type") {
            return;
        }
        else {
            t[k] = s[k];
        }
    })
}

const GENERIC_GROUP="Generic";
const ADVANCED_GROUP="Advanced";
const OTHER_GROUP="Other";

function interpolate(str:string,props:any) {
    return str.replace(/\${(\w+)\}/g, function(match, expr) {
        return (props )[expr];
    });
}
function setupGroups(ps:types.Property[],t:types.Type){
    if (!ps){
        return;
    }
    var allProperties:Map<string,types.Property>=new Map();
    if ((<metakeys.PropertyGroups>t).propertyGroups){
        var pc=(<metakeys.PropertyGroups>t).propertyGroups;
        Object.keys(pc).forEach(x=>{
            pc[x].forEach(y=>{
                ps.forEach(p=>{
                    if (p.id==y){
                        p.groupId=x;
                    }
                })

            })
        })
    }
    ps.forEach(x=> {
            if (x.required&&INSTANCE.isScalar(x.type)){
                x.groupId=GENERIC_GROUP
                return;
            }

            if (!x.groupId) {
                allProperties.set(x.id, x)
            }
        }
    );
    var it=allProperties.keys()
    while (true){
        var v=it.next()
        if (v.done){
            return;
        }
        var val=v.value
        var q=allProperties.get(val);
        if (INSTANCE.isScalar(q.type)){
            q.groupId=GENERIC_GROUP;
        }
        else if (INSTANCE.isArray(q.type)){
            q.groupId=q.id;
        }
        else if (INSTANCE.isObject(q.type)){
            q.groupId=q.id;
        }
        else if (INSTANCE.isMap(q.type)){
            q.groupId=q.id;
        }
    }
}
export interface IPropertyGroup{
    id: string,
    caption: string,
    properties: types.Property[]
}
export class TypeService {

    protected instanceMap: WeakMap<any,types.Type> = new WeakMap();

    protected typeMap: Map<types.Type,types.Type> = new Map();

    protected typeByName: Map<string,types.Type> = new Map();

    isScalar(t:types.Type){
        return this.isSubtypeOf(t,types.TYPE_SCALAR);
    }
    isNumber(t:types.Type){
        return this.isSubtypeOf(t,types.TYPE_NUMBER);
    }
    isString(t:types.Type){
        return this.isSubtypeOf(t,types.TYPE_STRING);
    }
    isArray(t:types.Type){
        return this.isSubtypeOf(t,types.TYPE_ARRAY);
    }
    isBoolean(t:types.Type){
        return this.isSubtypeOf(t,types.TYPE_BOOLEAN);
    }
    isMap(t:types.Type){
        return this.isSubtypeOf(t,types.TYPE_MAP);
    }
    isObject(t:types.Type){
        return this.isSubtypeOf(t,types.TYPE_OBJECT);
    }

    isSubtypeOf(t:types.Type,superT:types.Type){
        if (t==superT){
            return true;
        }
        var st=this.superTypes(t);
        for (var i=0;i<st.length;i++){
            if (this.isSubtypeOf(st[i],superT)){
                return true;
            }
        }
    }


    register(t: types.Type) {
        if (t.id) {
            if (this.typeByName.has(t.id)) {
                if (this.typeByName.get(t.id) === t) {
                    return;
                }
                throw new Error("Type with this id already exists");
            }
            this.typeByName.set(t.id, t);
        }
    }

    resolveTypeByName(name: string): types.Type {
        if (this.typeByName.has(name)) {
            return this.typeByName.get(name);
        }
        return types.TYPE_ANY;
    }

    superTypes(t: types.Type): types.Type[] {
        var rt = this.resolvedType(t);
        if (!rt.type) {
            return [];
        }
        return <types.Type[]>this.resolvedType(t).type;
    }

    label(v:any,t:types.Type):string{
        var m:metakeys.Label=<any>this.resolvedType(t);
        if (m.label){
            if (typeof m.label=="function"){
                return m.label(v);
            }
            else{
                if (m.label.indexOf("{")!=-1){
                    return interpolate(m.label,v);
                }
                else{
                    return v[m.label];
                }
            }
        }
        if (v.name){
            return t.displayName+": "+v.name;
        }
        else if (v.title){
            return t.displayName+": "+v.title;
        }
        else if (v.label){
            return t.displayName+": "+v.label;
        }
        return t.displayName;
    }

    children(v:any,t:types.Type):any[]{
        var m:metakeys.TreeProp=<any>this.resolvedType(t);
        if (m.children){
            var ch=m.children;
            if (typeof ch=="string"){
                if (v[ch]){
                    return v[ch];
                }
                return [];
            }
            else{
                var res=[];
                ch.forEach(x=>{
                    if (v[x]){
                        res=res.concat(v[x]);
                    }

                })
                return res;
            }
        }
        else{
            var res=[];
            this.visibleProperties(t).forEach(x=>{
                if (this.isArray(x.type)){
                    var at=<types.ArrayType>x.type;
                    if (this.isObject(<types.Type>at.itemType)){
                        var q=x.id;
                        if (v[q]){
                            res=res.concat(v[q]);
                        }
                    }
                }
                if (this.isMap(x.type)){
                    var mt=<types.MapType>x.type;
                    if (this.isObject(<types.Type>mt.componentType)){
                        var q=x.id;
                        if (v[q]){
                            res=res.concat(v[q]);
                        }
                    }
                }
            })
            return res;
        }
    }

    visibleProperties(t: types.ObjectType&metakeys.VisibleProperties): types.Property[] {
        if (t.visibleProperties) {
            return this.allProperties(t).filter(x => {
                t.visibleProperties.indexOf(x.id) != -1
            });
        }
        var result: types.Property[] = [];
        var pn: {[name: string]: types.Property} = {}
        this.superTypes(t).forEach(x => {
            var nn = this.visibleProperties(x);
            nn.forEach(v => {
                pn[v.id] = v;
            })
        })
        this.properties(t, pn);
        Object.keys(pn).forEach(x => {
            if (t.hiddenProperties){
                if (t.hiddenProperties.indexOf(x)!=-1){
                    return;
                }
            }
            result.push(pn[x]);
        })

        return result;
    }

    allProperties(t: types.Type): types.Property[] {
        var rt = t;
        var pn: {[name: string]: types.Property} = {}
        this.superTypes(t).forEach(x => {
            var nn = this.allProperties(x);
            nn.forEach(v => {
                pn[v.id] = v;
            })
        })
        var result = this.properties(t, pn);
        return result;
    }
    propertyGroups(t:types.Type):IPropertyGroup[]{
        var mm:{ [name:string]:types.Property[]}={}
        var res:IPropertyGroup[]=[];
        this.visibleProperties(t).forEach(p=>{
            var q=mm[p.groupId];
            if (!q){
                q=[];
                mm[p.groupId]=q;
            }
            q.push(p);
        })
        Object.keys(mm).filter(k=>{
            res.push({
                id:k,
                caption:k,
                properties:mm[k]
            })
        })
        return res;
    }

    public properties(t: types.Type, pn: {[p: string]: types.Property}={}) {
        var ot = <types.ObjectType>t;
        if (ot.properties) {
            Object.keys(ot.properties).forEach(p => {
                var ty = ot.properties[p];
                var rt: types.Type = null;
                if (typeof ty == "string") {
                    rt = this.resolveTypeByName(ty);
                }
                else {
                    rt = <types.Type>ty;
                }
                var gid=null
                pn[p] = {
                    id: p,
                    type: rt,
                    declaredAt:ot,
                    groupId:gid,
                    required: (<any>rt).requiredProperty ? true : false
                }
            })
        }
        if (ot.required) {
            Object.keys(pn).forEach(x => {
                pn[x].required = ot.required.indexOf(x) != -1;
            })
        }
        var result: types.Property[] = [];
        Object.keys(pn).forEach(x => {

            result.push(pn[x])

        })
        setupGroups(result,t)
        return result;
    }

    resolvedType(t: types.Type&{$resolved?: boolean}): types.Type {
        if (t == types.TYPE_ANY) {
            return t;
        }
        if (t.$resolved) {
            return t;
        }
        if (this.typeMap.has(t)) {
            return this.typeMap.get(t);
        }
        var mm: types.Type&any = {};

        //normalize types
        if (t.type) {
            if (!Array.isArray(t.type)) {
                mm.type = [t.type];
            }
            else {
                mm.type = t.type;
            }
        }
        else {
            mm.type = [types.TYPE_ANY];
        }
        mm.type.forEach(t => {
            var rt = types.TYPE_ANY;
            if (typeof t == "string") {
                rt = this.resolvedType(this.resolveTypeByName(<string>t));
            }
            else {
                rt = this.resolvedType(t);
            }
            apply(mm, rt);
        })
        apply(mm, t);
        mm.$resolved = true;
        if (!t.displayName){
            t.displayName=t.id
        }
        Object.freeze(mm);
        this.typeMap.set(t, mm);

        //now we should collapse super types;
        return <types.Type>mm;
    }

    typeOf(v: any) {
        if (this.instanceMap.has(v)) {
            return this.instanceMap.get(v);
        }
    }

    newInstance(t: types.Type): any {

    }
}

export const INSTANCE = new TypeService();
