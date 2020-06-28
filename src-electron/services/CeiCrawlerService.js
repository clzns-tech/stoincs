import CeiCrawler from 'cei-crawler';
import ConfigurationService from '../services/ConfigurationService';
import puppeteer from 'puppeteer';
import AsyncUtils from '../utils/AsyncUtils';

class CeiCrawlerService {

    /** @type {CeiCrawler} */
    _ceiCrawler = null;

    /** @type {Boolean} */
    _isFree = true;

    _closeTimeout = null;

    async _getFreeInstance() {
        clearTimeout(this._closeTimeout);
        if (this._ceiCrawler != null && this._isFree) {
            console.log(`Instance exists and it is free. Returning it...`);
            this._isFree = false;
            return this._ceiCrawler;
        }

        if (this._isFree === false) {
            console.log('Will wait until instance is free');
            await this._waitForFreeInstance();
            this._isFree = false;
            return this._ceiCrawler;
        }

        this._isFree = false;
        const configuration = await ConfigurationService.getConfiguration();
        const user = configuration.username || '';
        const password = configuration.password || '';

        const chromiumPath = puppeteer.executablePath().replace('app.asar', 'app.asar.unpacked/node_modules/puppeteer');
        this._ceiCrawler = new CeiCrawler(user, password, { puppeteerLaunch: { headless: true, executablePath: chromiumPath }, capDates: true });

        return this._ceiCrawler;
    }

    async _waitForFreeInstance() {
        let duration = 20000; // Start with 10s
        while (!this._isFree) {
            console.log(`Waiting free instance for ${duration}ms...`);
            await AsyncUtils.timeout(duration);
            duration = Math.max(1000, parseInt(duration / 2)); // half down until 1s max
        }
        console.log(`Wait is over!`);
    }

    async _freeUpInstance() {
        console.log('Freeing instance...');
        this._isFree = true;

        // If freed instance is not used for some time, closes it
        if (this._closeTimeout === null)
            this._closeTimeout = setTimeout(async () => {
                console.log('Closing instance after some time idle...');
                await this._ceiCrawler.close();
                this._ceiCrawler = null;
                this._closeTimeout = null;
            }, 60 * 1000);
    }

    async getStockHistory(startDate, endDate) {
        const ceiCrawler = await this._getFreeInstance();
        try {
            const result = await ceiCrawler.getStockHistory(startDate, endDate);
            await this._freeUpInstance();
            return result;
        } catch (e) {
            await this._freeUpInstance();
            throw e;
        }
    }

}

export default new CeiCrawlerService();
