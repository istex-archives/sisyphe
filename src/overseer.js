// Overseer
const fork = require('child_process').fork;
const path = require('path');
const Promise = require('bluebird');

/**
 * Container to manage a Worker (fork).
 * @constructor
 */
const Overseer = {};

/**
 * @param {String} workerType Name of the worker
 * @param {Object} options Options for dispatcher
 * @param {String} options.corpusName Corpus name
 * @param {String} options.configDir Path to config
 * @param {Number} options.numCPUs Number of cpu to use
 * @param {Number} options.now Session start
 * @param {String} options.outputPath Where to put results
 * @returns {Promise}
 */
Overseer.init = function (workerType, options, nbFork) {
  this.workerType = workerType;
  this.options = options;
  // check of casted value if important too
  let execOptions = (this.options && this.options.hasOwnProperty('debugMod') && this.options.hasOwnProperty('debugPort') && this.options.debugMod && this.options.debugPort)
    ? { execArgv: [`--inspect-brk=${(options.debugPort || 9444) + nbFork}`] }
    : { execArgv: [] };
  this.fork = fork(path.join(__dirname, 'worker.js'), execOptions);
  this.dataProcessing = {};
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
 * Launch final job of the worker
 * @return {Promise}
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
 * @param {any} obj
 * @returns {Promise}
 */
Overseer.send = function (obj) {
  const msg = {
    type: 'job',
    data: obj
  };

  return new Promise((resolve, reject) => {
    this.fork.send(msg, null, {}, error => {
      if (error) return reject(error);
      this.dataProcessing = obj;
      this.fork.dataProcessing = obj;
      resolve();
    });
  });
};

module.exports = Overseer;
