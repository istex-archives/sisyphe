const debounce = require('lodash').debounce;

const Dispatcher = {};

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

Dispatcher.start = function (end) {
  const debouncedCount = debounce(() => {
    // TODO handle error with the Promise magic
    this.tasks.queue.inactiveCount((error, totalInactive) => {
      this.tasks.queue.activeCount((error, totalActive) => {
        (totalActive + totalInactive === 0) ? end() : debouncedCount();
      });
    });
  }, 500);

  this.waitingQueue.map((overseer) => {
    overseer.on('message', (msg) => {
      if (msg.isDone) {
        this.addOverseer(overseer);
        debouncedCount();
      }
    });
  });

  this.tasks.process((job, done) => {
    this.getOverseer((overseer) => {
      overseer.send(job.data);
      done();
    });
  });
};

module.exports = Dispatcher;
