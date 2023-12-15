const config = require("../configs/config.json");
//import config from "../configs/config.json" assert { type: "json" };
const descriptor = require("../inputfiles/shdescriptor.json")
//import descriptor from assert { type: "json" };
import { demo2mendix } from "./translator.js";

const demomodel = require(`../inputfiles/${descriptor.demomodel}.json`);//, { assert: { type: 'json' } })).default ;
console.log(demomodel);

demo2mendix(config.mendixtoken, descriptor.appname, descriptor.defaultmodule, descriptor.demomodel, descriptor.oivs, descriptor.valuetypemapping);