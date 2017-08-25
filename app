#!/usr/bin/env node

const program = require('commander');
const pkg = require('./package.json');
const path = require('path');
const Manufactory = require('./src/manufactory');
const numCPUs = require('os').cpus().length;
const redis = require('redis');
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);
const client = redis.createClient();

program
  .version(pkg.version)
  .usage('[options] <path>')
  .option('-n, --corpusname <name>', 'Corpus name', 'default')
  .option('-c, --config-dir <path>', 'Configuration folder path', 'none')
  .option('-s, --silent', 'Silence output', false)
  .parse(process.argv);

// Corpusname is default, we stop here
if (program.corpusname === 'default' || program.configDir === 'none') {
  program.outputHelp();
  process.exit(0);
}

const argPath = program.args[0];
const inputPath = argPath.charAt(0) === '/' ? argPath : path.join(__dirname, argPath);
const configDirOpt = program.configDir;
const configDir = configDirOpt.charAt(0) === '/' ? configDirOpt : path.join(__dirname, configDirOpt);
const silent = program.silent;
const now = Date.now();
const options = {
  corpusname: program.corpusname,
  configDir,
  inputPath,
  numCPUs,
  now
};

const sisyphe = {};

sisyphe.init = async function (workers) {
  this.log = {
    error: [],
    warning: [],
    info: []
  };
  this.workers = workers;
  await client.flushallAsync();
  await client.hmsetAsync('monitoring', 'start', Date.now(), 'workers', JSON.stringify(workers));
  this.enterprise = Object.create(Manufactory);
  this.enterprise.init(options);
  this.workers.map(worker => {
    this.enterprise.addWorker(worker);
  });
  await this.enterprise.initializeWorkers();
  await this.updateLog('info', 'Initialisation OK');
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
    dispatcher.on('stop', async patients => {
      const currentWorker = patients[0].workerType;
      const lastWorker = this.workers[this.workers.length - 1];
      if (!silent) process.stdout.write(' ==> ' + currentWorker + ' has finished\n');
      await this.updateLog('info', currentWorker + ' has finished');
      for (var i = 0; i < patients.length; i++) {
        var patient = patients[i];
        if (!patient.signalCode==='SIGSEGV') {
          await patient.final().catch(err=>err)
        } 
      }
      patients.map(patient => { // clean forks when finalJob is ending
        patient.fork.kill('SIGTERM');
      });
      if (currentWorker === lastWorker) {
        if (!silent) console.log('└ All workers have completed their work');
        await this.updateLog('info', 'All workers have completed their work');
        await client.hmsetAsync('monitoring', 'end', Date.now());
        process.exit(0);
      }
    });
    dispatcher.on('error', async error => {
      console.error(error);
      this.updateLog('error', error);
    });
  });
  await this.enterprise.start();
};

sisyphe.updateLog = async function (type, string) {
  if (type === 'error') {
    console.error(string);
    string = string.message + ': ' + string.stack.split('\n')[1];
  }
  this.log[type].push(string);
  await client.hsetAsync('monitoring', 'log', JSON.stringify(this.log));
};

sisyphe.init(['walker-fs', 'filetype', 'pdf', 'xml', 'xpath', 'out']).then(() => {
  return sisyphe.launch();
}).catch(err => {
  sisyphe.updateLog('error', err);
});
