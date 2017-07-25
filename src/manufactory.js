const Dispatcher = require('./dispatcher');
const Overseer = require('./overseer');
const Task = require('./task');
const Promise = require('bluebird');
const os = require('os');

const Manufactory = {};

Manufactory.init = function (options = { inputPath: '.', numCPUs: os.cpus().length }) {
  this.workers = [];
  this.pathToAnalyze = options.inputPath;
  this.numCPUs = options.numCPUs;
  return this;
};

Manufactory.addWorker = function (worker) {
  this.workers.push(worker);
  return this;
};

Manufactory.initializeWorkers = function () {
  // create dispatcher avec Task pour chaque worker
  this.createDispatchers();
  // create overseers pour chaque dispatcher
  this.createOverseersForDispatchers();
  // add Overseers dans dispatcher de chaque worker
};

Manufactory.createDispatchers = function () {
  this.dispatchers = this.workers.map(worker => {
    const task = Object.create(Task);
    task.init({ name: worker });
    const dispatcher = Object.create(Dispatcher);
    dispatcher.init(task, {
      name: worker
    });
    return dispatcher;
  });
  return this;
};

Manufactory.createOverseersForDispatchers = function () {
  return Promise.map(this.dispatchers, (dispatcher, index, array) => {
    return Promise.map(Array.from(Array(this.numCPUs).keys()), numero => {
      const overseer = Object.create(Overseer);
      return overseer.init(dispatcher.options.name).then((overseer) => {
        dispatcher.addToWaitingQueue(overseer);
        return overseer;
      });
    });
  });
};

module.exports = Manufactory;
