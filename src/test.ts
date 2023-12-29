const config = require("../configs/config.json");
//import config from "../configs/config.json" assert { type: "json" };
const model = require("../temp/nee.json")
//import descriptor from assert { type: "json" };
import { demo2mendix } from "./translator.js";

import logger from 'loglevel';
import { valueTypeMapping } from "./valuetypes.js";
logger.setLevel(logger.levels.INFO);

//const demomodel = require(`../inputfiles/${descriptor.demomodel}.json`);//, { assert: { type: 'json' } })).default ;
//logger.info(model.model);

main().catch(logger.error);

async function main() {
    const app = await demo2mendix(config.mendixtoken, model.appname, model.appname, model.model, [], valueTypeMapping);
    logger.info(app.appId);
    process.exit();
}