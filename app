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
const readline = require('readline')
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
const configFilename = 'sisyphe-conf.json'; // standard name for a configuration file in sisyphe
const configDir = program.configDir ? path.resolve(program.configDir) : null;
const sharedConfigDir = configDir ? path.resolve(configDir, "../shared") : null; // stanard path for the shared configuration directory
const config = configDir ? require(path.resolve(configDir, configFilename)) : null; // Object representation of sisyphe configuration (or null)
const silent = program.silent;
const now = Date.now();
const options = {
  corpusname: program.corpusname,
  sharedConfigDir,
  configDir,
  configFilename,
  config,
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

/**
 * EntryPoint to Sisyphe
 * @constructor
 */
const sisyphe = {};

/**
 * Init Sisyphe and all components
 * @param {Array.<String>} workers Array with the name of workers
 */
sisyphe.init = async function (workers) {
  this.workers = workers;
  await client.flushallAsync();
  await client.hmsetAsync('monitoring', 'start', Date.now(), 'workers', JSON.stringify(workers), 'corpusname', program.corpusname);
  this.enterprise = Object.create(Manufactory);
  this.enterprise.init(options);
  this.workers.map(worker => {
    this.enterprise.addWorker(worker);
  });
  await this.enterprise.initializeWorkers();
  await monitoring.updateLog('info', 'Initialisation OK');
  if (!silent) console.log('┌ All workers have been initialized');
};

/**
 * Launch sisyphe
 */
sisyphe.launch = async function () {
  this.enterprise.dispatchers.map(dispatcher => {
    let i = 0;
    dispatcher.on('result', msg => {
      if (!silent) {
        i++;
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0, null);
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

process.stdin.resume();

let exit = false;
async function exitHandler (options, err) {
  if (!exit) {
    await client.hmsetAsync('monitoring', 'end', Date.now());
    exit = true;
    process.exit(0);
  }
}

//do something when app is closing
process.on("exit", exitHandler.bind(null, { exit: true }));

//catches ctrl+c event
process.on("SIGINT", exitHandler.bind(null, { exit: true }));

process.on("SIGTERM", exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on("uncaughtException", exitHandler.bind(null, { exit: true }));