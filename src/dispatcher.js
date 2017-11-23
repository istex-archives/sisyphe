const debounce = require('lodash').debounce;
const Promise = require('bluebird');
const EventEmitter = require('events');
const Overseer = require('./overseer');
/**
 * Create Overseer, dispatch all task and manage life of Overseers
 * @constructor
 */
const Dispatcher = Object.create(EventEmitter.prototype);

/**
 * @param {Task} task Interface to talk with redis
 * @param {Object} options Options for dispatcher
 * @param {Object} options.name Type of the worker
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
 * Add a patient to the queue and the list of Overseers
 * @param {Overseer} overseer Overseer to add
 * @returns {Dispatcher}
 */
Dispatcher.addPatient = function (overseer) {
  const self = this;
  overseer.fork.overseer = overseer;
  overseer.on('message', function (msg) {
    if (msg.type === 'error') {
      const err = new Error(msg.message);
      [err.message, err.stack, err.code, err.infos] = [msg.message, msg.stack, msg.code, this.dataProcessing];
      self.emit('error', err);
      self.addToWaitingQueue(this.overseer);
      self.stillJobToDo();
    }
  });
  this.patients.push(overseer);
  this.waitingQueue.push(overseer);
  return this;
};

/**
 * Add an Overseer in th waiting queue
 * @param {Overseer} overseer Overseer to add in the waiting queue
 * @returns {Dispatcher}
 */
Dispatcher.addToWaitingQueue = function (overseer) {
  this.waitingQueue.push(overseer);
  return this;
};

/**
 * Return an overseer in the waiting queue
 * @returns {Promise}
 */
Dispatcher.getPatient = function () {
  return new Promise(resolve => {
    if (this.waitingQueue.length !== 0) return resolve(this.waitingQueue.shift());
    this.checkPatientIsAvailable = setInterval(() => {
      if (this.waitingQueue.length !== 0) {
        clearInterval(this.checkPatientIsAvailable);
        resolve(this.waitingQueue.shift());
      }
    }, 10);
  });
};

/**
 * Loop to stop the dispatcher if there is no active and waiting tasks every 500ms
 * @function
 * @fires Dispatcher#stop
 */
Dispatcher.stillJobToDo = debounce(function () {
  this.tasks
    .getJobCounts()
    .then(jobCounts => {
      const readyToStop = jobCounts.active + jobCounts.waiting === 0;
      readyToStop ? this.emit('stop') : this.stillJobToDo();
    })
    .catch(error => {
      this.emit('error', error);
    });
}, 500);

/**
 * Launch dispatcher
 * @return {Promise} resolve when dispatcher has finished all tasks
 */
Dispatcher.start = function () {
  return new Promise(resolve => {
    this.patients.map(overseer => {
      overseer.on('message', msg => {
        if (msg.hasOwnProperty('type') && msg.type === 'job') {
          this.emit('result', msg);
          this.addToWaitingQueue(overseer);
          this.stillJobToDo();
        }
      });
      overseer.on('exit', (code, signal) => {
        if (signal === 'SIGSEGV') {
          this.exit(signal).then(() => {
            this.stillJobToDo();
          });
        }
      });
    });
    this.on('stop', async () => {
      await this.final();
      this.patients.map(overseer => {
        delete overseer.fork._events.message;
        delete overseer.fork._events.exit;
        delete overseer.fork._events.result;
      });
      if (Array.isArray(this._events.stop)) {
        delete this._events.stop.pop();
      }
      this.tasks.pause();
      resolve();
    });
    if (!this.tasks.queue._initializingProcess) {
      this.tasks.process(job => {
        return this.getPatient().then(overseer => {
          return overseer.send(job.data);
        }).catch(err => { console.log(err); });
      });
    }
    this.tasks.resume();
  });
};

/**
 * Clean forks when finalJob is ending
 */
Dispatcher.killAllPatients = function () {
  this.patients.map(patient => {
    patient.fork.kill('SIGTERM');
  });
};

/**
 * Launch the final function of an alive Overseer
 */
Dispatcher.final = function () {
  return this.patients
    .filter(patient => patient.fork.signalCode !== 'SIGSEGV')
    .pop()
    .final();
};

/**
 * Extract a dead patient of the list of Overseer, and resurect an other
 * @param {String} signal Signal of the exit event
 */
Dispatcher.exit = function (signal) {
  const deadPatient = this.extractDeadPatient();
  return this.resurrectPatient(deadPatient).then(() => {
    const error = {
      message: 'Child process has been stopped',
      stack: `Signal: ${signal}`,
      infos: deadPatient.dataProcessing
    };
    this.emit('error', error);
  });
};

/**
 * Just exit the dispatcher
 */
Dispatcher.exitWithoutResurrect = function () {
  Dispatcher.stillJobToDo.cancel();
  this.removeAllListeners();
  this.tasks.exit();
};

/**
 * Recreate an Overseer when an Overseer is dead
 */
Dispatcher.resurrectPatient = async function (deadPatient) {
  const newOverseer = await Object.create(Overseer).init(deadPatient.workerType, deadPatient.options);
  newOverseer.on('exit', (code, signal) => {
    this.exit(signal).then(() => {
      this.stillJobToDo();
    });
  });
  this.addPatient(newOverseer);
};

/**
 * Remove a crashed Overseer in list of Overseers
 * @return {Overseer} A dead Overseer
 */
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
