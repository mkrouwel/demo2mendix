import * as ftp from "basic-ftp";
import { demo2mendix } from "./translator";

const config = require("../configs/config.json");
import logger from 'loglevel';
logger.setLevel(logger.levels.INFO);

main().catch(logger.error);

const valueTypeMapping = [
    { "name": "Year", "primitive": "integer" },
    { "name": "Day", "primitive": "datetime" },
    { "name": "Money", "primitive": "decimal" },
    { "name": "Number", "primitive": "integer" },
    { "name": "Boolean", "primitive": "boolean" },
    { "name": "Nationality", "primitive": "string", "values": "NL,EN" }
];

async function main() {
    checkFTP();
    setInterval(() => {
        checkFTP();
    }, 30 * 1000);
}

async function checkFTP() {
    logger.info('Starting new check');
    const client = new ftp.Client();

    await client.access({
        host: "localhost",
        user: "Anonymous",
        password: "1"
    });
    const files = await client.list();
    await client.ensureDir("processed");
    await client.cd('../');

    for (let f of files) {
        if (f.isFile && f.name.endsWith('json')) {
            const name = f.name.substring(0, f.name.length - 5);
            logger.info(`processing ${name}`);
            await client.downloadTo(`./temp/${f.name}`, f.name);
            const demomodel = require(`../temp/${f.name}`); // MK: not sure why I need a double dot here and a single one on the line before...
            const model = await demo2mendix(config.mendixtoken, name, name, demomodel, [], valueTypeMapping);
            logger.info(model.appURL);
            await client.rename(f.name, "processed/" + f.name);
        }
    }
    client.close();

    logger.info('Check completed');
}