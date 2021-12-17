import request from 'request';
import androidVersions from 'android-versions';

export default class Slack {
    static test(config) {
        const body = {
            "channel": config.channel,
            "attachments": [
                {
                    "text": "test"
                }
            ]
        }; 
        return request.post({
            url: config.slackHook,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }, function(error, response, body) {
            console.error(body)
        });
    }

    static getMessage(review, config) {
        return {
            "channel": config.channel,
            "attachments": [
                {
                    "mrkdwn_in": ["text", "pretext", "title"],
                    "color": Slack.getColor(review.rating),
                    "author_name": review.author,
                    "thumb_url": review.appIcon,
                    "title": Slack.getTitle(review),
                    "text": review.text + "\n",
                    "footer": Slack.getFooter(review)
                }
            ]
        };
    }

    static postMessage(review, config) {
        var message = Slack.getMessage(review, config);
        var messageJSON = JSON.stringify(message);

        return request.post({
            url: config.slackHook,
            headers: {
                "Content-Type": "application/json"
            },
            body: messageJSON
        });
    }

    static getColor(rating) {
        return rating >= 4 ? "good" : (rating >= 2 ? "warning" : "danger");
    }

    static getFooter(review) {
        var footer = "";
        console.log(review);

        if (review.version) {
            footer += ` for v${review.version}`;
        }

        if (review.osVersion) {
            const os = androidVersions.get(review.osVersion);
            if (os) {
                footer += ` Android ${os.semver} (${os.name})`;
            } else {
                footer += ` Android unknown`;
            }
        }

        if (review.device) {
            footer += `, ${review.device}`;
        }

        if (review.link) {
            footer += ` -  <${review.link}|${review.storeName} (${review.region})>`;
        }

        return footer;
    }

    static getTitle(review) {
        var stars = "";
        for (var i = 0; i < 5; i++) {
            stars += i < review.rating ? "★" : "☆";
        }

        var title = stars;
        if (review.title) {
            title += " – " + review.title;
        }

        return title;
    }
}