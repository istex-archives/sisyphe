const debounce = require('lodash').debounce;
const EventEmitter = require('events');

const Dispatcher = Object.create(new EventEmitter());

Dispatcher.init = function (task, options) {
  this.waitingQueue = [];
  this.tasks = task;
  this.options = options;
};

Dispatcher.addOverseer = function (overseer) {
  this.waitingQueue.push(overseer);
};
Dispatcher.getOverseer = function (done) {
  if (this.waitingQueue.length !== 0) return done(this.waitingQueue.shift());

  const checkOverseerIsAvailable = setInterval(() => {
    if (this.waitingQueue.length !== 0) {
      clearInterval(checkOverseerIsAvailable);
      done(this.waitingQueue.shift());
    }
  }, 10);
};

Dispatcher.stop = debounce(function (callback) {
  this.tasks.getJobCounts().then(jobCounts => {
    jobCounts.active + jobCounts.waiting === 0 ? callback() : this.stop();
  });
}, 500);

Dispatcher.start = function (end) {
  this.waitingQueue.map(overseer => {
    overseer.on('message', msg => {
      if (msg.hasOwnProperty('type') && msg.type === 'job') {
        this.emit('result', msg);
        this.addOverseer(overseer);
        this.stop(end);
      }
    });
  });

  this.tasks.process((job, done) => {
    this.getOverseer(overseer => {
      overseer.send(job.data);
      done();
    });
  });
};

module.exports = Dispatcher;
