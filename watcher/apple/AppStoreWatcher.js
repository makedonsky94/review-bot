import Logger from '../../app/logger.js';
import ReviewsStore from '../../app/reviews-store.js';
import Slack from '../../app/slack.js';
import * as Helper from '../../app/helper.js';
import request from 'request';

export default class AppStoreWatcher {
    constructor(config) {
        if (!config.regions) {
            config.regions = ["us"];
        }

        if (!config.interval) {
            config.interval = 1000;
        }
        this.config = config;
        this.logger = new Logger(true, config.log);
        this.reviewsStore = new ReviewsStore("./cache/ios.json", this.logger);
    }

    startWatch() {
        const logger = this.logger;

        this.watchTick()
            .then(() => {
                logger.log("Waiting for the next call...");
                return new Promise((resolve) => {
                    setTimeout(resolve, this.config.interval * 1000);
                });
            })
            .then(() => this.startWatch());
    }

    watchTick() {
        const config = this.config;
        const logger = this.logger;
        const regions = config.regions;

        return new Promise((resolve) => {
                logger.log(`Fetch reviews for ${regions.length} regions`);
                resolve(this.fetchReviews(regions));
            })
            .then((reviews) => {
                logger.log(`Fetched reviews: ${reviews.length} items`);
                return reviews;
            })
            .then((reviews) => {
                logger.log(`Filter items`);
                return reviews.filter((item) => !this.isAppInformationEntry(item));
            })
            .then((reviews) => {
                logger.log("Reverse items");
                return reviews.reverse();
            })
            .then((reviews) => {
                logger.log("Parse items");
                return reviews.map((item) => this.parseReview(item));
            })
            .then((reviews) => {
                logger.log("Remove duplicates");
                return reviews.filter((review, index, array) => array.findIndex((item) => item.id == review.id) == index);
            })
            .then((reviews) => {
                if (!this.reviewsStore.isInitialized) {
                    logger.log("Init store");
                    this.reviewsStore.init(reviews);
                    return [];
                }
                
                //get reviews which is not storing in reviewsStore
                return this.reviewsStore.leftOuterJoin(reviews);
            })
            .then((reviews) => {
                logger.log(`New reviews: ${reviews.length} items`);
                return reviews.forEach((item) => {
                    logger.log("Sending items to slack...");
                    this.reviewsStore.put(item);
                    Slack.postMessage(item, this.config);
                })
            });
    }

    fetchReviews(regions) {
        return new Promise((resolve) => {
            this.fetchReviewsByRegion(regions).then((reviews) => {
                resolve(reviews);
            });
        });
    }

    fetchReviewsByRegion(regions, index = 0, reviews = []) {
        const firstPage = 1;
        const lastPage = 10;
        const logger = this.logger;
        const region = regions[index];
        const isLastRegion = index == regions.length - 1;

        return new Promise((resolve) => {
            this.fetchReviewsByPage(region, lastPage, firstPage).then((fetchedReviews) => resolve(fetchedReviews));
        }).then((fetchedReviews) => {
            const newReviews = fetchedReviews.filter((review) => this.reviewsStore.cache.indexOf(review.id.label) == -1);

            logger.success(`Fetched ${fetchedReviews.length} reviews in ${region} region`);
            logger.success(`Fetched ${newReviews.length} NEW reviews in ${region} region`);
            logger.log("---------------------------------------------");

            reviews = Helper.mergeArrays(fetchedReviews, reviews);
            if (isLastRegion) {
                return reviews;
            } else {
                return this.fetchReviewsByRegion(regions, ++index, reviews);
            }
        })
    }

    fetchReviewsByPage(region, lastPage, currentPage, reviews = [], retryCount = 0) {
        const config = this.config;
        const logger = this.logger;
        const url = `https://itunes.apple.com/${region}/rss/customerreviews/page=${currentPage}/id=${config.appId}/sortBy=mostRecent/json`;
        logger.log(`[REQUEST] region: ${region}; page: ${currentPage}; appId: ${config.appId};`);

        return new Promise((resolve) => {
            request({ method: 'GET', uri: url, timeout: 60000 }, (error, response, body) => {
                if (error) {
                    logger.error(`[RESPONSE] type: Fail; errorCode: ${error.code}; region: ${region}; page: ${currentPage};`);
                    resolve({ items: [], successful: false, reason: error.code });
                    return;
                }

                if (response.statusCode == 400) {
                    logger.error(`[RESPONSE] type: Fail; errorCode: REGION_NOT_SUPPORTED; region: ${region}; page: ${currentPage};`);
                    resolve({ items: [], successful: true, reason: "REGION_NOT_SUPPORTED" });
                    return;
                }

                //check if response code is not 2xx
                if (parseInt(response.statusCode / 100) != 2) {
                    logger.error(`[RESPONSE] type: Fail; errorCode: ${response.statusCode}; region: ${region}; page: ${currentPage};`);
                    resolve({ items: [], successful: false, reason: response.statusCode });
                    return;
                }

                var rss;
                try {
                    rss = JSON.parse(body);
                } catch (e) {
                    logger.error(`[RESPONSE] type: Fail; errorCode: JSON_PARSING_ERROR; region: ${region}; page: ${currentPage};`);
                    logger.error(e);
                    resolve({ items: [], successful: false, reason: "JSON_PARSING_ERROR" });
                    return;
                }
                logger.log(`[RESPONSE] type: Success; region: ${region}; page: ${currentPage};`);

                var entries = rss.feed.entry;
                if (entries == null) {
                    entries = [];
                }
                
                resolve({ items: entries, successful: true });
            })
        }).then((response) => {
            const responseItems = Array.isArray(response.items) ? response.items : [response.items];
            const hasCachedItems = this.reviewsStore.hasAny(responseItems.map((item) => this.parseReview(item)));
            const isRegionNotSupported = response.reason == "REGION_NOT_SUPPORTED";
            const shouldReturn = response.successful || hasCachedItems || isRegionNotSupported;

            if (shouldReturn) {
                const isListEmpty = responseItems.length == 0;
                reviews = Helper.mergeArrays(responseItems, reviews);

                if (currentPage == lastPage || isListEmpty || hasCachedItems || isRegionNotSupported) {
                    reviews.forEach((item) => item.region = region);
                    return reviews;
                } else {
                    return this.fetchReviewsByPage(region, lastPage, ++currentPage, reviews);
                }
            }

            const retry = retryCount + 1;
            return new Promise((resolve) => {
                const minutes = retry * 5;
                logger.log(`Wait for ${minutes} mins before repeating of the request`);
                setTimeout(resolve, minutes * 60 * 1000); //5 mins of waiting
            }).then(() => {
                return this.fetchReviewsByPage(region, lastPage, currentPage, reviews, retry);
            });
        })
    }

    parseReview(rssItem) {
        return {
            id: rssItem.id.label,
            version: this.getReviewAppVersion(rssItem),
            title: rssItem.title.label,
            text: rssItem.content.label,
            rating: this.getReviewRating(rssItem),
            author: this.getReviewAuthor(rssItem),
            link: this.getReviewLink(rssItem),
            storeName: "App Store",
            region: rssItem.region
        };
    }

    isAppInformationEntry(review) {
        // App information is available in an entry with some special fields
        return review && review['im:name'];
    }

    getReviewRating(review) {
        return review['im:rating'] && !isNaN(review['im:rating'].label) ? parseInt(review['im:rating'].label) : -1;
    }
    
    getReviewAuthor(review) {
        return review.author ? review.author.name.label : '';
    }
    
    getReviewLink(review) {
        return review.author ? review.author.uri.label : '';
    }
    
    getReviewAppVersion(review) {
        return review['im:version'] ? review['im:version'].label : '';
    }
}