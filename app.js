#!/usr/bin/env node

'use strict';

const program = require('commander'),
  ChainJobQueue = require('./src/chain-job-queue'),
  WalkerFS = require('./starter/walker-fs/walker-fs'),
  Sisyphe = require('./src/sisyphe'),
  path = require('path'),
  bluebird = require('bluebird'),
  fs = bluebird.promisifyAll(require('fs')),
  glob = require('glob');

program
  .version('0.0.1')
  .usage('<path>')
  .parse(process.argv);

const pathInput = program.args[0];
fs.statAsync(pathInput)
  .then(() => {
    const sisyphe = new Sisyphe({
      module: "walker-fs",
      options: {
        path: pathInput
      }
    });

    sisyphe
      .initialize()
      .then(() => sisyphe.start());
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });


