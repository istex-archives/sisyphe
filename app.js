#!/usr/bin/env node

'use strict';

const program = require('commander'),
  Sisyphe = require('./src/sisyphe'),
  bluebird = require('bluebird'),
  path = require('path'),
  fs = bluebird.promisifyAll(require('fs'));


function appender(xs) {
  xs = xs || [];
  return function (x) {
    xs.push(x);
    return xs;
  };
}
program
  .version('0.0.1')
  .usage('[options] <path>')
  .option('-n, --corpusname <name>', 'Choose an identifier \'s Name', 'default')
  .option('-c, --config-dir <path>', 'Config folder path')
  .option('-o, --output <all/json>', 'Output destination')
  .option('-r, --remove-module <name>', 'Remove module name from the workflow', appender(), [])
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

if (program.corpusname === 'default') {
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

let options = {
  corpusname: program.corpusname,
  configDir: program.configDir,
  output: program.output
};

let workers = [{
  name: "filetype",
  module: "sisyphe-filetype"
}, {
  name: "xml",
  module: "sisyphe-xml",
  options
}, {
  name: "pdf",
  module: "sisyphe-pdf",
  options
}, {
  name: "xpath",
  module: "sisyphe-xpath",
  options
}, {
  name: "hash",
  module: "sisyphe-hash",
  options
}, {
  name: "out",
  module: "sisyphe-out",
  options
}];


// remove unwanted module
if(program.removeModule){
  workers = workers.filter(obj=>{
    return !program.removeModule.includes(obj.name);
  });
}

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



