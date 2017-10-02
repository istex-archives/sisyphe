#!/usr/bin/env node
"use strict";

const bluebird = require('bluebird');
const program = require('commander');
const pkg = require('./package.json');
const path = require('path');
const Manufactory = require('./src/manufactory');
const monitoring = require('./src/monitoring');
const numCPUs = require('os').cpus().length;
const redis = require('redis');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const client = redis.createClient();
program
  .version(pkg.version)
  .usage('[options] <path>')
  .option('-n, --corpusname <name>', 'Corpus name', 'default')
  .option('-c, --config-dir <path>', 'Configuration folder path')
  .option('-t, --thread <number>', 'The number of process which sisyphe will take')
  .option('-r, --remove-module <name>', 'Remove module name from the workflow', appender(), [])
  .option('-s, --silent', 'Silence output', false)
  .parse(process.argv);

// Corpusname is default, we stop here
if (program.corpusname === 'default' || program.configDir === 'none') {
  program.outputHelp();
  process.exit(0);
}

const inputPath = path.resolve(program.args[0]);
const configDir = program.configDir ? path.resolve(program.configDir) : null;
const silent = program.silent;
const now = Date.now();
const options = {
  corpusname: program.corpusname,
  configDir,
  inputPath,
  numCPUs: program.thread || numCPUs,
  now,
  outputPath: path.resolve(`./out`, now.toString() + '-' + program.corpusname)
};

let workers = require(path.resolve(__dirname, 'src', 'worker.json')).workers;
// remove unwanted module
if(program.removeModule){
  workers = workers.filter(obj=>{
    return !program.removeModule.includes(obj);
  });
}

const sisyphe = {};

sisyphe.init = async function (workers) {
  this.workers = workers;
  await client.flushallAsync();
  await client.hmsetAsync('monitoring', 'start', Date.now(), 'workers', JSON.stringify(workers));
  this.enterprise = Object.create(Manufactory);
  this.enterprise.init(options);
  this.workers.map(worker => {
    this.enterprise.addWorker(worker);
  });
  await this.enterprise.initializeWorkers();
  await monitoring.updateLog('info', 'Initialisation OK');
  if (!silent) console.log('┌ All workers have been initialized');
};

sisyphe.launch = async function () {
  this.enterprise.dispatchers.map(dispatcher => {
    let i = 0;
    dispatcher.on('result', msg => {
      if (!silent) {
        i++;
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write('├──── ' + dispatcher.patients[0].workerType + ' ==> ' + i.toString());
      }
    });
    dispatcher.on('stop', async () => {
      const currentWorker = dispatcher.patients[0].workerType;
      const lastWorker = this.workers[this.workers.length - 1];
      if (!silent) process.stdout.write(' ==> ' + currentWorker + ' has finished\n');
      await monitoring.updateLog('info', currentWorker + ' has finished');
      if (currentWorker === lastWorker) {
        if (!silent) console.log('└ All workers have completed their work');
        await monitoring.updateLog('info', 'All workers have completed their work');
        await client.hmsetAsync('monitoring', 'end', Date.now());
        process.exit(0);
      }
    });
    dispatcher.on('error', async error => {
      monitoring.updateError(error);
    });
  });
  await this.enterprise.start();
};

sisyphe.init(workers).then(() => {
  return sisyphe.launch();
}).catch(err => {
  // console.log(err);
  monitoring.updateError(err);
});

// Continue sisyphe if an unknown error is happening
process.on('uncaughtException', function (err) {
  console.log('Sisyphe-core-error: An uncaughtException happened : ', err, 'error');
});
process.on('unhandledRejection', function (err) {
  console.log('Sisyphe-core-error: An uncaughtException happened : ', err, 'error');
});


// Uses to filter workers
function appender(xs) {
  xs = xs || [];
  return function (x) {
    xs.push(x);
    return xs;
  };
}
