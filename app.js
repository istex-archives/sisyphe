#!/usr/bin/env node

'use strict';

const program = require('commander'),
  ChainJobQueue = require('./src/chain-job-queue'),
  walk = require('walk'),
  fs = require('fs'),
  mime = require('mime');

program
  .version('0.0.1')
  .usage('<path>')
  .parse(process.argv);

const path = program.args[0];
const walker = walk.walk(path);
const chain = new ChainJobQueue();
chain.addWorker('First Worker', (data, next) => {
  data.count++;
  // console.log(JSON.stringify(data));
  next();
}).addWorker('Second Worker', (data, next) => {
  data.count++;
  // console.log(JSON.stringify(data));
  next();
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