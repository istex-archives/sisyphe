const debounce = require('lodash').debounce;
const Promise = require('bluebird');
const EventEmitter = require('events');

const Dispatcher = Object.create(EventEmitter.prototype);

/**
 * @param {any} task
 * @param {any} options
 * @returns {Dispatcher}
 */
Dispatcher.init = function (task, options) {
  EventEmitter.call(this);
  this.patients = [];
  this.waitingQueue = [];
  this.tasks = task;
  this.options = options;
  return this;
};

/**
 * @param {Overseer} overseer
 * @returns {Dispatcher}
 */
Dispatcher.addPatient = function (overseer) {
  this.patients.push(overseer);
  this.waitingQueue.push(overseer);
  return this;
};

/**
 * @param {Overseer} overseer
 * @returns {Dispatcher}
 */
Dispatcher.addToWaitingQueue = function (overseer) {
  this.waitingQueue.push(overseer);
  return this;
};

/**
  * @param {any} done callback (overseer)
  * @returns {Promise}
 */
Dispatcher.getPatient = function () {
  return new Promise(resolve => {
    if (this.waitingQueue.length !== 0) return resolve(this.waitingQueue.shift());
    const checkPatientIsAvailable = setInterval(() => {
      if (this.waitingQueue.length !== 0) {
        clearInterval(checkPatientIsAvailable);
        resolve(this.waitingQueue.shift());
      }
    }, 10);
  });
};

Dispatcher.stop = debounce(function (callback) {
  this.tasks.getJobCounts().then(jobCounts => {
    if (jobCounts.active + jobCounts.waiting === 0) {
      this.emit('stop', this.patients)
      return callback();
    }
    this.stop();
  });
}, 500);

Dispatcher.start = function () {
  return new Promise(resolve => {
    this.patients.map(overseer => {
      overseer.on('message', msg => {
        if (msg.hasOwnProperty('type') && msg.type === 'job') {
          this.emit('result', msg);
          this.addToWaitingQueue(overseer);
          this.stop(resolve);
        }
      });
    });

    this.tasks.process(job => {
      return this.getPatient().then(overseer => {
        return overseer.send(job.data);
      });
    });
  });
};

module.exports = Dispatcher;
