"use strict";
import types = require("../src/types");
import {metakeys} from "../src/types";
var chai = require("chai");
var assert = chai.assert;
import  mocha=require("mocha")
var point = {
    id: "Point",
    properties: {
        "x": types.TYPE_NUMBER,
        "y": types.TYPE_NUMBER,
    }
};
var NameAndPoint = {
    id: "NameAndPoint", properties: {
        name: types.TYPE_STRING,
        location: point
    }
};

var Node={
    id:"Node",
    properties:{
        label:types.TYPE_STRING
    },
    type:types.TYPE_OBJECT,
    children: "elements"

}
Node.properties["elements"]=types.array(Node);

var Node1={
    id:"Node",
    properties:{
        label:types.TYPE_STRING
    },
    type:types.TYPE_OBJECT,


}
Node1.properties["elements"]=types.array(Node);


var SimpleMap:types.MapType={
    id:"Map",
    type: types.TYPE_MAP,
    componentType: types.TYPE_STRING
}

var Points:types.MapType={
    id:"Map",
    type: types.TYPE_MAP,
    componentType: point
}

var Person: types.ObjectType&metakeys.Label={
    id:"Person",
    properties:{
        name: types.TYPE_STRING,
        lastName: types.TYPE_STRING
    },
    required:["name","lastName"],
    label:"${name} ${lastName}"
}

var Manager: types.ObjectType={
    id: "Manager",
    type: Person,
    properties:{
        manages:types.array(Person)
    }
}

var ManagerWithId: types.ObjectType&metakeys.VisibleProperties={
    id: "Manager",
    type: Manager,
    properties:{
        id: types.TYPE_NUMBER
    },
    hiddenProperties:["id"]
}

var company: types.ObjectType&metakeys.PropertyGroups={
    id:"Company",
    type: types.TYPE_OBJECT,
    properties:{
        name: types.TYPE_STRING,
        ceo: Manager,
        cto: Manager,
        people: types.array(Person),
        earnings: types.TYPE_NUMBER,
        spendings: types.TYPE_STRING,
        is_public: types.TYPE_BOOLEAN,
        has_shares: types.TYPE_BOOLEAN
    },
    required:["name","ceo","cto"],
    propertyGroups:{
        "Generic":["name","earnings","spendings"],
        "Management":["ceo","cto"],
        "People":["people"]
    }
}

describe("Simple bindings tests", function () {
    it("schema with reference, example is valid", function () {
        var c:any = {};
        var b = types.binding(c, point);
        b.binding("x").set(5);
        b.binding("y").set(2);
        assert(c.x == 5, "Binding sets");
        assert(c.y == 2, "Binding sets");
        assert(b.binding("x").get() == 5);
        assert(b.binding("x").type() == types.TYPE_NUMBER);
    });
    it("Nested binding", function () {
        var c:any = {};
        var b = types.binding(c, NameAndPoint);
        b.put("location.x",5);
        b.put("location.y",2);
        assert(c.location.x == 5, "Binding sets");
        assert(c.location.y == 2, "Binding sets");
        assert(b.binding("location.x").get() == 5);
        assert(b.binding("location.x").type() == types.TYPE_NUMBER);
    });

    it("Listening to changes", function () {
        var c:any = {};
        var b = types.binding(c, NameAndPoint);
        var ec=0;
        b.addListener({
            valueChanged(c:types.ChangeEvent){
                ec++;
            }
        })
        b.binding("location.x").set(5);
        b.binding("location.y").set(2);
        assert(ec==3,"3 changes expected")
        assert(b.get("location.x") == 5);
    });
    it("Map type", function () {
        var c:any = {};
        var b = types.binding(c, SimpleMap);
        var ec=0;
        b.binding("location").set("5");
        assert(b.get("location") == "5");
        assert(b.binding("location").type()==types.TYPE_STRING)
        assert(c.location="5");
    });
    it("Map type2", function () {
        var c:any = {};
        var b = types.binding(c, Points);
        var ec=0;
        b.binding("M1.x").set("5");
        b.binding("M1.y").set("6");
        assert(b.get("M1.$key")=="M1")
        b.binding("M1.$key").set("Moscow");
        assert(b.get("Moscow.y") == "6");
        assert(b.get("Moscow.$key") == "Moscow");
        //assert(b.binding("location").type()==types.TYPE_STRING)
        assert(c.Moscow!=null);
    });
    it("Map type3", function () {
        var c:any = {};
        var b = types.binding(c, Points);
        var ec=0;
        b.addListener({
            valueChanged(c:types.ChangeEvent){
                ec++;
            }
        })
        b.add({$key:"Moscow",x:4,y:3})
        assert(c.Moscow!=null);
        assert(c.Moscow.x==4);
        assert(ec==1)
    });
    it("Map type4", function () {
        var c:any = {};
        var b = types.binding(c, SimpleMap);
        var ec=0;
        b.addListener({
            valueChanged(c:types.ChangeEvent){
                ec++;
            }
        })
        b.add({$key:"Moscow",$value:"good"})
        assert(c.Moscow!=null);
        assert(c.Moscow=="good");
        assert(ec==1)
        b.replace({$key:"Moscow",$value:"good"},{$key:"Novosibirsk","$value":"Even better"})
        assert(c.Moscow==null);
        assert(c.Novosibirsk=="Even better");
        assert(ec==2)
    });
    it("resolved type", function () {
        var m:types.ObjectType&any=types.service.resolvedType(Manager);
        assert(m.properties.name!=null);
        assert(m.properties.lastName!=null);
    })
    it("required & visible properties", function () {
        var op=types.service.allProperties(Manager);
        op.forEach(x=>{
            if (x.id=="name"){
                assert(x.required);
            }
            else if (x.id=="lastName"){
                assert(x.required);
            }
            else{
                assert(!x.required)
            }
        })
        assert(op.length==3)
        var qp=types.service.visibleProperties(Manager);
        assert(qp.length==3)
        qp=types.service.visibleProperties(ManagerWithId);
        assert(qp.length==3)
    })
    it ("property groups",function () {
        var op=types.service.propertyGroups(company);
        assert(op.length==3);
    })
    it ("property groups1",function () {
        var op=types.service.propertyGroups(Manager);
        assert(op.length==2);
    })
    it ("property groups2",function () {
        var op=types.service.propertyGroups(ManagerWithId);
        assert(op.length==2);
    })
    it("label",function () {
        var man={name:"Denis",lastName:"Denisenko",manages:[{}]};
        var label=types.service.label(man,ManagerWithId);
        assert(label=="Denis Denisenko")
    })
    it("label 2",function () {
        var man={name:"Some company"};
        var label=types.service.label(man,company);
        assert(label=="Company: Some company")
    })
    it("children", function(){
        var q={"label":"A",elements:[{label:"B"},{label:"C"}]}
        var children=types.service.children(q,Node);
        assert(children.length==2)
    })
    it("children 2", function(){
        var q={"label":"A",elements:[{label:"B"},{label:"C"}]}
        var children=types.service.children(q,Node1);
        assert(children.length==2)
    })
});