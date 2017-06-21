'use strict';

const path = require('path'),
  kue = require('kue'),
  winston = require('winston'),
  workers = require(path.resolve(__dirname, '..', 'temp', 'workers.json'));

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

const queue = kue.createQueue();

queue.on( 'error', function( err ) {
  debugLog.info(`Sysiphe-core-error: kue: `, err);
});


// load tasks`
let task = [];

function doTasks(taskNb,cb){
  // Create process queue listener (1 worker-type max per thread !!)
  //console.log('nbofworks ', process.env.WORKER_ID ,taskNb);
  queue.process(`${workers[taskNb].name}${process.env.WORKER_ID}`, 1, function (job, done) {
    job.data.info.processorNumber = process.env.WORKER_ID;
    task[taskNb].doTheJob(job.data, function (err, data) {
      if(err){
        process.send({id: data.info.id, type: data.info.type, processedFiles: true, error: true});
        return;
      }
      // Send info to master to increment data
      process.send({id: data.info.id, type: data.info.type, processedFiles: true});
      // There are more worker to do with this job process
      if(data.info.id < workers.length-1){
        data.info.id++;
        data.info.type = workers[data.info.id].name;
        queue.create(`${workers[data.info.id].name}${process.env.WORKER_ID}`, data).save();
      }
      done();
    });
  });
}

//create task listener
for(let i = 0; i < workers.length; i++){
  task[i] = require(path.resolve(__dirname, '../', 'worker', workers[i].module));
}

// Now listen to all new job task & do them
for(let i = 0; i < workers.length; i++){
  //Init the task
  if(task[i].init){
    task[i].init(workers[i].options);
  }
  doTasks(i);
}

//Monitor completed job to remove them
queue.on('job complete', function (id) {
  kue.Job.get(id, function (err, job) {
    if (err) {
      process.send({ error: 'Error happend when trying to get jobs in redis' });
    }
    job.remove(function(err){
      if (err) {
        process.send({ error: 'Error happend when trying to delete jobs in redis' });
      }
    });
  });
});