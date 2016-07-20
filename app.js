#!/usr/bin/env node

'use strict';

const program = require('commander'),
  ChainJobQueue = require('./src/chain-job-queue'),
  bluebird = require('bluebird'),
  walk = require('walk'),
  fs = bluebird.promisifyAll(require('fs')),
  mime = require('mime');

program
  .version('0.0.1')
  .usage('<path>')
  .parse(process.argv);

const path = program.args[0];
fs.statAsync(path).catch((error) => {
  console.log(error);
  process.exit(1);
});

const walker = walk.walk(path);
const chain = new ChainJobQueue();
chain.addWorker('First Worker', (data, next) => {
  setTimeout(() => {
    data.count++;
    // console.log(data);
    next();
  }, 10);
}).addWorker('Second Worker', (data, next) => {
  setTimeout(() => {
    data.count++;
    // console.log(data);
    next();
  }, 10);
}).initialize();

let totalFile = 0;

walker.on("file", function (root, stats, next) {
  totalFile++;
  let item = {};
  item.path = root + '/' + stats.name;
  item.mimetype = mime.lookup(root + '/' + stats.name);
  item.count = 0;
  // console.log(JSON.stringify(item));
  chain.addTask(item);
  next();
});

walker.on("errors", function (root, nodeStatsArray, next) {
  console.log(root);
  next();
});

walker.on("end", function () {
  chain.addTask({
    stop: true
  });
  console.log("Generate tasks finished with " + totalFile + " files.");
});

// setTimeout(() => {
//   chain.stopAll().then(() => {
//     console.log('chain stopped');
//   });
// }, 10000);