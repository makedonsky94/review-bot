#! /usr/bin/env node
import * as reviewBot from '../app/app.js';
import program from 'commander';
import fs from 'fs';

var configFile;

program
  .arguments('<file>')
  .action(function (file) {
    configFile = file;
  })
  .parse(process.argv);

if (typeof configFile === 'undefined') {
  console.error('No config file specified');
  process.exit(1);
}

var config = JSON.parse(fs.readFileSync(configFile));
reviewBot.start(config);