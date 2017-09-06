const debounce = require('lodash').debounce;
const Promise = require('bluebird');
const EventEmitter = require('events');
const Overseer = require('./overseer');

/**
 * It manage a list of Overseer. In sisyphe there is one dispatcher for one module
 * @constructor
 */
const Dispatcher = Object.create(EventEmitter.prototype);

/**
 * Init all variable of Dispatcher
 * @param {Task} task Instance of the Task file to use
 * @param {options} options
 * @param {string} options.name Type of worker
 * @return {Dispatcher}
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
 * Add an overseer to the dispatcher and subscribe it in the queue
 * @param {Overseer} overseer
 * @return {Dispatcher}
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
 * Subscribe an overseer in the queue
 * @param {Overseer} overseer
 * @return {Dispatcher}
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
 * Remove an Overseer of the waitingQueue to send it when it's available
 * @return {Promise}
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


/**
 * Debounce function to stop the execution of the dispather. Stop is reach when
 * there is no jobs (active and waiting) in 500ms
 * @param  {callback} callback callback to resolve when there is no job in 500ms
 */
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



/**
 * Start the execution of the dispatcher. It process jobs until there is no task
 * @return {Promise}  empty Promise
 */
Dispatcher.start = function () {
  return new Promise(resolve => {
    this.startResolve = resolve;
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
        return overseer.send(job.data);
      });
    });
  });
};


/**
 * Function executed when a exit signal is catch from forks
 * @param  {number} code   The exit code if the child exited on its own.
 * @param  {string} signal The signal by which the child process was terminated.
 * @return {Promise}     Empty Promise
 */
Dispatcher.exitFunction = async function (code, signal) {
  if (signal === 'SIGSEGV') {
    const deadFork = this.cleanDead();
    await this.recreateFork(deadFork);
    const err = {
      message: 'Processus terminé',
      stack: '\n Signal: ' + signal,
      infos: [deadFork.fork.currentFile.path]
    };
    deadFork.fork.currentFile.workerType = deadFork.workerType;
    this.emit('error', { type: 'job', err, job: deadFork.fork.currentFile });
    this.stop(this.startResolve);
  }
};


/**
 * Recreate a fork when an other is dead
 * @param  {Overseer} deadFork the Overseer that has been killed
 */
Dispatcher.recreateFork = async function (deadFork) {
  const newOverseer = await Object.create(Overseer).init(deadFork.workerType, deadFork.options);
  newOverseer.on('exit', this.exitFunction.bind(this));
  this.addPatient(newOverseer);
};



/**
 * Search an deadFork in the list of fork and return it
 * @return {Overseer} A dead fork
 */
Dispatcher.cleanDead = function () {
  let deadFork;
  for (var i = 0; i < this.patients.length; i++) {
    var patient = this.patients[i];
    if (patient.fork.signalCode === 'SIGSEGV') {
      deadFork = patient;
      this.patients.splice(i, 1);
      break;
    }
  }
  return deadFork;
};

module.exports = Dispatcher;
