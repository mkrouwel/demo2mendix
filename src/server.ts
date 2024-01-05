import express, { Request, Response } from 'express';
import logger from 'loglevel';
import { HttpClient, HttpCodes } from "typed-rest-client/HttpClient";
import { demo2mendix } from './translator';
import { Model } from './model';
import { valueTypeMapping } from './valuetypes';

logger.setLevel(logger.levels.INFO);
const config = require("../configs/config.json");
const callbackBaseURI = 'http://localhost:8080/rest/tscallbackservice/v1/mxappready/'

const port = 8000;

let busy = false;

const app = express();
app.use(express.json({ strict: true }));

app.listen(port, () => {
    logger.info(`Server is running on port ${port}`)
});

app.post('/demo2mendix/v1/:jobid', democallhandler);

//https://www.linkedin.com/pulse/working-typescript-express-tim-kent/
async function democallhandler(req: Request, res: Response) {
    const jobid = req.params.jobid;
    const jobtoken = req.get('jobtoken');
    const mxtoken = req.get('mxtoken');
    const model = <Model>req.body;

    if (!jobtoken) {
        res.status(HttpCodes.Unauthorized).send('No job token provided');
        return;
    }
    if (!mxtoken) {
        res.status(HttpCodes.Unauthorized).send('No Mendix token provided');
        return;
    }

    logger.info(`request recieved; jobid: ${jobid} jobtoken: ${jobtoken}`);

    if (!model.appname) {
        res.status(HttpCodes.BadRequest).send('No appname provided');
        return;
    }
    if (!model.model) {
        res.status(HttpCodes.BadRequest).send('No model provided');
        return;
    }

    if (busy) {
        logger.info('Server busy');
        res.sendStatus(HttpCodes.TooManyRequests);
        return;
    }

    logger.info('Server free');
    res.sendStatus(HttpCodes.OK);

    convertToDemo(jobid, jobtoken, mxtoken, model);
}

async function convertToDemo(jobid: string, jobtoken: string, mxtoken: string, model: Model) {
    //logger.info(model);
    busy = true;
    const client = new HttpClient(null, undefined, undefined);// TODO: maybe define additional (token) header here, see https://copyprogramming.com/howto/how-extends-correctly-the-headers-of-request-in-typescript#how-do-i-make-a-http-request-in-typescript

    let result: any;
    const headers = { 'Content-Type': 'application/json', 'jobtoken': jobtoken };

    try {
        const app = await demo2mendix(mxtoken, model.appname, model.appname, model.model, [], valueTypeMapping);
        logger.info(`Converted succesfully with appId ${app.appId}`);
        result = new SuccessResult(app.appId);
    } catch (e: any) {
        logger.info(`Error: ${e}`);
        await new Promise(f => setTimeout(f, 1000));
        result = new ErrorResult(e.message);
    } finally {
        const response = await client.post(callbackBaseURI + jobid, JSON.stringify(result), headers);
        if (response.message.statusCode != HttpCodes.OK) {
            logger.info(`${response.message.statusCode} received: ` + response.message.statusMessage);
        }
        busy = false;
    }
}

abstract class MxAppReadyResult {
    protected constructor(protected success: boolean) { }
}
class ErrorResult extends MxAppReadyResult {
    public constructor(protected latesterror: string) {
        super(false);
    }
}
class SuccessResult extends MxAppReadyResult {
    public constructor(protected appprojectid: string) {
        super(true);
    }
}