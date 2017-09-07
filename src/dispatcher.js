const debounce = require('lodash').debounce;
const Promise = require('bluebird');
const EventEmitter = require('events');
const Overseer = require('./overseer');
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
  this.tasks.on('failed', (job, error) => {
    this.emit('error', error);
  });
  this.options = options;
  return this;
};

/**
 * @param {Overseer} overseer
 * @returns {Dispatcher}
 */
Dispatcher.addPatient = function (overseer) {
  overseer.on('message', msg => {
    if (msg.type === 'error') {
      const err = new Error(msg.message);
      [err.message, err.stack, err.code] = [msg.message, msg.stack, msg.code];
      this.emit('error', err);
    }
  });
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

Dispatcher.stillJobToDo = debounce(function (callback) {
  this.tasks
  .getJobCounts()
  .then(jobCounts => {
    const readyToStop = jobCounts.active + jobCounts.waiting === 0;
    readyToStop ? callback() : this.stillJobToDo();
    })
    .catch(error => {
      this.emit('error', error);
    });
}, 500);

Dispatcher.start = function () {
  return new Promise(resolve => {
    this.resolve = resolve
    this.patients.map(overseer => {
      overseer.on('message', msg => {
        if (msg.hasOwnProperty('type') && msg.type === 'job') {
          this.emit('result', msg);
          this.addToWaitingQueue(overseer);
          this.stillJobToDo(resolve);
        }
      });
      overseer.on('exit', (code, signal) => {
        this.exit(signal).then(() => {
          this.stillJobToDo(resolve);
        });
      });
    });

    this.tasks.process(job => {
      return this.getPatient().then(overseer => {
        return overseer.send(job.data);
      });
    });
  });
};
Dispatcher.exit = function (signal) {
  if (signal === 'SIGSEGV') {
    const deadPatient = this.extractDeadPatient();
    return this.resurrectPatient(deadPatient).then(() => {
      const error = {
        message: 'Child process has been stopped',
        stack: `Signal: ${signal}`,
        infos: deadPatient.dataProcessing
      };
      this.emit('error', error);
    });
  }
  return Promise.resolve();
};

Dispatcher.resurrectPatient = async function (deadPatient) {
  const newOverseer = await Object.create(Overseer).init(deadPatient.workerType, deadPatient.options);
  newOverseer.on("exit", (code, signal) => {
    this.exit(signal).then(() => {
      this.stillJobToDo(this.resolve);
    });
  });
  this.addPatient(newOverseer);
};

Dispatcher.extractDeadPatient = function () {
  let deadPatient;
  for (var i = 0; i < this.patients.length; i++) {
    var patient = this.patients[i];
    if (patient.fork.signalCode === 'SIGSEGV') {
      deadPatient = patient;
      this.patients.splice(i, 1);
      break;
    }
  }
  return deadPatient;
};

module.exports = Dispatcher;
