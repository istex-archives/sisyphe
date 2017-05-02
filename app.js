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
  .option('-c, --config-dir <path>', 'Config folder path')
  .option('-o, --output <all/json>', 'Output destination')
  .parse(process.argv);

//Check if debug mode is on
var isInspected = false;
for(var arg of process.execArgv){
  console.log(arg);
  if(arg.includes('--inspect')){
    isInspected = true;
    break;
  }
}

if (program.name === 'default') {
  program.outputHelp();
  process.exit(0);
}

const pathInput = program.args[0];
const startAt = Date.now();

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
    configDir: program.configDir
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
  name: "Sisyphe hash",
  module: "sisyphe-hash",
  options: {
    corpusname: program.corpusname
  }
}, {
  name: "Sisyphe Output",
  module: "sisyphe-out",
  options: {
    corpusname: program.corpusname,
    output: program.output
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
  workers = [{
    name: "Sisyphe XML",
    module: "sisyphe-xml",
    options: {
      corpusname: program.corpusname,
      configDir: program.configDir
    }
  }, {
    name: "Sisyphe Output",
    module: "sisyphe-out",
    options: {
      corpusname: program.corpusname,
      output: program.output
    }
  }];
  let sisyphe = new Sisyphe(starter, workers, isInspected);
  sisyphe.start();
  return;
}

fs.statAsync(pathInput).catch((error) => {
  console.error(error);
  process.exit(1);
}).then(() => {
  return new Sisyphe(starter, workers, isInspected);
}).then((sisyphe) => {
  sisyphe.start();
});



