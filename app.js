#!/usr/bin/env node --max_old_space_size=4096
'use strict';

const kue = require('kue'),
  redis = require('redis'),
  recluster = require('recluster'),
  program = require('commander'),
  fs = require('fs'),
  ms = require('pretty-ms'),
  colors = require('colors/safe'),
  bunyan = require('bunyan'),
  monitor = require('./src/monitor.js'),
  winston = require('winston'),
  Starter = require('./src/starter/walkfer-fs'),
  path = require('path');

let clusterWorkerSize = require('os').cpus().length,
  workers =  require('./src/workers.json');

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

let monitorWorkers = workers,
  workersListNames = [];
for(let id in workers){
  monitorWorkers[id].processedFiles = 0;
  monitorWorkers[id].color = workers[id].color;
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

let sisypheStartAt = new Date().getTime();

// Defined number of Thread to use, default is cores
clusterWorkerSize = program.thread || clusterWorkerSize;
fs.writeFileSync('temp/workers.json', JSON.stringify(workers));

const pathInput = program.args[0],
  startAt = Date.now();

// use update mod , to implement
if(!pathInput){
  console.error('no input specified');
  process.exit(0);
}

let walkInDisk = new Starter(pathInput);

// Start monitor
let sisypheMonitor = new monitor();

let updateMonitor = setInterval(function () {
    let progress = totalFoundFiles ? (totalPerformedFiles / totalFoundFiles) : 0;
    let color = "red";
    if (progress >= 0.25) color = "orange";
    if (progress >= 0.5) color = "yellow";
    if (progress >= 0.75) color = "green";
    sisypheMonitor.donut.setData([
      {percent: progress.toFixed(2), label: 'Total progression', 'color': color}
    ]);

    // Set info for all modules
    let data = [];
    for(let j = 0; j < monitorWorkers.length; j++){
      data[j] = [colors[monitorWorkers[j].color](workersListNames[j]),colors[monitorWorkers[j].color](monitorWorkers[j].processedFiles.toString())];
    }
    sisypheMonitor.tableModules.setData({headers: ['Type', 'Count'], data: data});
    // Global progression
    sisypheMonitor.tableProgress.setData({headers: ['Type', 'Count'], data: [
      [colors.green('totalPerformedFiles'), colors.green(totalPerformedFiles)],
      [colors.yellow('currentFoundFiles'), colors.yellow(currentFoundFiles)],
      [colors.yellow('totalFoundFiles'), colors.yellow(totalFoundFiles)],
      [colors.red('totalFailedTask'), colors.red(totalFailedTask)]
    ]});
    let currentime = new Date().getTime();
    let duration = ms(currentime - sisypheStartAt);
    sisypheMonitor.duration.setContent(duration);
    sisypheMonitor.screen.render();
  },3000);

// Check at redis connection
const clientRedis = redis.createClient();

clientRedis.on('error', function(err){
  sisypheMonitor.log.log(`Redis has a problem, is it started ? Check logs for informations`);
  debugLog.info('Sisyphe-core-error: Redis: ', err);
});

// Flush all redis database before start
clientRedis.flushall();

debugLog.info('Sisyphe-core : kue is connecting to redis ...');
sisypheMonitor.log.log('Sisyphe-core : kue is connecting to redis ...');
sisypheMonitor.screen.render();

// Call kue queue
const queue = kue.createQueue();
queue.on('error', function( err ) {
  debugLog.info(`Sisyphe-core-error: kue: ${err}`);
  sisypheMonitor.log.log(`error: kue: ${err}`);
  sisypheMonitor.screen.render();
});

//Start walking folder
let currentFoundFiles = 0, totalPerformedFiles= 0, totalFailedTask= 0, totalFoundFiles = 0;
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
})
.on('end', function () {
  totalFoundFiles = currentFoundFiles;
  // We only start heartbeat at the end when all files are in redis
  let timer = setInterval(function () {
    // check nb of completed jobs
    queue.completeCount( function( err, total ) {
      if(err){
        debugLog.info(`Sisyphe-core-error: Count-job: ${err}`);
        sisypheMonitor.log.log(`Sisyphe-core-error: Cannot count jobs !`);
      }
      if( total ===  currentFoundFiles*workers.length) {
        // Stop the interval listener
        clearInterval(timer);
        debugLog.info(`Sisyphe-core: All jobs proceded`);
        sisypheMonitor.log.log(`Sisyphe-core: All jobs proceded`);

        // This should be wrote with async
        for(let i = 0; i < workers.length; i++){
          let fTaks = require(path.resolve(__dirname, 'worker', workers[i].module));
          if(fTaks && fTaks.finalJob){
            debugLog.info(`Sisyphe-module: final-job: Starting final job of ${workers[i].name} ...`);
            sisypheMonitor.log.log(`Sisyphe-module: final-job: Starting final job of ${workers[i].name} ...`);
            // Exec finalJob, must be a standAlone function
            fTaks.finalJob(options,function (err) {
              let sisypheEndAt = new Date().getTime();
              let duration = ms(sisypheEndAt - sisypheStartAt);
              debugLog.info(`Sisyphe-core: end after ${duration}`);
              sisypheMonitor.log.log(`Sisyphe-core: end after ${duration}`);
              clearInterval(updateMonitor);
              if (err) {
                debugLog.info(`Sisyphe-module-error: final-job: Error in final job of ${workers[i].name} ${err}`);
                sisypheMonitor.log.log(`Error in final-job of ${workers[i].name} ...`);
                return;
              }
              debugLog.info(`Sisyphe-module: final-job:All final-jobs executed`);
              sisypheMonitor.log.log(`Sisyphe-module: final-job:All final-jobs executed`);
            });
          }
        }
      }
    });
  },500);
  //console.log('All files has been walked');
})
.on('error', function (err, item) {
  debugLog.info(`Sisyphe-core-error: walker: ${item} ${err}`);
  sisypheMonitor.log.log(`Error in walker ...`);
});


let sisypheCluster = recluster(path.join(__dirname, 'src', 'sisyphe.js'), {workers : clusterWorkerSize});
// sisypheMonitor.list.add(`Working with ${clusterWorkerSize} CPU`);
debugLog.info(`Cluster : Starting with ${clusterWorkerSize} CPU`);
sisypheMonitor.log.log(`Cluster : Starting with ${clusterWorkerSize} CPU`);
sisypheCluster.run();
//Update Minitor when jobs are done
let clusterList = sisypheCluster.workers();
for(let i = 0; i < clusterList.length; i++){
  clusterList[i].on('message', function (message) {
    //if it's the lastest job
    if(message.error){
      totalFailedTask++;
      debugLog.info(`Sisyphe-module-error: ${message.type}: `, message.error);
      sisypheMonitor.log.log(`Sisyphe-module-error: ${message.type}: `);
      return;
    }
    if(message.id === workers.length-1){
      totalPerformedFiles++;
    }
    if(message.processedFiles){
      //console.log(message.processedFiles, message.type, message.id);
      monitorWorkers[message.id].processedFiles++;
    }
  });
}


// Continue sisyphe if an unknow error is happening
process.on('uncaughtException', function(err) {
  debugLog.info(`Sisyphe-core-error: An uncaughtException happened : `, err);
  debugLog.info('Sisyphe-core-error: An uncaughtException happened, check logs');
});
