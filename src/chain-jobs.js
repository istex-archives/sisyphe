'use strict';

const path = require('path'),
  kue = require('kue'),
  winston = require('winston'),
  _ = require('lodash');

const queue = kue.createQueue();
queue.on( 'error', function( err ) {
  process.send({error: err});
});

// load tasks
let task = [],
  workers = [];

process.on('message', function (options) {

  workers = (options && options.workers) ? options.workers : workers;

  //create task listener
  for(let i = 0; i < workers.length; i++){
    task[i] = require(path.resolve(__dirname, '../', 'worker', workers[i].module));
    if(task[i].init){
      task[i].init(workers[i].options);
    }
  }

  // Create process queue listener (1 worker-type max per thread !!)
  queue.process(`${workers[0].name}${process.env.WORKER_ID}`, 8, function (job, done) {
    let taskNb = 0;
    job.data.info.processorNumber = process.env.WORKER_ID;
    launchJob(job.data,taskNb,done);
  });
})


function launchJob(data,taskNb,done) {
  task[taskNb].doTheJob(data, function (err, data) {
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
      launchJob(data,++taskNb,done);
      return;
    }
    done();
  });
}

let sendInfo = _.debounce(function () {
  for(var i = 0; i< workers.length; i++){
    process.send({id: i, type: workers[i].module, processedFiles: workers[i].processedFiles});
    workers[i].processedFiles = 0;
  }
}, 2000, {maxWait: 3000});
