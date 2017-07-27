const Dispatcher = require('./dispatcher');
const Overseer = require('./overseer');
const Task = require('./task');
const Promise = require('bluebird');
const os = require('os');

const Manufactory = {};

/**
 * @param {Object} [options={ inputPath: '.', numCPUs: os.cpus().length }]
 * @returns {Manufactory}
 */
Manufactory.init = function (options = { inputPath: '.', numCPUs: os.cpus().length }) {
  this.workers = [];
  this.options = options;
  this.pathToAnalyze = options.inputPath;
  this.numCPUs = options.numCPUs;
  return this;
};

Manufactory.addWorker = function (worker) {
  this.workers.push(worker);
  return this;
};

/**
 * @returns {Promise}
 */
Manufactory.initializeWorkers = function () {
  return this.createDispatchers()
    .createOverseersForDispatchers()
    .then(() => {
      return this.bindDispatchers();
    });
};

/**
 * @returns {Promise}
 */
Manufactory.start = function () {
  return this.dispatchers[0].tasks.add({ directory: this.pathToAnalyze }).then(() => {
    return Promise.each(this.dispatchers, dispatcher => {
      return dispatcher.start();
    });
  });
};

/**
 * @returns {Manufactory}
 */
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

/**
 * @returns {Promise}
 */
Manufactory.createOverseersForDispatchers = function () {
  return Promise.map(this.dispatchers, dispatcher => {
    return Promise.map(Array.from(Array(this.numCPUs).keys()), numero => {
      const overseer = Object.create(Overseer);
      return overseer.init(dispatcher.options.name, this.options).then(overseer => {
        dispatcher.addToWaitingQueue(overseer);
        return overseer;
      });
    });
  });
};

/**
 * @returns {Manufactory}
 */
Manufactory.bindDispatchers = function () {
  this.dispatchers.map((dispatcher, index, array) => {
    dispatcher.tasks.on('failed', (job, err) => {
      console.log(err);
    });

    const isLastDispatcher = array.length === index + 1;
    if (isLastDispatcher) return;
    dispatcher.on('result', (msg) => {
      if (msg.data.hasOwnProperty('directory') && msg.data.hasOwnProperty('files')) {
        msg.data.directories.map(directory => dispatcher.tasks.add({ directory }));
        msg.data.files.map(file => this.dispatchers[index + 1].tasks.add(file));
      } else {
        this.dispatchers[index + 1].tasks.add(msg.data);
      }
    });
  });
  return this;
};

module.exports = Manufactory;
