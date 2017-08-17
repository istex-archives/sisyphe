#!/usr/bin/env node

const program = require('commander');
const pkg = require('./package.json');
const path = require('path');
const Manufactory = require('./src/manufactory');
const numCPUs = require('os').cpus().length;
const Queue = require('bull');
const redis = require("redis")
const bluebird = require('bluebird')
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
const silent = program.silent


const options = {
  corpusname: program.corpusname,
  configDir,
  inputPath,
  numCPUs
}

const Sisyphe = function() {}

Sisyphe.prototype.init = async function(workers) {
  this.log = {
    error: [],
    warning: [],
    info: ["Initialisation"]
  }
  this.workers = workers;
  await client.flushallAsync()
  await client.hmsetAsync("monitoring", "start", Date.now(), "log", JSON.stringify(this.log));
  this.enterprise = Object.create(Manufactory);
  this.enterprise.init(options);
  this.workers.map(worker => {
    this.enterprise.addWorker(worker);
  });
  await this.enterprise.initializeWorkers()
}

Sisyphe.prototype.launch = async function() {
  this.enterprise.start()
  this.enterprise.dispatchers.map(dispatcher => {
    let i = 0
    dispatcher.on('result', msg => {
      if (!silent) {
        i++
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write('├──── ' + dispatcher.patients[0].workerType + ' ==> ' + i.toString());
      }
    });
    dispatcher.on('stop', async patients => {
      const currentWorker = patients[0].workerType
      const lastWorker = this.workers[this.workers.length - 1]
      if (!silent) process.stdout.write(' ==> ' + currentWorker + ' has finished\n');
      await patients[0].final() // execute finaljob
      patients.map(patient => { // clean forks when finalJob is ending
        patient.fork.kill('SIGTERM');
      })
      if (currentWorker === lastWorker) {
        if (!silent) console.log('└ All workers have completed their work');
        await client.hsetAsync("monitoring", "end", Date.now())
        process.exit(0)
      }
    })
  });
}


const sisyphe = new Sisyphe()
sisyphe.init(['walker-fs', 'filetype', 'pdf', 'xml', 'xpath', 'out']).then(_ => {
  return sisyphe.launch()
}).then(_ => {
  if (!silent) console.log('┌ All workers have been initialized');
}).catch(err => {
  console.log(err);
})
