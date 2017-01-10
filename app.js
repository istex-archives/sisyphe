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

var starter = {
  module: "walker-fs",
  options: {
    path: pathInput,
    corpusname: program.corpusname
  }
}
var workers = [{
  name: "Sisyphe FileType",
  module: "sisyphe-filetype"
}, {
  name: "Sisyphe XML",
  module: "sisyphe-xml"
}, {
  name: "Sisyphe PDF",
  module: "sisyphe-pdf"
}, {
  name: "Sisyphe xpath",
  module: "sisyphe-xpath"
},{
  name: "Sisyphe Output",
  module: "sisyphe-out"
}];

// This is an Update
if(!pathInput && program.corpusname){
  starter ={
    module: "walker-elastic",
    options: {
      index: 'analyse-' + program.corpusname,
      corpusname: program.corpusname
    }
  };
  workers = [{name: "Sisyphe XML",module: "sisyphe-xml"},{name: "Sisyphe Output",module: "sisyphe-out"}]
  let sisyphe = new Sisyphe(starter,workers);
  sisyphe.start();
  return;
}

fs.statAsync(pathInput).catch((error) => {
  console.log(error);
  process.exit(1);
}).then(() => {
  return new Sisyphe(starter,workers);
}).then((sisyphe) => {
  sisyphe.start();
});



