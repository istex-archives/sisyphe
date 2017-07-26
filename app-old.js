#!/usr/bin/env node --max_old_space_size=4096
'use strict';

const kue = require('kue'),
  redis = require('redis'),
  async = require('async'),
  recluster = require('recluster'),
  program = require('commander'),
  fs = require('fs'),
  ms = require('pretty-ms'),
  cp = require('child_process'),
  pm2 = require('pm2'),
  mkdirp = require('mkdirp'),
  winston = require('winston'),
  path = require('path'),
  dispatcher = require('./src/dispatcher');

program
.version('0.0.1')
.usage('[options] <path>')
.option('-n, --corpusname <name>', 'Choose an identifier \'s Name', 'default')
.option('-c, --config-dir <path>', 'Config folder path')
.option('-o, --output <all/json>', 'Output destination')
.option('-t, --thread <number>', 'Number of fork to create via Node cluster')
.option('-r, --remove-module <name>', 'Remove module name from the workflow', appender(), [])
.option('-m, --monitor-refresh <number>', 'Set refresh rate of monitor', appender(), [])
.parse(process.argv);


/************/
/*  ARGVS  */
/***********/
// Corpusname is default, we stop here
if (program.corpusname === 'default') {
  program.outputHelp();
  process.exit(0);
}

//Check if debug mode is on
let isInspected = false;
for(let arg of process.execArgv){
  console.log(arg);
  if(arg.includes('--inspect')){
    isInspected = true;
    break;
  }
}


/************/
/* WORKERS  */
/***********/
let workers =  require('./config/workers.json');
// remove unwanted module
if(program.removeModule){
  workers = workers.filter(obj=>{
    return !program.removeModule.includes(obj.name);
  });
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

/************/
/*   CPUS  */
/***********/
// ~~ Is taking the entire part of a number
let nbOfCPUS = require('os').cpus().length,
  walkerCPUS = ~~(nbOfCPUS * (1/4)) || 1,
  chainJobsCPUS = program.thread || ~~(nbOfCPUS * (2/3)) || 1;

const pathInput = program.args[0],
  startAt = Date.now();

// use update mod , to implement
if(!pathInput){
  console.error('no input specified');
  process.exit(0);
}

/************/
/*  DEBUG  */
/***********/
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

/************/
/*  REDIS  */
/***********/
// Check at redis connection
const clientRedis = redis.createClient();
clientRedis.on('error', function(err){
  updateLog('Redis has a problem, is it started ? Check logs for informations',err,'error');
});
// Flush all redis database before start
clientRedis.flushall();


/************/
/* Monitor */
/***********/
let monitor = cp.fork('src/monitor.js');
let refresh = program.monitorRefresh.length ? program.monitorRefresh : 3000
monitor.send({workers, startAt, workersListNames, refresh});
monitor.on('exit', function(code){
  console.log('Close sisyphe');
  process.exit(0);
});



/************/
/* WALKER  */
/***********/
let currentFoundFiles = 0, totalPerformedFiles= 0, totalFailedTask= 0, totalFoundFiles = 0, totalPermormedTasks = 0;
let walkerList = [];
fs.readdir(pathInput, function (err, elements) {
  if(err){
    updateLog('Sisyphe-core: Cannot read Input: ', err, 'error');
    monitor.send({stop: true});
    return;
  }
  // Split directory files & folders entry into walkerCPUS lenght
  const splitedArray = [];
  const lot = elements.length/walkerCPUS;
  for (var i = 0; i < elements.length; i= i + lot) {
    splitedArray.push(elements.slice(i,i+lot));
  }
  // Start Walker cluster
  let finishedWalker = 0;
  for (var i = 0; i < walkerCPUS; i++) {
    const walkerFork = cp.fork(path.join(__dirname, 'src', 'starter', 'walker-fs.js'));
    walkerList.push(walkerFork);
    walkerFork.send({pathInput, input: splitedArray[i], chainJobsCPUS, workers});
    walkerFork.on('message', function (message) {
      let iAmAWalker = this
      if(message.currentFoundFiles){
        currentFoundFiles+= message.currentFoundFiles;
        monitor.send({currentFoundFiles});
      }
      // A walker has finished its tasks
      if(message.end){
        finishedWalker++;
        // All walker have finished their tasks
        updateLog(`Sisyphe-core: walker N°${finishedWalker} has finished`,null,'walker');
        if(finishedWalker === walkerList.length){
          totalFoundFiles = currentFoundFiles;
          updateLog('Sisyphe-core: Walker: All files found',null,'walker');
          // We only start heartbeat at the end when all files are in redis
          let timer = setInterval(function () {
            monitor.send({totalFoundFiles, totalPerformedFiles, totalFailedTask, currentFoundFiles, workers});
            // check nb of completed jobs
            if (totalPermormedTasks < currentFoundFiles * workers.length) {
              // All jobs have not been done, continue
              return;
            }
            dispatcher.finish()
            // Stop the interval listener
            clearInterval(timer);
            updateLog('Sisyphe-core: All files proceded');
            // Stop the monitor but do not quit it
            execFinaljobs(function (err) {
              if(err){
                updateLog(`Sisyphe-Core: final-jobs-errors: ${err}`, err);
              }
              let sisypheEndAt = new Date().getTime();
              let duration = ms(sisypheEndAt - startAt);
              updateLog(`Sisyphe-core: end after ${duration}`);
              monitor.send({stop: true});
            });
          },3000);
        }
        setTimeout(function () {
          iAmAWalker.kill('SIGKILL')
        }, 100);

      }
    });
  }
});


/************/
/*DISPATCHER*/
/************/
dispatcher.init({pathTasks: path.join(__dirname, 'src', 'taskRedis'), redisKey: workers[0].name})
for (var i = 0; i < chainJobsCPUS; i++) {
  const chainJob = cp.fork('./src/chain-jobs')
  chainJob.send({exec:true, workers}) // say to fork to exec when up with chain of workers
  chainJob.on('message',message=>{ // attach all out event
       if(message.error){
         totalFailedTask++;
         updateLog(`Sisyphe-module-error: ${message.type}: `, message.error, 'error');
       }
       if(message.id === workers.length-1){
         totalPerformedFiles+= message.processedFiles;
       }
       if(message.processedFiles){
         workers[message.id].processedFiles += message.processedFiles;
         totalPermormedTasks += message.processedFiles;
       }
       monitor.send({totalFailedTask,totalPerformedFiles,currentFoundFiles,workers});
  })
  dispatcher.subscribe(chainJob) // dispatcher need to know each fork
}



// Continue sisyphe if an unknown error is happening
process.on('uncaughtException', function(err) {
  updateLog('Sisyphe-core-error: An uncaughtException happened : ', err, 'error');
});

// Executes all finaljobs
function execFinaljobs(done) {
  async.forEachOf(workers, function (val,i,next) {
    let fTaks = require(path.resolve(__dirname, 'worker', val.module));
    if(fTaks && fTaks.finalJob){
      updateLog(`Sisyphe-module: final-job: Starting final job of ${val.name} ...`);
      // Exec finalJob, must be a standAlone functions
      fTaks.finalJob(options,function (err) {
        if (err) {
          updateLog(`Sisyphe-module-error: final-job: Error in final job of ${val.name}`,err);
          return next(err);
        }
        updateLog(`Sisyphe-module: final-job:${val.name} executed`);
        next();
      });
    }else{
      next();
    }
  },done);
}

// Uses to update Monitor & debug File
function updateLog(log,err,type) {
  monitor.send({log,type});
  debugLog.info(log,err);
}

// Uses to filter workers
function appender(xs) {
  xs = xs || [];
  return function (x) {
    xs.push(x);
    return xs;
  };
}
