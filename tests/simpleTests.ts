"use strict";
import types = require("../src/types");
var chai = require("chai");
var assert = chai.assert;
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
});