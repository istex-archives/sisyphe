'use strict';

const path = require('path'),
  kue = require('kue'),
  winston = require('winston'),
  _ = require('lodash'),
  workers = require(path.resolve(__dirname, '..', 'config', 'temp', 'workers.json'));

const queue = kue.createQueue();
queue.on( 'error', function( err ) {
  process.send({error: err});
});

// load tasks
let task = [];

function doTasks(taskNb,cb){
  // Create process queue listener (1 worker-type max per thread !!)
  queue.process(`${workers[taskNb].name}${process.env.WORKER_ID}`, 1, function (job, done) {
    job.data.info.processorNumber = process.env.WORKER_ID;
    task[taskNb].doTheJob(job.data, function (err, data) {
      if(err){
        process.send({id: data.info.id, type: data.info.type, processedFiles: true, error: err});
        return;
      }
      // Send info to master to increment data
      workers[data.info.id].processedFiles++;
      sendInfo();
      // There are more worker to do with this job process
      if(data.info.id < workers.length-1){
        data.info.id++;
        data.info.type = workers[data.info.id].name;
        queue.create(`${workers[data.info.id].name}${process.env.WORKER_ID}`, data).removeOnComplete( true ).save();
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

let sendInfo = _.debounce(function () {
  for(var i = 0; i< workers.length; i++){
    process.send({id: i, type: workers[i].module, processedFiles: workers[i].processedFiles});
    workers[i].processedFiles = 0;
  }
}, 2000, {maxWait: 3000});
