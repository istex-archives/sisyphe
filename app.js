#!/usr/bin/env node

'use strict';

const program = require('commander'),
  Sisyphe = require('./src/sisyphe'),
  bluebird = require('bluebird'),
  path = require('path'),
  fs = bluebird.promisifyAll(require('fs'));

program
  .version('0.0.1')
  .usage('[options] <path>')
  .option('-n, --corpusname <name>', 'Choose an identifier \'s Name', 'default')
  .option('-c, --config <path>', 'Config json file path')
  .option('-d, --dtd <path>', 'DTD folder path')
  .parse(process.argv);

if (!program.args.length) {
  program.outputHelp();
  process.exit();
}

const pathInput = program.args[0];

let starter = {
  module: "walker-fs",
  options: {
    path: pathInput,
    corpusname: program.corpusname
  }
};

let workers = [{
  name: "Sisyphe FileType",
  module: "sisyphe-filetype"
}, {
  name: "Sisyphe XML",
  module: "sisyphe-xml",
  options: {
    corpusname: program.corpusname,
    config: program.config,
    dtd: program.dtd
  }
}, {
  name: "Sisyphe PDF",
  module: "sisyphe-pdf"
}, {
  name: "Sisyphe xpath",
  module: "sisyphe-xpath",
  options: {
    corpusname: program.corpusname
  }
}, {
  name: "Sisyphe Output",
  module: "sisyphe-out",
  options: {
    corpusname: program.corpusname
  }
}];

// This is an Update
if (!pathInput && program.corpusname) {
  starter = {
    module: "walker-elastic",
    options: {
      index: 'analyse-' + program.corpusname,
      corpusname: program.corpusname
    }
  };
  workers = [{name: "Sisyphe XML", module: "sisyphe-xml"}, 
  {name: "Sisyphe Output", module: "sisyphe-out", options: {corpusname: program.corpusname}}];
  let sisyphe = new Sisyphe(starter, workers);
  sisyphe.start();
  return;
}

fs.statAsync(pathInput).catch((error) => {
  console.log(error);
  process.exit(1);
}).then(() => {
  return new Sisyphe(starter, workers);
}).then((sisyphe) => {
  sisyphe.start();
});



