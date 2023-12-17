import * as ftp from "basic-ftp";
import logger from 'loglevel';
logger.setLevel(logger.levels.INFO);

export type FTPFileProcessor = (filename: string, client: ftp.Client) => Promise<void>;

export class FTPChecker {
    private _client;
    private _running: boolean = false;

    constructor(private _processor: FTPFileProcessor, private _accessOptions: ftp.AccessOptions, private _nrOfSeconds: number = 30, private _keepalive: boolean = true, private _processedFolder: string = 'processed') {
        this._client = new ftp.Client();
    }

    public async start() {
        if (this._keepalive) await this.openConnection();
        logger.info('Opened connection');

        this.check();
        setInterval(() => {
            this.check();
        }, this._nrOfSeconds * 1000);
    }

    private async openConnection() {
        await this._client.access(this._accessOptions);

        await this._client.ensureDir(this._processedFolder);
        await this._client.cd('../');
    }

    private async closeConnection() {
        this._client.close();
    }

    private async check() {
        logger.info('Starting new check');

        if (this._running) {
            logger.info('Skipping run, still running');
            return;
        }

        this._running = true;
        if (!this._keepalive || this._client.closed) await this.openConnection();

        const files = await this._client.list();

        for (let f of files) {
            if (f.isFile) {
                await this._processor(f.name, this._client);
                await this._client.rename(f.name, this._processedFolder + "/" + f.name);
            }
        }

        if (!this._keepalive) await this.closeConnection();
        this._running = false;

        logger.info('Check completed');
    }
}