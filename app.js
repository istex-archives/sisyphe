#!/usr/bin/env node

'use strict';

const program = require('commander'),
  ChainJobQueue = require('./src/chain-job-queue'),
  WalkerFS = require('./starter/walker-fs/walker-fs'),
  path = require('path'),
  bluebird = require('bluebird'),
  fs = bluebird.promisifyAll(require('fs')),
  glob = require('glob');

program
  .version('0.0.1')
  .usage('<path>')
  .parse(process.argv);

const pathInput = program.args[0];
fs.statAsync(pathInput).catch((error) => {
  console.log(error);
  process.exit(1);
});

const chain = new ChainJobQueue();
const dirWorker = path.normalize(__dirname + '/worker');

fs.statAsync(dirWorker).then((stats) => {
  return new Promise((resolve, reject) => {
    if (stats.isDirectory()) {
      resolve()
    } else {
      reject('Your path is not a directory')
    }
  })
}).then(() => glob.sync(dirWorker + '/*/'))
  .then((arrayDirectories) => {
    return arrayDirectories.map((directory) => {
      console.log(directory);
      const jobModule = require(directory);
      const packageJobModule = require(directory + '/package.json');
      console.log(packageJobModule.name);
      console.log(jobModule.doTheJob);
      return {
        name: packageJobModule.name,
        doTheJob: jobModule.doTheJob
      };
    })
  }).then((arrayModule) => {
    arrayModule.forEach((module) => {
      chain.addWorker(module.name, module.doTheJob);
    });
    chain.initialize();
  });

const generateTask = new WalkerFS(pathInput);
generateTask
  .addChain(chain)
  .start();
