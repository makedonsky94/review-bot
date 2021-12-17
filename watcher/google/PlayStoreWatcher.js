import Logger from "../../app/logger.js";
import ReviewsStore from "../../app/reviews-store.js";
import Slack from "../../app/slack.js";
import { GoogleApis } from "googleapis";
import fs from 'fs';

const googleApi = new GoogleApis();

export default class PlayStoreWatcher {
    constructor(config) {
        if (!config.regions) {
            config.regions = ["us"];
        }

        if (!config.interval) {
            config.interval = 1000;
        }
        this.config = config;
        this.logger = new Logger(true);
        this.reviewsStore = new ReviewsStore("./cache/android.json");
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
        const logger = this.logger;

        return new Promise((resolve) => {
                logger.log("Fetch jwt");
                resolve(this.fetchPublisherKey());
            })
            .then((jwt) => {
                logger.log("Auth jwt");
                return this.authJwt(jwt);
            })
            .then((jwt) => {
                logger.log("Fetch reviews");
                return this.fetchReviewsWithJwt(jwt);
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
            })
    }

    fetchAppInformation() {
        const config = this.config;
        const logger = this.logger;

        const appInformation = {
            appName: config.appName,
            appIcon: config.appIcon,
            appLink: config.appLink
        };

        return new Promise((resolve) => {
            playScraper
                .app({appId: config.appId})
                .then(function (appData, error) {
                    if (error) {
                        resolve(appInformation);
                        return;
                    }

                    appInformation.appName = appData.title;
                    appInformation.appIcon = appData.icon;

                    resolve(appInformation);
                })
                .catch((error) => {
                    logger.error(error);
                    resolve(appInformation);
                });
        })
    }

    fetchPublisherKey() {
        const logger = this.logger;
        const config = this.config;

        return new Promise((resolve) => {
            const scopes = ['https://www.googleapis.com/auth/androidpublisher'];

            //read publisher json key
            var publisherJson;
            try {
                publisherJson = JSON.parse(fs.readFileSync(config.publisherKey, 'utf8'));
            } catch (err) {
                logger.error(`Error during the fetch of publisher key: ${err}`);
                return;
            }
    
            try {
                const jwt = new googleApi.auth.JWT(publisherJson.client_id, null, publisherJson.private_key, scopes, null);
                resolve(jwt);
            } catch (err) {
                logger.error(`Error during the initialization of JWT: ${err}`);
            }
        })
    }

    authJwt(jwt) {
        const logger = this.logger;
        return new Promise((resolve) => {
            jwt.authorize()
                .then(() => {
                    resolve(jwt);
                })
                .catch((error) => {
                    logger.error(error);
                    resolve(jwt);
                });
        });
    }

    fetchReviewsWithJwt(jwt) {
        const logger = this.logger;
        const config = this.config;
        const params = {
            auth: jwt,
            packageName: config.appId,
            maxResults: 1000
        };
        const self = this;
        return new Promise((resolve) => {
            googleApi.androidpublisher({version: 'v3'}).reviews.list(params, function (err, response) {
                if (err) {
                    logger.error(`[RESPONSE] type: Fail; errorMessage: ${err}`);
                    resolve([]);
                    return;
                }
    
                if (!response.data.reviews) {
                    logger.log("[INFO] Received 0 reviews from Google Play");
                    resolve([]);
                    return;
                }
                logger.log(`[INFO] Received ${response.data.reviews.length} reviews from Google Play`);
    

                const reviews = self.parseReviews(response.data.reviews);
                resolve(reviews);
            })
        })
    }

    parseReviews(reviews) {
        const config = this.config;
        return reviews.map(function (review) {
            const comment = review.comments[0].userComment;

            var out = {};
            out.id = review.reviewId;
            out.author = review.authorName;
            out.version = comment.appVersionName;
            out.versionCode = comment.appVersionCode;
            out.osVersion = comment.androidOsVersion;

            if (comment.deviceMetadata) {
                out.device = comment.deviceMetadata.productName;
            }

            out.text = comment.text;
            out.rating = comment.starRating;
            out.link = 'https://play.google.com/store/apps/details?id=' + config.appId + '&reviewId=' + review.reviewId;
            out.storeName = "Google Play";
            out.region = comment.reviewerLanguage;

            return out;
        });
    }
}