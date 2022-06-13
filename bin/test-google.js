#! /usr/bin/env node
import PlayStoreWatcher from './../watcher/google/PlayStoreWatcher.js';

const playStoreWatcher = new PlayStoreWatcher();
playStoreWatcher.startWatch();