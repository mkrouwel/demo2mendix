import * as ftp from "basic-ftp";
import { demo2mendix } from "./translator";

const config = require("../configs/config.json");
import logger from 'loglevel';
import { FTPChecker } from "./ftpchecker";
logger.setLevel(logger.levels.INFO);

main().catch(logger.error);

async function main() {
    await (new FTPChecker(processFile, { host: "localhost", user: "Anonymous", password: "1" })).start();
}

const valueTypeMapping = [
    { "name": "Year", "primitive": "integer" },
    { "name": "Day", "primitive": "datetime" },
    { "name": "Money", "primitive": "decimal" },
    { "name": "Number", "primitive": "integer" },
    { "name": "Boolean", "primitive": "boolean" },
    { "name": "Nationality", "primitive": "string", "values": "NL,EN" }
];

async function processFile(filename: string, client: ftp.Client) {
    if (filename.endsWith('json')) {
        const name = filename.substring(0, filename.length - 5);
        logger.info(`processing ${name}`);
        await client.downloadTo(`./temp/${filename}`, filename);
        const demomodel = require(`../temp/${filename}`); // MK: not sure why I need a double dot here and a single one on the line before...
        const model = await demo2mendix(config.mendixtoken, name, name, demomodel, [], valueTypeMapping);
        logger.info(model.appURL);
        //TODO: delete temp file
    }
}