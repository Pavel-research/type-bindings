/// <reference path="../typings/index.d.ts" />
import types=require("../dist/types")
import mocha=require("mocha")
import chai = require("chai");
import assert = chai.assert;

describe("JSON Schemas testing",function() {
    it("schema with reference, example is valid", function () {
        var tp = ps.parseJSON("SomeType", {
            type: '{"$schema":"http://json-schema.org/draft-04/schema","type":"object","properties":{"parentName":{"type":"string"},"child":{"$ref":"./content/jsonschemetest/test1/scheme.json#"}}}'
        });

        assert.isTrue(tp.validate({parentName:"someName",child:{childName:"anotherName"}}).isOk());
    });
    it("schema with reference, example is invalid", function () {
        var tp = ps.parseJSON("SomeType", {
            type: '{"$schema":"http://json-schema.org/draft-04/schema","type":"object","properties":{"parentName":{"type":"string"},"child":{"$ref":"./content/jsonschemetest/test1/scheme.json#"}}}'
        });

        assert.isTrue(!tp.validate({parentName:"someName",child:{childName1:"anotherName"}}).isOk());
    });
})