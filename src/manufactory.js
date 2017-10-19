const Dispatcher = require('./dispatcher');
const Overseer = require('./overseer');
const Task = require('./task');
const Promise = require('bluebird');
const os = require('os');

/**
 * Manage all Dispatchers. When a Dispatcher is finished, the next one is called
 * @constructor 
 */
const Manufactory = {};

/**
 * @param {Object} options Options for dispatcher
 * @param {String} options.corpusName Corpus name 
 * @param {String} options.configDir Path to config
 * @param {Number} options.numCPUs Number of cpu to use
 * @param {Number} options.now Session start
 * @param {String} options.outputPath Where to put results
 * @returns {Manufactory}
 */
Manufactory.init = function (options = { inputPath: '.', numCPUs: os.cpus().length }) {
  this.workers = [];
  this.options = options;
  this.pathToAnalyze = options.inputPath;
  this.numCPUs = options.numCPUs;
  return this;
};

/**
 * Add name of the worker to the list of workers
 * @param {String} worker Name of a Worker
 * @return {Manufactory}
 */
Manufactory.addWorker = function (worker) {
  this.workers.push(worker);
  return this;
};

/**
 * Initialize all dispatcher and put Overseers in it
 * @returns {Promise}
 */
Manufactory.initializeWorkers = function () {
  return this.createDispatchers().createOverseersForDispatchers().then(() => {
    return this.bindDispatchers();
  });
};

/**
 * Launch final job on all workers
 */
Manufactory.final = function () {
  return Promise.map(this.dispatchers, dispatcher => {
    return dispatcher.patients[0].final();
  });
};

/**
 * Launch the first Dispatcher and the other after the end of each
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
 * Create a Dispatchers, Tasks and bind them
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
 * For each Dispatcher, we create the number of CPU of Overseers
 * @returns {Promise}
 */
Manufactory.createOverseersForDispatchers = function () {
  return Promise.map(this.dispatchers, dispatcher => {
    return Promise.map(Array.from(Array(this.numCPUs).keys()), numero => {
      const overseer = Object.create(Overseer);
      return overseer.init(dispatcher.options.name, this.options).then(overseer => {
        dispatcher.addPatient(overseer);
        return overseer;
      });
    });
  });
};

/**
 * Bind events to Dispatchers and manage the loop of the walker-fs
 * @returns {Manufactory}
 */
Manufactory.bindDispatchers = function () {
  this.dispatchers.map((dispatcher, index, array) => {
    const isLastDispatcher = array.length === index + 1;
    if (isLastDispatcher) return;
    dispatcher.on('result', msg => {
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
