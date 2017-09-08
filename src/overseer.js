const fork = require('child_process').fork;
const path = require('path');
const Promise = require('bluebird');

const Overseer = {};

/**
 * @param {any} WorkerType
 * @returns Promise
 */
Overseer.init = function (workerType, options) {
  this.workerType = workerType;
  this.options = options;
  this.fork = fork(path.join(__dirname, 'worker.js'));
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
 * @param {any} obj
 * @returns Promise
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
      resolve();
    });
  });
};

module.exports = Overseer;
