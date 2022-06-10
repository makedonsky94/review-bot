import AppStoreWatcher from '../watcher/apple/AppStoreWatcher.js';
import PlayStoreWatcher from '../watcher/google/PlayStoreWatcher.js';

const REVIEWS_STORES = {
    "APP_STORE": "app-store",
    "GOOGLE_PLAY": "google-play"
};

export function runBot(config) {
    if (!config.store) {
        // Determine from which store reviews are downloaded
        config.store = (config.appId.indexOf("\.") > -1) ? REVIEWS_STORES.GOOGLE_PLAY : REVIEWS_STORES.APP_STORE;
    }

    if (config.store === REVIEWS_STORES.APP_STORE) {
        var appStoreWatcher = new AppStoreWatcher(config);
        appStoreWatcher.startWatch();
    } else {
        const playStoreWatcher = new PlayStoreWatcher(config);
        playStoreWatcher.startWatch();
    }
}
