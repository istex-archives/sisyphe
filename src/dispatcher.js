const debounce = require('lodash').debounce;
const Promise = require('bluebird');
const EventEmitter = require('events');
const Overseer = require('./overseer')
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
  this.tasks.on('failed', (job, err) => {
    this.emit('error', err);
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
  try {
    this.waitingQueue.push(overseer);
  } catch (err) {
    this.emit('error', err);
  }
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
      this.emit('stop', this.patients);
      return callback();
    }
    this.stop();
  }).catch(err => {
    this.emit('error', err);
  });
}, 500);

Dispatcher.start = function () {
  const self = this
  return new Promise(resolve => {
    this.startResolve = resolve
    this.patients.map(overseer => {
      overseer.on('message', msg => {
        if (msg.hasOwnProperty('type') && msg.type === 'job') {
          this.emit('result', msg);
          this.addToWaitingQueue(overseer);
          this.stop(resolve);
        }
      });
      overseer.on('exit', this.exitFunction.bind(this));
    });

    this.tasks.process(job => {
      return this.getPatient().then(overseer => {
        return overseer.send(job.data)
      })
    });
  });
};

Dispatcher.exitFunction = async function (code, signal) {
  if (signal === "SIGSEGV") {
    const deadFork = this.cleanDead()
    await this.recreateFork(deadFork)
    const err = {
      message: 'Processus terminé',
      stack: '\n Signal: ' + signal,
      infos: [deadFork.fork.currentFile.path]
    }
    deadFork.fork.currentFile.workerType = deadFork.workerType
    this.emit('error', { type: 'job', err, job: deadFork.fork.currentFile })
    this.stop(this.startResolve);
  }
}

Dispatcher.recreateFork = async function (deadFork) {
  const newOverseer = await Object.create(Overseer).init(deadFork.workerType, deadFork.options)
  newOverseer.on('exit', this.exitFunction.bind(this))
  this.addPatient(newOverseer)
}

Dispatcher.cleanDead = function (overseer) {
  let deadFork
  for (var i = 0; i < this.patients.length; i++) {
    var patient = this.patients[i];
    if (patient.fork.signalCode === 'SIGSEGV') {
      deadFork = patient
      this.patients.splice(i, 1)
      break;
    }
  }
  return deadFork
}


module.exports = Dispatcher;
