const fork = require('child_process').fork;
const path = require('path');
const Promise = require('bluebird');

const Overseer = {};

// TODO ajouter un listener sur exit lors d'un kill du worker et lancer un re-fork !

/**
 * @param {any} WorkerType
 * @returns Promise
 */
Overseer.init = function (WorkerType, options) {
  this.fork = fork(path.join(__dirname, 'worker.js'));
  this.on = this.fork.on.bind(this.fork);
  const initObj = {
    type: 'initialize',
    worker: WorkerType,
    options
  };
  return new Promise((resolve, reject) => {
    this.fork.send(initObj, null, {}, error => {
      if (error) reject(error);
    });
    this.fork.once('message', msg => {
      if (msg.isInitialized) resolve(this);
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
      error ? reject(error) : resolve();
    });
  });
};

module.exports = Overseer;
