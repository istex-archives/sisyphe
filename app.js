#!/usr/bin/env node

'use strict';

const program = require('commander'),
  Sisyphe = require('./src/sisyphe'),
  bluebird = require('bluebird'),
  fs = bluebird.promisifyAll(require('fs'));

program
  .version('0.0.1')
  .usage('[options] <path>')
  .option('-c, --corpusname <name>', 'Choose a corpus\'s name', 'default')
  .parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

const pathInput = program.args[0];
fs.statAsync(pathInput).catch((error) => {
  console.log(error);
  process.exit(1);
}).then(() => {
  return new Sisyphe({
    module: "walker-fs",
    options: {
      path: pathInput,
      corpusname: program.corpusname
    }
  });
}).then((sisyphe) => {
  sisyphe.start();
});



