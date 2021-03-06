import Slack from './slack.js';
import { runBot } from './run-bot.js';

export function start(config) {
    for (var i = 0; i < config.apps.length; i++) {
        var app = config.apps[i];

        runBot({
            slackHook: config.slackHook,
            verbose: config.verbose,
            interval: config.interval,
            botIcon: app.botIcon || config.botIcon,
            showAppIcon: app.showAppIcon || config.showAppIcon,
            channel: app.channel || config.channel,
            publisherKey: app.publisherKey,
            appId: app.appId,
            appName: app.appName,
            regions: app.regions,
            log: config.log || "./logs/",
            store: config.store,
            cache: config.cache
        });
    }
}

export function testSlack(config) {
    Slack.test(config);
}
