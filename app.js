#!/usr/bin/env node --max_old_space_size=4096
'use strict';

const kue = require('kue'),
  redis = require('redis'),
  recluster = require('recluster'),
  program = require('commander'),
  fs = require('fs'),
  ms = require('pretty-ms'),
  cp = require('child_process'),
  bunyan = require('bunyan'),
  mkdirp = require('mkdirp'),
  winston = require('winston'),
  Starter = require('./src/starter/walkfer-fs'),
  path = require('path');

let clusterWorkerSize = require('os').cpus().length,
  workers =  require('./config/workers.json');

// Uses to filter workers
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
.option('-t, --thread <number>', 'Number of fork to create via Node cluster')
.option('-r, --remove-module <name>', 'Remove module name from the workflow', appender(), [])
.parse(process.argv);

//Check if debug mode is on
let isInspected = false;
for(let arg of process.execArgv){
  console.log(arg);
  if(arg.includes('--inspect')){
    isInspected = true;
    break;
  }
}

// remove unwanted module
if(program.removeModule){
  workers = workers.filter(obj=>{
    return !program.removeModule.includes(obj.name);
  });
}

// Corpusname is default, we stop here
if (program.corpusname === 'default') {
  program.outputHelp();
  process.exit(0);
}

// Options are send to all workers
let options = {
  corpusname: program.corpusname,
  configDir: program.configDir,
  output: program.output,
  isInspected
};

let workersListNames = [];
for(let id in workers){
  workers[id].processedFiles = 0;
  workers[id].options = options;
  workers[id].options.name = workers[id].name;
  workers[id].options.id = id;
  workersListNames.push(workers[id].name);
}

const debugLog = new (winston.Logger)({
  exitOnError: false,
  transports: [
    new (winston.transports.File)({
      name: 'sisyphe-info',
      filename: 'logs/sisyphe.json',
      level: 'info'
    })
  ]
});

// Defined number of Thread to use, default is cores
clusterWorkerSize = program.thread || clusterWorkerSize;
fs.writeFileSync('config/temp/workers.json', JSON.stringify(workers));

const pathInput = program.args[0],
  startAt = Date.now();

// use update mod , to implement
if(!pathInput){
  console.error('no input specified');
  process.exit(0);
}

let walkInDisk = new Starter(pathInput);

let monitor = cp.fork('src/monitor.js');

monitor.send({workers, startAt, workersListNames});
monitor.on('exit', (code)=>{
  console.log('Close main program');
  process.exit(0);
  return;
});

// Check at redis connection
const clientRedis = redis.createClient();

clientRedis.on('error', function(err){
  updateLog('Redis has a problem, is it started ? Check logs for informations',err);
});

// Flush all redis database before start
clientRedis.flushall();

// Call kue queue
const queue = kue.createQueue();
updateLog('Sisyphe-core : kue is connecting to redis ...');
queue.on('error', function( err ) {
  updateLog('Sisyphe-core-error: kue ', err);
});

//Start walking folder
let currentFoundFiles = 0, totalPerformedFiles= 0, totalFailedTask= 0, totalFoundFiles = 0, totalPermormedTasks = 0;
walkInDisk.getFiles();

/*
* check walking events
 */
walkInDisk.on('files', function (files) {
  for(var i = 0; i < files.length; i++){
    currentFoundFiles++;
    let randomProcessor = Math.floor(Math.random() * clusterWorkerSize);
    files[i].info = { id: 0, type: workers[0].name};
    queue.create(`${workers[0].name}${randomProcessor}`, files[i]).removeOnComplete( true ).save();
  }
  monitor.send({totalFoundFiles,totalPerformedFiles,totalFailedTask,currentFoundFiles, workers});
})
.on('end', function () {
  totalFoundFiles = currentFoundFiles;
  // We only start heartbeat at the end when all files are in redis
  let timer = setInterval(function () {
    monitor.send({totalFoundFiles,totalPerformedFiles,totalFailedTask,currentFoundFiles, workers});
    // check nb of completed jobs
    if( totalPermormedTasks <  currentFoundFiles*workers.length) {
      // All jobs have not bee done, continue
      return;
    }
    // Stop the interval listener
    clearInterval(timer);
    updateLog('Sisyphe-core: All files proceded');

    // This should be wrote with async to wait final jobs end
    for(let i = 0; i < workers.length; i++){
      let fTaks = require(path.resolve(__dirname, 'worker', workers[i].module));
      if(fTaks && fTaks.finalJob){
        updateLog(`Sisyphe-module: final-job: Starting final job of ${workers[i].name} ...`);
        // Exec finalJob, must be a standAlone functions
        fTaks.finalJob(options,function (err) {
          let sisypheEndAt = new Date().getTime();
          let duration = ms(sisypheEndAt - startAt);
          updateLog(`Sisyphe-core: end after ${duration}`);
          monitor.send({stop: true});
          // clearInterval(updateMonitor);
          if (err) {
            updateLog(`Sisyphe-module-error: final-job: Error in final job of ${workers[i].name}`,err);
            return;
          }
          updateLog('Sisyphe-module: final-job:All final-jobs executed')
        });
      }
    }
  },500);
})
.on('error', function (err, item) {
  updateLog('Sisyphe-core-error: walker: ', err);
});

let sisypheCluster = recluster(path.join(__dirname, 'src', 'chain-jobs.js'), {workers : clusterWorkerSize});
updateLog(`Cluster : Starting with ${clusterWorkerSize} CPU`);
sisypheCluster.run();
let clusterList = sisypheCluster.workers();
for(let i = 0; i < clusterList.length; i++){
  clusterList[i].on('message', function (message) {
    //if it's the lastest job
    if(message.error){
      totalFailedTask++;
      updateLog(`Sisyphe-module-error: ${message.type}: `, message.error);
      return;
    }
    if(message.id === workers.length-1){
      totalPerformedFiles++;
    }
    if(message.processedFiles){
      workers[message.id].processedFiles++;
      totalPermormedTasks++;
    }
  });
}


// Continue sisyphe if an unknown error is happening
process.on('uncaughtException', function(err) {
  debugLog.info(`Sisyphe-core-error: An uncaughtException happened : `, err);
  debugLog.info('Sisyphe-core-error: An uncaughtException happened, check logs');
  updateLog('Sisyphe-core-error: An uncaughtException happened : ', err);
});

function updateLog(log,err) {
  monitor.send({log});
  debugLog.info(log,err);
}
