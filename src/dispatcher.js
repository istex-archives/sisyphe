const debounce = require('lodash').debounce;
const EventEmitter = require('events');

const Dispatcher = Object.create(new EventEmitter());

/**
 * @param {any} task
 * @param {any} options
 * @returns {Dispatcher}
 */
Dispatcher.init = function(task, options) {
  this.waitingQueue = [];
  this.tasks = task;
  this.options = options;
  return this;
};

/**
 * @param {Overseer} overseer
 * @returns {Dispatcher}
 */
Dispatcher.addToWaitingQueue = function(overseer) {
  this.waitingQueue.push(overseer);
  return this;
};

/**
  * @param {any} done callback (overseer)
  * @returns {Promise}
 */
Dispatcher.getPatient = function() {
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

Dispatcher.stop = debounce(function(stop) {
  this.tasks.getJobCounts().then(jobCounts => {
    if (jobCounts.active + jobCounts.waiting === 0) return stop();
    this.stop();
  });
}, 500);

Dispatcher.start = function() {
  return new Promise(resolve => {
    this.waitingQueue.map(overseer => {
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
