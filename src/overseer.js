const fork = require('child_process').fork;
const path = require('path');
const Promise = require('bluebird');


/**
 * @constructor
 */
const Overseer = {};

/**
 * Init the overseer and his worker
 * @param {String} workerType
 * @param {Object} options
 * @param {Object} options.corpusname Name of the corpus
 * @param {Object} options.configDir Directory of the config
 * @param {Object} options.inputPath Root of jobs
 * @param {Object} options.numCpus How many Cpus is available
 * @return {Promise}
 */
Overseer.init = function (workerType, options) {
  this.workerType = workerType;
  this.options = options;
  this.fork = fork(path.join(__dirname, 'worker.js'));
  this.on = this.fork.on.bind(this.fork);
  const initObj = {
    type: 'initialize',
    worker: workerType,
    options
  };

  return new Promise((resolve, reject) => {
    this.fork.send(initObj, null, {}, error => {
      if (error) reject(error);
    });
    this.on('message', msg => {
      if (msg.isInitialized && msg.type === 'initialize') {
        this.fork.potentialError = msg.potentialError;
        resolve(this);
      }
      if (msg.type === 'error') {
        const error = new Error(msg.code);
        error.stack = msg.stack;
        reject(error);
      }
    });
  });
};


/**
 * Launch the final job of the worker
 * @return {Promise}  Empty promise
 */
Overseer.final = function () {
  const finalObj = {
    type: 'final'
  };
  return new Promise((resolve, reject) => {
    this.fork.on('message', msg => {
      if (msg.type === 'error') {
        const err = new Error(msg.message);
        [err.message, err.stack, err.code] = [msg.message, msg.stack, msg.code];
        reject(err);
      }
      if (msg.type === 'final') resolve(this);
    });
    this.fork.send(finalObj, null, {}, error => {
      if (error) reject(error);
    });
  });
};

/**
 * Send a job to the worker
 * @param {Object} obj Task to send in worker
 * @return {Promise}
 */
Overseer.send = function (obj) {
  const msg = {
    type: 'job',
    data: obj
  };
  this.currentData = obj;
  return new Promise((resolve, reject) => {
    this.fork.send(msg, null, {}, error => {
      if (error) return reject(error);
      this.fork.currentFile = obj;
      resolve();
    });
  });
};

module.exports = Overseer;
