#! /usr/bin/env node
// import PlayStoreWatcher from './../watcher/google/PlayStoreWatcher.js';

// const playStoreWatcher = new PlayStoreWatcher();
// playStoreWatcher.startWatch();


import fs from 'fs';
import * as lockfile from 'proper-lockfile';



var index = 1;
var id = Math.floor(Math.random() * 1000000);
while(true) {
    while(lockfile.checkSync("./test.txt")) {}

    const release = lockfile.lockSync("./test.txt");

    var text = fs.readFileSync("./test.txt");
    text += `${id} - ${index} \n`;
    fs.writeFileSync("./test.txt", text);
    index++;

    release();

    // .then((release) => {
    //     // Do something while the file is locked
    
    //     // Call the provided release function when you're done,
    //     // which will also return a promise
       

    //     return release();
    // })
    // .catch((e) => {
    //     // either lock could not be acquired
    //     // or releasing it failed
    //     console.error(e)
    // });

    
}