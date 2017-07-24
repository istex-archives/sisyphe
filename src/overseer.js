const fork = require('child_process').fork;
const path = require('path');

const Overseer = {};

Overseer.init = function (WorkerType, done) {
  this.fork = fork(path.join(__dirname, 'worker.js'));
  this.on = this.fork.on.bind(this.fork);
  const initObj = {
    type: 'initialize',
    worker: WorkerType
  };
  this.fork.send(initObj, null, {}, done);
};

Overseer.send = function (obj, done) {
  const msg = {
    type: 'job',
    data: obj
  };
  this.fork.send(msg, null, {}, done);
};

module.exports = Overseer;
