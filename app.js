#!/usr/bin/env node

'use strict';

const program = require('commander'),
  ChainJobQueue = require('./src/chain-job-queue'),
  WalkerFS = require('./starter/walker-fs/walker-fs'),
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

const chain = new ChainJobQueue();
chain.addWorker('First Worker', (data, next) => {
  setTimeout(() => {
    data.count++;
    console.log(data);
    next();
  }, 10);
}).addWorker('Second Worker', (data, next) => {
  setTimeout(() => {
    data.count++;
    console.log(data);
    next();
  }, 10);
}).initialize();

const generateTask = new WalkerFS(path);
generateTask
  .addChain(chain)
  .start();
