const path = require('path'),
  winston = require('winston'),
  _ = require('lodash'),
  cp = require('child_process'),
  recluster = require('recluster'),
  async = require('async'),
  Promise = require('bluebird');

const Dispatcher = {}

const listWorkers = []

Dispatcher.init = function (options) {
  this.tasks = require(options.pathTasks) // load queue file
  this.tasks.init(options) // pass options to queue file
}

Dispatcher.subscribe = function (worker) {
  listWorkers.push(worker)
  worker.on('message', function(message){
    // if worker ask a task
    if (message.hasOwnProperty('pull')) Dispatcher.pull(this)
  })
}

Dispatcher.push = function (worker,data) {
  worker.send({push:true, job:data})
}


Dispatcher.pull = function (worker) {
  this.tasks.get(1).then((jobs,done)=>{
    this.push(worker, jobs[0])
  })
}

module.exports = Dispatcher
