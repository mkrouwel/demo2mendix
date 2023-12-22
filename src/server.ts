import express, { Request, Response } from 'express';
import logger from 'loglevel';
import { HttpClient, HttpCodes } from "typed-rest-client/HttpClient";
import { demo2mendix } from './translator';
import { valueTypeMapping } from './valuetypes';

logger.setLevel(logger.levels.INFO);
const config = require("../configs/config.json");

const port = 3000;

const app = express();

app.listen(port, () => {
    logger.info(`Server is running on port ${port}}. Go to http://localhost:${port}/`)
});

app.put('/demo', democallhandler);

async function democallhandler(req: Request, res: Response) {
    const client = new HttpClient(null);
    const filePath = req.body.path;
    if (filePath.startsWith("http")) {// includes https
        const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
        const response = await client.get(req.body.path, headers);

        if (response.message.statusCode != HttpCodes.OK) {
            throw Error(`Unexpected HTTP response: ${response.message.statusCode}`);
        }

        const fileName = filePath.substring(filePath.lastIndexOf("/") + 1, filePath.lastIndexOf(".") - 1);
        const model = await demo2mendix(config.mendixtoken, fileName, fileName, await response.readBody(), [], valueTypeMapping);
        logger.info(model.appURL);
    }
}