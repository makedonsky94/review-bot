import Logger from "./logger.js";
import fs from 'fs';
import * as Helper from './helper.js';

export default class ReviewsStore {
    constructor(file, logger) {
        this.cacheFile = file;

        if (!fs.existsSync("./cache")) {
            fs.mkdirSync("./cache");
        }

        if (!fs.existsSync(this.cacheFile)) {
            fs.writeFileSync(this.cacheFile, "[]");
        }
        
        this.cache = JSON.parse(fs.readFileSync(this.cacheFile));
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
        fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache));
    }

    leftOuterJoin(leftPart) {
        const rightPart = this.cache;
        return leftPart.filter((leftItem) => {
            var itemIndex = rightPart.findIndex((rightItemId) => leftItem.id == rightItemId);
            return itemIndex == -1;
        });
    }

    put(review) {
        this.cache.push(review.id);
        fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache));
    }

    hasAny(reviews) {
        for (var i = 0; i < reviews.length; i++) {
            if (this.cache.includes(reviews[i].id)) {
                return true;
            }
        }
        return false;
    }
}