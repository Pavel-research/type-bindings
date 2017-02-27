import tps=require("./types")
import ts=require("./typesService")
import {isNullOrUndefined} from "util";
import {Binding} from "./types";
export interface LayoutPart {
    image?: string
    text?: string
    link?: string
    align?: "left"|"right"
    type: "part"
    html?: boolean
    role?: string
    class?: string
    background?: string
    color?: string
}

export interface LayoutComprehension {
    parts: LayoutElement[]
    kind: "vc"|"hc"
    type: "comprehension"
    role?: string
}
export function interpolate(str: string, props: any, t: tps.Type) {
    return str.replace(/\${((\w|\.)+)\}/g, function (match, expr) {
        var rs = ts.resolver(expr, props, t);
        if (rs) {
            return tps.service.label(rs.value, rs.type);
        }
        return (props )[expr];
    });
}
export function calculateLabel(label2: string|((v: any) => string), v: any, t: tps.Type) {
    if (label2) {
        if (typeof label2 == "function") {
            return label2(v);
        }
        else {
            if (label2.indexOf("{") != -1) {
                return interpolate(label2, v, t);
            }
            else {
                var rs = v[label2];
                var ps = tps.service.property(t, label2);
                if (ps) {
                    return tps.service.label(rs, ps.type);
                }
                return rs;
            }
        }
    }

    if (v && typeof v == "object") {
        if (Array.isArray(v)) {
            var ll: any[] = v;
            var it = (<tps.ArrayType>t).itemType;
            return ll.map(x => tps.service.label(x, <tps.Type>it)).join(",");
        }
        if (v.$key) {
            return v.$key
        }
        if (v.name) {
            return tps.service.getValue(t, v, "name");
        }
        else if (v.title) {
            return tps.service.getValue(t, v, "title");
        }
        else if (v.label) {
            return tps.service.getValue(t, v, "label");
        }

        return t.displayName;
    }

    if (v) {
        return "" + v;
    }
    if (isNullOrUndefined(v)) {
        return "";
    }
    if (isNaN(v)) {
        return "";
    }
}
export function canJoin(t1: LayoutPart, t2: LayoutPart) {
    if (t1.image && t2.image) {
        return false;
    }
    if (t1.class||t1.background||t1.color||t1.align){
        return false;
    }
    if (t2.class||t2.background||t2.color||t2.align){
        return false;
    }
    return true;
}
export function join(t1: LayoutPart, t2: LayoutPart): LayoutPart {
    if (t2.text) {
        if (!t1.text) {
            t1.text = t2.text;
        }
        else{
            t1.text=t1.text+t2.text;
        }
        t1.html=t1.html||t2.html;
    }
    if (t2.image) {
        t1.image = t2.image;
    }

    return t1;
}
export function appendConditionally(target: LayoutElement, condition: string, element: LayoutElement, b: tps.IBinding,replace: boolean, direction: "hc"|"vc" = "hc"): LayoutElement {
    if (!element) {
        return target;
    }
    if (!target) {
        return element;
    }
    if (replace){
        return element;
    }
    if (condition) {
        if (!tps.calcCondition(condition, b)) {
            return target;
        }
    }

    if (target.type == "comprehension") {
        var ll: LayoutComprehension = target;
        if (ll.kind == direction) {
            ll.parts.push(element);
            return ll;
        }
    }
    if (target.type == "part" && element.type == "part") {
        if (canJoin(target, element)) {
            return join(target, element);
        }
    }
    var comprehension: LayoutComprehension = {
        type: "comprehension",
        parts: [],
        kind: direction
    }
    comprehension.parts.push(target);
    comprehension.parts.push(element);
    return comprehension;
}
export function icon(vl: string, v: any, t: tps.Type) {
    if (vl) {
        var re = ts.resolver(vl, v, t);
        if (re) {
            if (typeof re.value == "string") {
                return re.value;
            }
            return tps.service.icon(re.value, re.type);
        }
        if ((<tps.metakeys.Icon>t).defaultIcon) {
            return (<tps.metakeys.Icon>t).defaultIcon
        }
        return vl;
    }
}
export function calcVal(vl: string, v: any, t: tps.Type):string {
    if (vl) {
        var re = ts.resolver(vl, v, t);
        if (re) {
            return <string>re.value;
        }
        else{
            if (vl.indexOf('${')!=-1) {
                var ent = interpolate(vl, v, t);
                return ent;
            }
        }
        return vl;
    }
    return null;
}

export function textComprehension(condition: string, label: string, image: string, b: tps.Binding, alwaysLabel: boolean = true): LayoutPart {
    if (condition) {
        if (!tps.calcCondition(condition, b)) {
            return null;
        }
    }
    var result: LayoutPart = {type: "part"};
    if (label || alwaysLabel) {
        result.text = calculateLabel(label, b.get(), b.type());
    }
    if (image) {
        result.image = icon(image, b.get(), b.type());
    }
    if (!result.text && !result.image) {
        return null;
    }
    return result;
}
function update(t:LayoutPart,d:tps.metakeys.LabelDecorator,b:Binding):LayoutElement{
    if (!t){
        return null;
    }
    if (d.class){
        t.class=d.class;
    }
    if (d.background){
        t.background=calcVal(d.background,b.get(),b.type());
    }
    if (d.color){
        t.color=calcVal(d.color,b.get(),b.type());
    }
    if (d.align){
        t.align=d.align;
    }
    if (d.itemTransform){
        var fld=d.details;
        if (!fld){
            fld=d.title;
        }
        if (!fld){
            fld=d.status;
        }
        if (fld){
            var bnd=b.binding(fld);
            var val:any=b.get(fld);
            if (!val){
                val=[]
            }
            if (!Array.isArray(val)){
                val=[val];
            }
            var ct=tps.service.componentType(bnd.type());
            var parts=[];
            val.forEach(x=>{
                var z=new Binding("");
                z.value=x;
                z._type=ct;
                var layout=calculateLayout(z,d.itemTransform);
                parts.push(layout);
            })
            return {
                type:"comprehension",
                kind: "hc",
                parts: parts
            }
        }
    }
    return t;
}
export function calculateLayout(b: tps.Binding,decs?:tps.metakeys.LabelDecorator): LayoutElement {
    var t = b.type();

    var icon = (<tps.metakeys.Icon>t).icon;
    var label = (<tps.metakeys.Label>t).label;
    var html = (<tps.metakeys.Label>t).htmlLabel;
    var rs: LayoutElement = textComprehension(null, <string>label, icon, b);
    if (rs) {
        rs.html = true;
    }
    var decorators = (<tps.metakeys.Decorators>t).labelDecorators;
    if (decs){
        if (!decorators){
            decorators={}
        }
        else{
            var vd={};
            Object.keys(decorators).forEach(x=>{
                vd[x]=decorators[x];
            })
            decorators=vd;
        }
        decorators["main"]=decs;
    }
    var details: LayoutElement = null;
    var status = null;
    if (decorators) {
        Object.keys(decorators).forEach(x => {
                var comprehension:LayoutElement=null;
                var decorator = decorators[x];
                if (decorator.when) {
                    if (!tps.calcCondition(decorator.when, b)) {
                        return;
                    }
                }

                if (decorator.details) {
                    comprehension = textComprehension(null, decorator.details, decorator.image, b, false);
                    comprehension=update(comprehension,decorator,b);
                    if (comprehension) {
                        comprehension.role = "details";
                    }
                    if (!details) {
                        details = comprehension;
                    }
                    else {
                        details = appendConditionally(details, null, comprehension, b,decorator.replace);
                    }
                }
                if (decorator.status) {
                    comprehension = textComprehension(null, decorator.status, decorator.image, b, false);
                    if (comprehension) {
                        comprehension.role = "status";
                    }
                    comprehension=update(comprehension,decorator,b);
                    if (!status) {
                        status = comprehension;
                    }
                    else {
                        status = appendConditionally(details, null, comprehension, b,decorator.replace);
                    }
                }
                if (decorator.title) {
                    comprehension = textComprehension(null, decorator.title, decorator.image, b, false);
                    if (comprehension) {
                        comprehension.role = "title";
                    }
                    comprehension=update(comprehension,decorator,b);
                    rs = appendConditionally(rs, null, comprehension, b,decorator.replace);
                }
            }
            //
        );
    }
    if (status) {
        status.role = "status";
        status.align = "right";
        rs = {
            parts: [rs, status],
            type: "comprehension",
            kind: "hc"
        }
    }
    if (details) {
        details.role = "details";
        rs = {
            parts: [rs, details],
            type: "comprehension",
            kind: "vc"
        }
    }

    return rs;
}

export type LayoutElement= LayoutComprehension | LayoutPart


interface ResolvedDecorator {
    compute(v: any, context: tps.IBinding): LayoutElement
}

class DecoratorsManager {
    decorators: Map<tps.Type, ResolvedDecorator> = new Map();
}