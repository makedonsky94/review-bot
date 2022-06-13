import Logger from "./logger.js";
import fs from 'fs';
import path from 'path';
import * as Helper from './helper.js';

export default class ReviewsStore {
    constructor(file, logger) {
        this.cacheFile = file;

        const directory = path.dirname(this.cacheFile);

        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory, { recursive: true });
        }

        if (!fs.existsSync(this.cacheFile)) {
            fs.writeFileSync(this.cacheFile, "[]");
        }
        
        this.cache = this.readCache();
        this.isInitialized = false;
        this.logger = logger;
    }

    init(reviews) {
        if (this.isInitialized) {
            this.logger.error("Store is already initialized");
        }

        this.isInitialized = true;
        const newReviews = this.leftOuterJoin(reviews).map((item) => item.id);
        this.cache = Helper.mergeArrays(this.cache, newReviews);
        this.writeCache(this.cache);
    }

    leftOuterJoin(leftPart) {
        this.cache = this.readCache();
        const rightPart = this.cache;
        return leftPart.filter((leftItem) => {
            var itemIndex = rightPart.findIndex((rightItemId) => leftItem.id == rightItemId);
            return itemIndex == -1;
        });
    }

    put(review) {
        this.cache = this.readCache();
        this.cache.push(review.id);
        this.writeCache(this.cache);
    }

    hasAny(reviews) {
        for (var i = 0; i < reviews.length; i++) {
            if (this.cache.includes(reviews[i].id)) {
                return true;
            }
        }
        return false;
    }

    readCache() {
        return JSON.parse(fs.readFileSync(this.cacheFile));
    }

    writeCache(cache) {
        fs.writeFileSync(this.cacheFile, JSON.stringify(cache));
    }
}