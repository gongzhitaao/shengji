var assert = require("assert");
var util = require("util");
var validator = require("./validator.js")();

console.log(util.inspect(validator.init(["3h"], "2", "club"), true, 10));
