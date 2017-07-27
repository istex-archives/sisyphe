#!/usr/bin/env node
const program = require('commander');
const pkg = require('./package.json');
const path = require('path');
const Manufactory = require('./src/manufactory');
const numCPUs = require('os').cpus().length;

program
  .version(pkg.version)
  .usage('[options] <path>')
  .option('-n, --corpusname <name>', "Choose an identifier 's Name", 'default')
  .option('-c, --config-dir <path>', 'Config folder path', 'none')
  .parse(process.argv);

// Corpusname is default, we stop here
if (program.corpusname === 'default' || program.configDir === 'none') {
  program.outputHelp();
  process.exit(0);
}

const argPath = program.args[0];
const inputPath = (argPath.charAt(0) === '/') ? argPath : path.join(__dirname, argPath);
const configDirOpt = program.configDir;
const configDir = (configDirOpt.charAt(0) === '/') ? configDirOpt : path.join(__dirname, configDirOpt);

const workers = ['walker-fs', 'filetype', 'pdf', 'xml'];
const options = {
  corpusname: program.corpusname,
  configDir,
  inputPath,
  numCPUs
};

const enterprise = Object.create(Manufactory);
enterprise.init(options);
workers.map(worker => {
  enterprise.addWorker(worker);
});
enterprise
  .initializeWorkers()
  .then((result) => {
    console.log('init: ok !');
    enterprise.dispatchers[3].on('result', msg => {
      console.log(msg);
      // process.stdout.write('.');
    });
    return enterprise.start();
  })
  .then(() => {
    console.log('stop !');
  })
  .catch((error) => {
    console.log(error);
  });
