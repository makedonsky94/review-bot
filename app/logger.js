import fs from 'fs';

export default class Logger {
    constructor(verbose, logFolder) {
        this.verbose = verbose;

        const postfix = Math.floor(Math.random() * 1000000);
        var folder = "";

        if (logFolder) {
            folder = logFolder.trim().replace(new RegExp("[/]$"), "");
        } else {
            folder = "./logs";
        }

        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }

        this.logFile = folder + "/log" + postfix;

        if (!fs.existsSync(this.logFile)) {
            fs.writeFileSync(this.logFile, "");
        }
    }

    log(message) {
        if (this.verbose) {
            console.log(this.getDateTime(), "", message);
            this._logToFile(this.getDateTime() + "          " + message);
        }
    }

    success(message) {
        console.log(this.getDateTime(), "\x1b[32m", message, "\x1b[0m");
        this._logToFile(this.getDateTime() + " SUCCESS: " + message);
    }

    error(message) {
        console.error(this.getDateTime(), "\x1b[31m", message, "\x1b[0m");
        this._logToFile(this.getDateTime() + " ERROR:   " + message);
    }

    getDateTime() {
        const f = this.convertToStringWithLeadingZero;
        var today = new Date();
        var date = `${f(today.getDate())}.${f(today.getMonth())}.${today.getFullYear()}`;
        var time = `${f(today.getHours())}:${f(today.getMinutes())}:${f(today.getSeconds())}`;
        return `${date} ${time}`;
    }

    convertToStringWithLeadingZero(number) {
        return number.toString().padStart(2, "0");
    }

    _logToFile(message) {
        fs.appendFileSync(this.logFile, message + "\n");
    }
}