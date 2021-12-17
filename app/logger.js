export default class Logger {
    constructor(verbose) {
        this.verbose = verbose;
    }

    log(message) {
        if (this.verbose) console.log(this.getDateTime(), "", message);
    }

    success(message) {
        console.log(this.getDateTime(), "\x1b[32m", message, "\x1b[0m");
    }

    error(message) {
        console.log(this.getDateTime(), "\x1b[31m", message, "\x1b[0m");
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
}