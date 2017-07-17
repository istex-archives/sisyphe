'use strict';

const path = require('path'),
  winston = require('winston'),
  _ = require('lodash'),
  fs = require('fs');


const chainJobs = {}



// load tasks
let task = [],
  workers = [];

process.on('message', function(message) {
  if (message.hasOwnProperty('workers')) {
    task = []
    workers = (message && message.workers) ? message.workers : workers;
    for (let i = 0; i < workers.length; i++) {
      task[i] = require(path.resolve(__dirname, '../', 'worker', workers[i].module));
      if (task[i].init) {
        task[i].init(workers[i].options);
      }
    }
  }
  if (message.hasOwnProperty('push')) {
    message.job.data.info.processorNumber = process.env.WORKER_ID;
    launchJob(message.job.data, 0);
  }
  if (message.hasOwnProperty('exec')) {
    process.send({pull:true})
  }
})


function launchJob(data, taskNb) {
  task[taskNb].doTheJob(data, function(err, data) {
    if (err) {
      console.log('err',err);
      process.send({
        id: data.info.id,
        type: data.info.type,
        processedFiles: true,
        error: err
      });
      return;
    }
    // Send info to master to increment data
    workers[data.info.id].processedFiles++;
    sendInfo();
    // There are more worker to do with this job process
    if (data.info.id < workers.length -1 ) {
      data.info.id++;
      data.info.type = workers[data.info.id].name;
      launchJob(data, ++taskNb);
      return;
    }
    process.send({pull:true})
  });
}

let sendInfo = _.debounce(function() {

  for (var i = 0; i < workers.length; i++) {
    process.send({
      id: i,
      type: workers[i].module,
      processedFiles: workers[i].processedFiles,
      destination:'monitor'
    });
    workers[i].processedFiles = 0;
  }
}, 2000, {
  maxWait: 3000
});
