import fs from 'fs';
import FileSystemUtils from '../utils/FileSystemUtils';
import AlphaVantageService from './AlphaVantageService';

const FILES = {
    STOCK_PRICES: 'stock_prices'
};

class StockPriceService {

    async getStockPrices() {
        const rootPath = await FileSystemUtils.getDataPath();
        const path = `${rootPath}/${FILES.STOCK_PRICES}`;

        const stockPrices = JSON.parse((await fs.promises.readFile(path, { flag: 'a+', encoding: 'utf-8' })).toString() || '{}');
        Object.values(stockPrices).forEach(price => {
            price.lastTradingDay = new Date(price.lastTradingDay);
            price.lastUpdated = new Date(price.lastUpdated);
        });
        return stockPrices;
    }

    async saveStockPrices(stockPrices) {
        const rootPath = await FileSystemUtils.getDataPath();
        const path = `${rootPath}/${FILES.STOCK_PRICES}`;
        await fs.promises.writeFile(path, JSON.stringify(stockPrices));
    }

    async updateStockPrices(stocks) {
        console.log(`Updating stocks ${stocks.join(', ')}...`);

        const promises = stocks.map(s => AlphaVantageService.getLastValue(s));

        const results = (await Promise.all(promises)).filter(o => o !== null);

        const stockPrices = await this.getStockPrices();
        const now = new Date();

        for (const r of results) {
            if (r.status !== 'success') continue;

            stockPrices[r.code] = {
                price: r.price,
                changePrice: r.changePrice,
                changePercent: r.changePercent,
                lastTradingDay: r.lastTradingDay,
                lastUpdated: now
            };
            r.lastUpdated = now;
        }

        await this.saveStockPrices(stockPrices);

        return results;
    }

    async updateStockPricesConfiguration(stocks) {
        const stockPrices = await this.getStockPrices();
        stockPrices.forEach(o => { o.shouldUpdate = false }); // Set everything to false

        // Set the ones to true
        stocks.forEach(s => {
            const stockPrice = stockPrices.filter(o => o.code === s)[0] || {
                code: s,
                shouldUpdate: true
            };
            stockPrice.shouldUpdate = true;
        });

        await this.saveStockPrices(stockPrices);
    }

}

export default new StockPriceService();
export { FILES as StockHistoryFiles };